import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    Terminal,
    Send,
    Trash2,
    Upload,
    RefreshCw,
    AlertTriangle,
    Zap,
    Cpu,
    Bluetooth,
    BluetoothOff,
    Loader2
} from 'lucide-react';
import { useBLE, BLEStatus } from '../contexts/BLEContext';

const DeviceConsole: React.FC = () => {
    const { status, logs, connect, disconnect, sendCommand, clearLogs } = useBLE();
    const [input, setInput] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const isConnected = status === BLEStatus.CONNECTED ||
        status === BLEStatus.IDLE ||
        status === BLEStatus.SCANNING ||
        status === BLEStatus.SCANNING_BP;

    const isConnecting = status === BLEStatus.CONNECTING;

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    const handleSend = async () => {
        if (!input || !isConnected) return;

        // Basic mapping for demo/manual commands
        const cmdMap: Record<string, number> = {
            "START": 0x01,
            "START_NORMAL": 0x01,
            "START_BP": 0x02,
            "STOP": 0x00,
        };

        const cmd = cmdMap[input.toUpperCase()] || parseInt(input, 16);

        if (!isNaN(cmd)) {
            await sendCommand(cmd);
            setInput("");
        }
    };

    const handleUpdate = () => {
        setIsUpdating(true);
        setTimeout(() => {
            setIsUpdating(false);
        }, 3000);
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="page-transition bg-mesh-animated"
            style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', borderRadius: '24px', padding: '12px' }}
        >
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
                <div>
                    <h1 className="glowing-heading" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Device Console</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Advanced hardware management and low-level debugging.</p>
                </div>

                <button
                    onClick={isConnected ? disconnect : connect}
                    disabled={isConnecting}
                    className="glass"
                    style={{
                        padding: '12px 24px',
                        borderRadius: '12px',
                        background: isConnected ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0, 210, 255, 0.1)',
                        color: isConnected ? '#ef4444' : 'var(--primary-color)',
                        border: `1px solid ${isConnected ? 'rgba(239, 68, 68, 0.2)' : 'var(--border-color)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontWeight: 700,
                        cursor: 'pointer'
                    }}
                >
                    {isConnecting ? (
                        <Loader2 className="animate-spin" size={20} />
                    ) : isConnected ? (
                        <BluetoothOff size={20} />
                    ) : (
                        <Bluetooth size={20} />
                    )}
                    {isConnecting ? 'CONNECTING...' : isConnected ? 'DISCONNECT' : 'CONNECT DEVICE'}
                </button>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '24px', flex: 1 }}>
                {/* Left Column: Firmware Management */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="glass hover-lift-glow" style={{ padding: '24px', borderRadius: '24px' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem', marginBottom: '20px' }}>
                            <Cpu size={20} color="var(--primary-color)" /> Firmware Management
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Status</span>
                                <span style={{
                                    fontWeight: 600,
                                    color: isConnected ? 'var(--success-color)' : 'var(--error-color)',
                                    textTransform: 'uppercase',
                                    fontSize: '0.85rem'
                                }}>
                                    {isConnected ? 'ONLINE' : 'OFFLINE'}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Current Version</span>
                                <span style={{ fontWeight: 600, fontFamily: 'Roboto Mono' }}>v1.2.0</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Build Date</span>
                                <span style={{ fontWeight: 500 }}>2024-05-15</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Model No</span>
                                <span style={{ fontWeight: 500, fontFamily: 'Roboto Mono' }}>ESP32-S3-WROOM-1</span>
                            </div>

                            <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(0, 210, 255, 0.05)', border: '1px solid var(--border-color)' }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <RefreshCw size={14} /> Update Status
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--success-color)' }}>System is up to date</div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                                <button
                                    onClick={handleUpdate}
                                    disabled={isUpdating || !isConnected}
                                    className="glass btn-shimmer"
                                    style={{ width: '100%', padding: '12px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: 'var(--primary-color)', opacity: !isConnected ? 0.5 : 1 }}
                                >
                                    <Upload size={18} /> Upload Firmware (.bin)
                                </button>
                                <button disabled={!isConnected} style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, opacity: !isConnected ? 0.5 : 1 }}>
                                    Check for Updates
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="glass hover-lift-glow" style={{ padding: '24px', borderRadius: '24px' }}>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', color: 'var(--warning-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <AlertTriangle size={20} /> Advanced Tools
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <button disabled={!isConnected} style={{ width: '100%', padding: '10px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer', fontWeight: 600, opacity: !isConnected ? 0.5 : 1 }}>
                                Factory Reset Device
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Serial Terminal */}
                <div className="glass border-spin-premium hover-lift-glow" style={{ borderRadius: '24px', border: '1px solid rgba(0, 210, 255, 0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: '500px' }}>
                    <div style={{ padding: '16px 24px', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Terminal size={18} color="var(--primary-color)" />
                            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>SERIAL TERMINAL LOGS</span>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={clearLogs} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                            <div style={{ width: 1, height: 16, background: 'var(--border-color)' }}></div>
                            <span style={{ fontSize: '0.75rem', color: isConnected ? 'var(--success-color)' : 'var(--error-color)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Zap size={14} fill={isConnected ? "var(--success-color)" : "transparent"} /> {isConnected ? 'ACTIVE' : 'IDLE'}
                            </span>
                        </div>
                    </div>

                    <div
                        ref={scrollRef}
                        className="scroll-hide"
                        style={{ flex: 1, padding: '20px', fontFamily: 'Roboto Mono', fontSize: '0.85rem', color: 'var(--text-primary)', overflowY: 'auto', maxHeight: '450px', display: 'flex', flexDirection: 'column', gap: '4px' }}
                    >
                        {logs.map((log, idx) => (
                            <div key={idx} style={{
                                color: log.startsWith('>') ? 'var(--primary-color)' :
                                    log.includes('[ERROR]') ? 'var(--error-color)' :
                                        log.includes('[SUCCESS]') ? 'var(--success-color)' :
                                            log.includes('[BLE]') ? '#4f46e5' : 'inherit'
                            }}>
                                <span style={{ opacity: 0.3, marginRight: '8px' }}>[{idx.toString().padStart(3, '0')}]</span>
                                {log}
                            </div>
                        ))}
                    </div>

                    <div style={{ padding: '20px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '12px' }}>
                        <input
                            type="text"
                            placeholder={isConnected ? "Enter command (e.g. START, START_BP, STOP)..." : "Connect device to send commands..."}
                            value={input}
                            disabled={!isConnected}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px 16px', color: 'white', fontFamily: 'Roboto Mono', outline: 'none', opacity: !isConnected ? 0.5 : 1 }}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!isConnected}
                            style={{ background: 'var(--primary-color)', border: 'none', borderRadius: '10px', width: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: !isConnected ? 0.5 : 1 }}>
                            <Send size={20} color="black" />
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default DeviceConsole;
