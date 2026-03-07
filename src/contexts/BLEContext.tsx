/// <reference types="web-bluetooth" />
import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

// BLE Constants from Firmware
export const SERVICE_UUID = "0000fff0-0000-1000-8000-00805f9b34fb";
export const CHAR_CMD_UUID = "0000fff1-0000-1000-8000-00805f9b34fb";
export const CHAR_WAVE_UUID = "0000fff2-0000-1000-8000-00805f9b34fb";
export const CHAR_BIO_UUID = "0000fff3-0000-1000-8000-00805f9b34fb";
export const CHAR_STATUS_UUID = "0000fff4-0000-1000-8000-00805f9b34fb";

export const BLEStatus = {
    IDLE: 0,
    SCANNING_40HZ: 1,
    SCANNING_200HZ: 3,
    FINISHED: 2,
    DISCONNECTED: -1,
    CONNECTING: -2,
    CONNECTED: -3
} as const;

export type BLEStatusType = typeof BLEStatus[keyof typeof BLEStatus];

export interface Biomarkers {
    mode?: 'normal' | 'fast';
    spo2?: number;
    hb?: number;
    bilirubin?: number;
    hr?: number;
    rmssd?: number;
    sdnn?: number;
    stress?: string;
    pi?: number;
    sqi?: number;
    bpSys?: number;
    bpDia?: number;
    respRate?: number;
}

export interface WaveformSample {
    t: number;   // device timestamp_ms
    nir: number; // raw NIR ADC value
}

interface BLEContextType {
    status: BLEStatusType;
    device: BluetoothDevice | null;
    waveform: number[];
    waveformSamples: WaveformSample[];
    biomarkers: Biomarkers | null;
    logs: string[];
    connect: () => Promise<void>;
    disconnect: () => void;
    sendCommand: (cmd: number) => Promise<void>;
    clearLogs: () => void;
}

const BLEContext = createContext<BLEContextType | null>(null);

export const useBLE = () => {
    const context = useContext(BLEContext);
    if (!context) throw new Error("useBLE must be used within a BLEProvider");
    return context;
};

export const BLEProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [device, setDevice] = useState<BluetoothDevice | null>(null);
    const [status, setStatus] = useState<BLEStatusType>(BLEStatus.DISCONNECTED);
    const [waveform, setWaveform] = useState<number[]>([]);
    const [waveformSamples, setWaveformSamples] = useState<WaveformSample[]>([]);
    const [biomarkers, setBiomarkers] = useState<Biomarkers | null>(null);
    const [logs, setLogs] = useState<string[]>(["[SYSTEM] BLE INITIALIZED"]);

    const cmdCharRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
    const serverRef = useRef<BluetoothRemoteGATTServer | null>(null);

    const addLog = useCallback((msg: string) => {
        setLogs(prev => [...prev.slice(-99), `[${new Date().toLocaleTimeString()}] ${msg}`]);
    }, []);

    // ========================================================
    // FFF2 — WAVEFORM (13-byte packed struct from firmware)
    // Struct: [Uint32 timestamp_ms | Uint16 raw_nir | Uint16 raw_f8 | Uint16 raw_fz | Uint16 hr | Uint8 sqi]
    // We extract raw_nir at offset 4 as the primary PPG signal for charting.
    // ========================================================
    const handleWaveform = useCallback((event: any) => {
        const dv: DataView = event.target.value;

        if (dv.byteLength === 13) {
            const tMs = dv.getUint32(0, true);
            const nirSignal = dv.getUint16(4, true);
            setWaveform(prev => [...prev, nirSignal].slice(-300));
            setWaveformSamples(prev => [...prev, { t: tMs, nir: nirSignal }].slice(-600));
        } else {
            addLog(`[WAVE] WARN: Invalid Waveform packet length (${dv.byteLength}b)`);
        }
    }, [addLog]);

    // ========================================================
    // FFF3 — BIOMARKER RESULTS
    //
    // Current firmware (23 bytes, no header):
    //   [mode(1)|hb(2)|spo2(2)|bili(2)|pi(2)|sqi(1)|sdnn(2)|rmssd(2)|bp_sys(2)|bp_dia(2)|resp(2)|hr(2)|eof(1)]
    //
    // Legacy firmware (14 bytes, 0xB0 header prepended):
    //   [0xB0(1)|mode(1)|hb(2)|spo2(2)|bili(2)|pi(2)|sqi(1)|hr_bpm_x10(2)|eof(1)]
    //
    // EOF = 0xFE. Mode: 0x01=Normal, 0x03=Fast.
    // ========================================================
    const handleBiomarkers = useCallback((event: any) => {
        const dv: DataView = event.target.value;
        const len = dv.byteLength;

        // Detect legacy 14-byte format by checking for the 0xB0 magic header byte.
        const isLegacy = len === 14 && dv.getUint8(0) === 0xB0;

        if (len !== 23 && !isLegacy) {
            addLog(`[BIO] WARN: Invalid Biomarker packet length (${len}b)`);
            return;
        }

        // For legacy packets the struct starts 1 byte in (after the 0xB0 header).
        const offset = isLegacy ? 1 : 0;
        const modeByte = dv.getUint8(offset);

        // EOF marker check (byte 22 for current, byte 13 for legacy).
        const eofByte = isLegacy ? dv.getUint8(13) : dv.getUint8(22);
        if (eofByte !== 0xFE) {
            addLog(`[BIO] WARN: Invalid EOF marker (0x${eofByte.toString(16)})`);
            return;
        }

        let results: Biomarkers = {};

        if (modeByte === 0x01) {
            // ---- NORMAL MODE (40Hz) ----
            // Layout from offset: hb(+1), spo2(+3), bili(+5), pi(+7), sqi(+9), hr(+20)
            // Legacy has hr_bpm_x10 at (+10); current has integer BPM at (+20).
            const hrBpm = isLegacy
                ? dv.getUint16(offset + 10, true) / 10.0
                : dv.getUint16(offset + 20, true);
            results = {
                mode: 'normal',
                hb:        dv.getUint16(offset + 1, true) / 100.0,
                spo2:      dv.getUint16(offset + 3, true) / 100.0,
                bilirubin: dv.getUint16(offset + 5, true) / 100.0,
                pi:        dv.getUint16(offset + 7, true) / 1000.0,
                sqi:       dv.getUint8(offset + 9),
                ...(hrBpm > 0 && { hr: hrBpm }),
                stress: "LOW"
            };
            addLog(`[BIO] NORMAL: Hb=${results.hb} | SpO2=${results.spo2}% | Bili=${results.bilirubin} | PI=${results.pi}% | SQI=${results.sqi} | HR=${hrBpm}`);
        } else if (modeByte === 0x03) {
            // ---- FAST MODE (200Hz) — only in 21-byte current format ----
            if (isLegacy) {
                addLog(`[BIO] WARN: Fast mode packet not supported in legacy format`);
                return;
            }
            const rmssdVal = dv.getUint16(offset + 12, true);
            const hrFast   = dv.getUint16(offset + 20, true);
            results = {
                mode: 'fast',
                sdnn:     dv.getUint16(offset + 10, true),
                rmssd:    rmssdVal,
                bpSys:    dv.getUint16(offset + 14, true),
                bpDia:    dv.getUint16(offset + 16, true),
                respRate: dv.getUint16(offset + 18, true),
                ...(hrFast > 0 && { hr: hrFast }),
                stress:   rmssdVal > 50 ? "HIGH" : "NORMAL"
            };
            addLog(`[BIO] FAST: HR=${hrFast} | SDNN=${results.sdnn}ms | RMSSD=${results.rmssd}ms | BP=${results.bpSys}/${results.bpDia} | RR=${results.respRate}`);
        } else {
            addLog(`[BIO] WARN: Unknown Mode byte (0x${modeByte.toString(16)}) — possible header misparse`);
        }

        if (Object.keys(results).length > 0) {
            setBiomarkers(prev => ({ ...prev, ...results }));
        }
    }, [addLog]);

    // ========================================================
    // FFF4 — STATUS (1 byte: 0x00=Idle, 0x01=Running40, 0x03=Running200, 0x02=Finished)
    // ========================================================
    const handleStatus = useCallback((event: any) => {
        const s = event.target.value.getUint8(0);
        setStatus(s as BLEStatusType);
        addLog(`[ST] DEVICE STATUS: ${s}`);
    }, [addLog]);

    const connect = async () => {
        try {
            addLog("[BLE] REQUESTING DEVICE...");
            setStatus(BLEStatus.CONNECTING);

            const dev = await navigator.bluetooth.requestDevice({
                filters: [{ name: "AS7343-BIO" }],
                optionalServices: [SERVICE_UUID]
            });

            addLog(`[BLE] CONNECTING TO ${dev.name}...`);
            const server = await dev.gatt!.connect();
            serverRef.current = server;

            addLog("[BLE] DISCOVERING SERVICES...");
            const service = await server.getPrimaryService(SERVICE_UUID);

            addLog("[BLE] CONFIGURING CHARACTERISTICS...");
            cmdCharRef.current = await service.getCharacteristic(CHAR_CMD_UUID);

            const waveChar = await service.getCharacteristic(CHAR_WAVE_UUID);
            const bioChar = await service.getCharacteristic(CHAR_BIO_UUID);
            const statusChar = await service.getCharacteristic(CHAR_STATUS_UUID);

            await waveChar.startNotifications();
            waveChar.addEventListener('characteristicvaluechanged', handleWaveform);

            await bioChar.startNotifications();
            bioChar.addEventListener('characteristicvaluechanged', handleBiomarkers);

            await statusChar.startNotifications();
            statusChar.addEventListener('characteristicvaluechanged', handleStatus);

            dev.addEventListener('gattserverdisconnected', () => {
                addLog("[BLE] DEVICE DISCONNECTED");
                setStatus(BLEStatus.DISCONNECTED);
                setDevice(null);
            });

            setDevice(dev);
            setStatus(BLEStatus.CONNECTED);
            addLog("[BLE] SYSTEM ONLINE AND READY");

        } catch (error: any) {
            addLog(`[BLE] ERROR: ${error.message}`);
            setStatus(BLEStatus.DISCONNECTED);
            throw error;
        }
    };

    const disconnect = () => {
        if (serverRef.current?.connected) {
            serverRef.current.disconnect();
        }
    };

    const sendCommand = async (cmd: number) => {
        if (!cmdCharRef.current) {
            addLog("[BLE] ERROR: NOT CONNECTED");
            return;
        }
        try {
            const buffer = new Uint8Array([cmd]);
            await cmdCharRef.current.writeValue(buffer);
            addLog(`[CMD] SENT: 0x${cmd.toString(16).padStart(2, '0')}`);
        } catch (error: any) {
            addLog(`[CMD] ERROR: ${error.message}`);
        }
    };

    const clearLogs = () => setLogs([]);

    return (
        <BLEContext.Provider value={{
            status,
            device,
            waveform,
            waveformSamples,
            biomarkers,
            logs,
            connect,
            disconnect,
            sendCommand,
            clearLogs
        }}>
            {children}
        </BLEContext.Provider>
    );
};
