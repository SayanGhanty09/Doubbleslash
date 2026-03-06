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

interface BLEContextType {
    status: BLEStatusType;
    device: BluetoothDevice | null;
    waveform: number[];
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
    const [biomarkers, setBiomarkers] = useState<Biomarkers | null>(null);
    const [logs, setLogs] = useState<string[]>(["[SYSTEM] BLE INITIALIZED"]);

    const cmdCharRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
    const serverRef = useRef<BluetoothRemoteGATTServer | null>(null);

    const addLog = useCallback((msg: string) => {
        setLogs(prev => [...prev.slice(-99), `[${new Date().toLocaleTimeString()}] ${msg}`]);
    }, []);

    // ========================================================
    // FFF2 — WAVEFORM (11-byte packed struct from firmware)
    // Struct: [Uint32 timestamp_ms | Uint16 raw_nir | Uint16 raw_f8 | Uint16 raw_fz | Uint8 sqi]
    // We extract raw_nir at offset 4 as the primary PPG signal for charting.
    // ========================================================
    const handleWaveform = useCallback((event: any) => {
        const dv: DataView = event.target.value;

        if (dv.byteLength === 11) {
            // Spec-compliant 11-byte waveform packet
            const nirSignal = dv.getUint16(4, true); // Primary PPG value
            setWaveform(prev => {
                const next = [...prev, nirSignal];
                return next.slice(-300);
            });
        } else if (dv.byteLength >= 2) {
            // Fallback: treat payload as raw Uint16 samples
            const samples: number[] = [];
            for (let i = 0; i < dv.byteLength - 1; i += 2) {
                samples.push(dv.getUint16(i, true));
            }
            if (samples.length > 0) {
                setWaveform(prev => [...prev, ...samples].slice(-300));
            }
        }
    }, []);

    // ========================================================
    // FFF3 — BIOMARKER RESULTS (21-byte packed struct)
    // Guide: [mode(1)|hb(2)|spo2(2)|bili(2)|pi(2)|sqi(1)|sdnn(2)|rmssd(2)|bp_sys(2)|bp_dia(2)|resp(2)|eof(1)]
    // EOF = 0xFE. Mode: 0x01=Normal, 0x03=Fast.
    // Firmware may prepend a header byte (e.g. 0xB0) before the mode.
    // ========================================================
    const handleBiomarkers = useCallback((event: any) => {
        const dv: DataView = event.target.value;
        const len = dv.byteLength;

        // Hex dump for diagnostics
        const hexBytes: string[] = [];
        for (let i = 0; i < len; i++) {
            hexBytes.push(dv.getUint8(i).toString(16).padStart(2, '0').toUpperCase());
        }
        addLog(`[BIO] RAW (${len}b): ${hexBytes.join(' ')}`);

        if (len < 2) {
            addLog(`[BIO] WARN: Packet too short`);
            return;
        }

        // --- Find the mode byte ---
        // The mode byte is 0x01 (Normal) or 0x03 (Fast).
        // The firmware may prepend header bytes (like 0xB0).
        // Strategy: scan the first few bytes for a valid mode.
        let offset = -1;
        let modeByte = 0;
        for (let i = 0; i < Math.min(len, 4); i++) {
            const b = dv.getUint8(i);
            if (b === 0x01 || b === 0x03) {
                offset = i;
                modeByte = b;
                break;
            }
        }

        // Verify EOF (last byte = 0xFE)
        const lastByte = dv.getUint8(len - 1);
        const hasEOF = lastByte === 0xFE;

        if (offset === -1) {
            addLog(`[BIO] WARN: No valid mode (0x01/0x03) found in first 4 bytes`);
            // Last resort fallback: try to parse from byte 0 as if there's no mode prefix
            if (hasEOF && len >= 12) {
                addLog(`[BIO] FALLBACK: EOF detected, attempting positional decode...`);
                const results: Biomarkers = {
                    mode: 'normal',
                    hb: dv.getUint16(1, true) / 100.0,
                    spo2: dv.getUint16(3, true) / 100.0,
                    bilirubin: dv.getUint16(5, true) / 100.0,
                    pi: dv.getUint16(7, true) / 1000.0,
                    sqi: dv.getUint8(9),
                    stress: "LOW"
                };
                addLog(`[BIO] FALLBACK: Hb=${results.hb} SpO2=${results.spo2}% Bili=${results.bilirubin}`);
                setBiomarkers(prev => ({ ...prev, ...results }));
            }
            return;
        }

        if (offset > 0) {
            addLog(`[BIO] HEADER: Skipped ${offset} byte(s) to mode 0x0${modeByte}`);
        }

        let results: Biomarkers = {};
        const dataLen = len - offset; // bytes available from mode byte onward

        if (modeByte === 0x01) {
            // ---- NORMAL MODE (40Hz) ----
            // Need 10 bytes: mode(1)+hb(2)+spo2(2)+bili(2)+pi(2)+sqi(1)
            if (dataLen >= 10) {
                results = {
                    mode: 'normal',
                    hb: dv.getUint16(offset + 1, true) / 100.0,
                    spo2: dv.getUint16(offset + 3, true) / 100.0,
                    bilirubin: dv.getUint16(offset + 5, true) / 100.0,
                    pi: dv.getUint16(offset + 7, true) / 1000.0,
                    sqi: dv.getUint8(offset + 9),
                    stress: "LOW"
                };
                addLog(`[BIO] NORMAL: Hb=${results.hb} | SpO2=${results.spo2}% | Bili=${results.bilirubin} | PI=${results.pi}% | SQI=${results.sqi}`);
            } else {
                addLog(`[BIO] WARN: Normal mode data too short (${dataLen} bytes)`);
            }

        } else if (modeByte === 0x03) {
            // ---- FAST MODE (200Hz) ----
            // Full: need 20 bytes from mode: mode(1)+zeros(9)+sdnn(2)+rmssd(2)+bp_sys(2)+bp_dia(2)+resp(2)
            if (dataLen >= 20) {
                const rmssdVal = dv.getUint16(offset + 12, true);
                results = {
                    mode: 'fast',
                    sdnn: dv.getUint16(offset + 10, true),
                    rmssd: rmssdVal,
                    bpSys: dv.getUint16(offset + 14, true),
                    bpDia: dv.getUint16(offset + 16, true),
                    respRate: dv.getUint16(offset + 18, true),
                    stress: rmssdVal > 50 ? "HIGH" : "NORMAL"
                };
                addLog(`[BIO] FAST: SDNN=${results.sdnn}ms | RMSSD=${results.rmssd}ms | BP=${results.bpSys}/${results.bpDia} | RR=${results.respRate}`);
            } else {
                addLog(`[BIO] WARN: Fast mode data too short (${dataLen} bytes)`);
            }
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
