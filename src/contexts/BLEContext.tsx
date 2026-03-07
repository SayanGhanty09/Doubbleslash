/// <reference types="web-bluetooth" />
import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

// ========================================================================
// BLE UUIDs — must match firmware BLEManager.h
// ========================================================================
export const SERVICE_UUID       = "0000fff0-0000-1000-8000-00805f9b34fb";
export const STATUS_CHAR_UUID   = "0000fff1-0000-1000-8000-00805f9b34fb"; // Read+Indicate (1 byte)
export const CONTROL_CHAR_UUID  = "0000fff2-0000-1000-8000-00805f9b34fb"; // Write         (1 byte)
export const LIVEDATA_CHAR_UUID = "0000fff3-0000-1000-8000-00805f9b34fb"; // Notify        (32 bytes)

// ========================================================================
// Status enum — mirrors firmware DeviceState
// ========================================================================
export const BLEStatus = {
    DISCONNECTED: -1,
    CONNECTING:   -2,
    CONNECTED:    -3,
    IDLE:          0,
    SCANNING:      1,   // normal biomarker mode
    SCANNING_BP:   2,   // BP mode (200 Hz)
} as const;

export type BLEStatusType = (typeof BLEStatus)[keyof typeof BLEStatus];

// ========================================================================
// Data types
// ========================================================================
export interface Biomarkers {
    pi?:        number;
    sqi?:       number;
    spo2?:      number;
    hr?:        number;
    sdnn?:      number;
    rmssd?:     number;
    hb?:        number;
    bilirubin?: number;
    bpSys?:     number;
    bpDia?:     number;
    pulseRate?: number;
    respRate?:  number;
}

export type ScanPhase = 'idle' | 'normal' | 'bp' | 'done';

interface BLEContextType {
    status:        BLEStatusType;
    device:        BluetoothDevice | null;
    biomarkers:    Biomarkers;
    bestNormal:    Biomarkers;
    bestBP:        Biomarkers;
    scanPhase:     ScanPhase;
    scanSeconds:   number;
    logs:          string[];
    connect:       () => Promise<void>;
    disconnect:    () => void;
    sendCommand:   (cmd: number) => Promise<void>;
    startFullScan: () => void;
    clearLogs:     () => void;
}

const BLEContext = createContext<BLEContextType | null>(null);

export const useBLE = () => {
    const ctx = useContext(BLEContext);
    if (!ctx) throw new Error("useBLE must be used within a BLEProvider");
    return ctx;
};

// ========================================================================
// Provider
// ========================================================================
export const BLEProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [device, setDevice]           = useState<BluetoothDevice | null>(null);
    const [status, setStatus]           = useState<BLEStatusType>(BLEStatus.DISCONNECTED);
    const [biomarkers, setBiomarkers]   = useState<Biomarkers>({});
    const [bestNormal, setBestNormal]   = useState<Biomarkers>({});
    const [bestBP, setBestBP]           = useState<Biomarkers>({});
    const [scanPhase, setScanPhase]     = useState<ScanPhase>('idle');
    const [scanSeconds, setScanSeconds] = useState(0);
    const [logs, setLogs]               = useState<string[]>(["[SYSTEM] BLE initialized"]);

    const controlCharRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
    const serverRef      = useRef<BluetoothRemoteGATTServer | null>(null);
    const phaseRef       = useRef<ScanPhase>('idle');
    const bestNormalRef  = useRef<Biomarkers>({});
    const bestBPRef      = useRef<Biomarkers>({});
    const scanTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

    // Accumulate all valid readings for weighted averaging
    const normalSamplesRef = useRef<Biomarkers[]>([]);
    const bpSamplesRef     = useRef<Biomarkers[]>([]);

    /** Compute SQI-weighted average of accumulated normal samples */
    const computeWeightedNormal = (): Biomarkers => {
        const samples = normalSamplesRef.current;
        if (samples.length === 0) return {};
        const keys: (keyof Biomarkers)[] = ['pi', 'sqi', 'spo2', 'hr', 'sdnn', 'rmssd', 'hb', 'bilirubin'];
        let totalWeight = 0;
        const sums: Record<string, number> = {};
        for (const s of samples) {
            const w = Math.max(s.sqi ?? 1, 1); // SQI as weight, min 1
            totalWeight += w;
            for (const k of keys) {
                if (s[k] !== undefined && !isNaN(s[k]!)) {
                    sums[k] = (sums[k] ?? 0) + s[k]! * w;
                }
            }
        }
        const result: Biomarkers = {};
        for (const k of keys) {
            if (sums[k] !== undefined) (result as any)[k] = sums[k] / totalWeight;
        }
        return result;
    };

    /** Compute simple average of accumulated BP samples */
    const computeAverageBP = (): Biomarkers => {
        const samples = bpSamplesRef.current;
        if (samples.length === 0) return {};
        const keys: (keyof Biomarkers)[] = ['bpSys', 'bpDia', 'pulseRate', 'respRate'];
        const sums: Record<string, { total: number; count: number }> = {};
        for (const s of samples) {
            for (const k of keys) {
                if (s[k] !== undefined && !isNaN(s[k]!)) {
                    if (!sums[k]) sums[k] = { total: 0, count: 0 };
                    sums[k].total += s[k]!;
                    sums[k].count++;
                }
            }
        }
        const result: Biomarkers = {};
        for (const k of keys) {
            if (sums[k]) (result as any)[k] = sums[k].total / sums[k].count;
        }
        return result;
    };

    const addLog = useCallback((msg: string) => {
        setLogs(prev => [...prev.slice(-199), `[${new Date().toLocaleTimeString()}] ${msg}`]);
    }, []);

    // ----------------------------------------------------------------
    // FFF3 — Live Data (32 bytes = 8 × float32 LE)
    // Normal: [pi, sqi, spo2, hr, sdnn, rmssd, hb, bili]
    // BP:     [sbp, dbp, pulse_rate, resp_rate, 0, 0, 0, 0]
    // ----------------------------------------------------------------
    const handleLiveData = useCallback((event: Event) => {
        const target = event.target as BluetoothRemoteGATTCharacteristic;
        const dv: DataView = target.value!;
        if (dv.byteLength !== 32) {
            addLog(`[DATA] Invalid packet (${dv.byteLength}b, expected 32)`);
            return;
        }

        const phase = phaseRef.current;

        if (phase === 'normal') {
            const pi    = dv.getFloat32(0,  true);
            const sqi   = dv.getFloat32(4,  true);
            const spo2  = dv.getFloat32(8,  true);
            const hr    = dv.getFloat32(12, true);
            const sdnn  = dv.getFloat32(16, true);
            const rmssd = dv.getFloat32(20, true);
            const hb    = dv.getFloat32(24, true);
            const bili  = dv.getFloat32(28, true);

            const pkt: Biomarkers = { pi, sqi, spo2, hr, sdnn, rmssd, hb, bilirubin: bili };
            setBiomarkers(pkt);

            // Accumulate valid readings and update weighted average
            if (hr > 30 && hr < 250) {
                normalSamplesRef.current.push(pkt);
                const avg = computeWeightedNormal();
                bestNormalRef.current = avg;
                setBestNormal(avg);
            }

            addLog(`[NORMAL] PI=${pi.toFixed(2)} SQI=${sqi.toFixed(2)} SpO2=${spo2.toFixed(1)} HR=${hr.toFixed(0)}`);

        } else if (phase === 'bp') {
            const sbp = dv.getFloat32(0,  true);
            const dbp = dv.getFloat32(4,  true);
            const pr  = dv.getFloat32(8,  true);
            const rr  = dv.getFloat32(12, true);

            // NaN means device has no calibration yet — omit those fields
            const pkt: Biomarkers = {
                bpSys:     isNaN(sbp) ? undefined : sbp,
                bpDia:     isNaN(dbp) ? undefined : dbp,
                pulseRate: pr,
                respRate:  (rr > 0 && rr <= 35) ? rr : undefined,
            };
            // Merge into existing biomarkers so normal readings (HR, SpO2, SDNN…) stay visible
            setBiomarkers(prev => ({ ...prev, ...Object.fromEntries(Object.entries(pkt).filter(([, v]) => v !== undefined)) }));

            // Accumulate valid BP readings and update running average
            if (pr > 30 && pr < 250) {
                bpSamplesRef.current.push(pkt);
                const avg = computeAverageBP();
                bestBPRef.current = avg;
                setBestBP(avg);
            }

            const sbpStr = isNaN(sbp) ? 'uncal' : sbp.toFixed(1);
            const dbpStr = isNaN(dbp) ? 'uncal' : dbp.toFixed(1);
            const rrStr  = (rr > 0 && rr <= 35) ? rr.toFixed(1) : 'wait';
            addLog(`[BP] SBP=${sbpStr} DBP=${dbpStr} PR=${pr.toFixed(0)} RR=${rrStr}`);
        }
    }, [addLog]);

    // ----------------------------------------------------------------
    // FFF1 — Status Indicate (1 byte)
    // ----------------------------------------------------------------
    const handleStatus = useCallback((event: Event) => {
        const target = event.target as BluetoothRemoteGATTCharacteristic;
        const s = target.value!.getUint8(0);
        if (s === 0x00) setStatus(BLEStatus.IDLE);
        else if (s === 0x01) setStatus(BLEStatus.SCANNING);
        else if (s === 0x02) setStatus(BLEStatus.SCANNING_BP);
        addLog(`[STATUS] Device → 0x${s.toString(16).padStart(2, '0')}`);
    }, [addLog]);

    // ----------------------------------------------------------------
    // Connect
    // ----------------------------------------------------------------
    const connect = async () => {
        try {
            addLog("[BLE] Requesting device...");
            setStatus(BLEStatus.CONNECTING);

            const dev = await navigator.bluetooth.requestDevice({
                filters: [{ name: "Spectru" }],
                optionalServices: [SERVICE_UUID]
            });

            addLog(`[BLE] Connecting to ${dev.name}...`);
            const server = await dev.gatt!.connect();
            serverRef.current = server;

            const service = await server.getPrimaryService(SERVICE_UUID);

            controlCharRef.current = await service.getCharacteristic(CONTROL_CHAR_UUID);

            const liveChar = await service.getCharacteristic(LIVEDATA_CHAR_UUID);
            await liveChar.startNotifications();
            liveChar.addEventListener('characteristicvaluechanged', handleLiveData);

            const statusChar = await service.getCharacteristic(STATUS_CHAR_UUID);
            await statusChar.startNotifications();
            statusChar.addEventListener('characteristicvaluechanged', handleStatus);

            dev.addEventListener('gattserverdisconnected', () => {
                addLog("[BLE] Device disconnected");
                setStatus(BLEStatus.DISCONNECTED);
                setDevice(null);
                cleanupScan();
            });

            setDevice(dev);
            setStatus(BLEStatus.CONNECTED);
            addLog("[BLE] Ready");
        } catch (error: any) {
            addLog(`[BLE] Error: ${error.message}`);
            setStatus(BLEStatus.DISCONNECTED);
        }
    };

    const disconnect = () => {
        cleanupScan();
        serverRef.current?.connected && serverRef.current.disconnect();
    };

    // ----------------------------------------------------------------
    // Send raw command to FFF2
    // ----------------------------------------------------------------
    const sendCommand = async (cmd: number) => {
        if (!controlCharRef.current) { addLog("[CMD] Not connected"); return; }
        try {
            await controlCharRef.current.writeValue(new Uint8Array([cmd]));
            addLog(`[CMD] Sent 0x${cmd.toString(16).padStart(2, '0')}`);
        } catch (error: any) {
            addLog(`[CMD] Error: ${error.message}`);
        }
    };

    // ----------------------------------------------------------------
    // Cleanup
    // ----------------------------------------------------------------
    const cleanupScan = () => {
        if (scanTimerRef.current) { clearInterval(scanTimerRef.current); scanTimerRef.current = null; }
        phaseRef.current = 'idle';
        setScanPhase('idle');
        setScanSeconds(0);
    };

    // ----------------------------------------------------------------
    // Full Scan: 20 s normal → stop → 20 s BP → stop → done
    // ----------------------------------------------------------------
    const startFullScan = () => {
        if (!controlCharRef.current) { addLog("[SCAN] Not connected"); return; }

        bestNormalRef.current = {};
        bestBPRef.current = {};
        normalSamplesRef.current = [];
        bpSamplesRef.current = [];
        setBestNormal({});
        setBestBP({});
        setBiomarkers({});

        let elapsed = 0;
        const NORMAL_DUR = 30;
        const BP_DUR = 30;

        phaseRef.current = 'normal';
        setScanPhase('normal');
        setScanSeconds(NORMAL_DUR);
        sendCommand(0x01);
        addLog("[SCAN] Phase 1/2: Normal mode (30 s)");

        scanTimerRef.current = setInterval(async () => {
            elapsed++;

            if (elapsed <= NORMAL_DUR) {
                setScanSeconds(NORMAL_DUR - elapsed);
            } else if (elapsed === NORMAL_DUR + 1) {
                await sendCommand(0x00);
                addLog("[SCAN] Normal complete. Starting BP...");
                setTimeout(async () => {
                    phaseRef.current = 'bp';
                    setScanPhase('bp');
                    setScanSeconds(BP_DUR);
                    await sendCommand(0x02);
                    addLog("[SCAN] Phase 2/2: BP mode (30 s)");
                }, 500);
            } else if (elapsed <= NORMAL_DUR + 1 + BP_DUR) {
                setScanSeconds(NORMAL_DUR + 1 + BP_DUR - elapsed);
            } else {
                await sendCommand(0x00);
                addLog("[SCAN] Complete!");
                phaseRef.current = 'idle';
                setScanPhase('done');
                setScanSeconds(0);
                if (scanTimerRef.current) { clearInterval(scanTimerRef.current); scanTimerRef.current = null; }
            }
        }, 1000);
    };

    const clearLogs = () => setLogs([]);

    return (
        <BLEContext.Provider value={{
            status, device, biomarkers, bestNormal, bestBP,
            scanPhase, scanSeconds, logs,
            connect, disconnect, sendCommand, startFullScan, clearLogs
        }}>
            {children}
        </BLEContext.Provider>
    );
};
