import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Terminal,
    Send,
    Trash2,
    Upload,
    RefreshCw,
    AlertTriangle,
    Zap,
    Cpu
} from 'lucide-react';

const DeviceConsole: React.FC = () => {
    const [logs, setLogs] = useState<string[]>([
        "[SYSTEM] REBOOT SUCCESSFUL (v1.2.0)",
        "[BLE] SCANNING FOR PERIPHERALS...",
        "[BLE] CONNECTED TO ESP32-MEDICAL-V1",
        "[DATA] STREAM READY: GAIN=2, OFFSET=10",
    ]);
    const [input, setInput] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);

    const handleSend = () => {
        if (!input) return;
        setLogs(prev => [...prev, `> ${input}`, `[CMD] EXECUTING: ${input.toUpperCase()}...`, `[SYSTEM] OK`]);
        setInput("");
    };

    const handleUpdate = () => {
        setIsUpdating(true);
        setTimeout(() => {
            setIsUpdating(false);
            setLogs(prev => [...prev, "[OTA] FIRMWARE UPDATE SUCCESSFUL. REBOOTING..."]);
        }, 3000);
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="page-transition bg-mesh-animated"
            style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', borderRadius: '24px', padding: '12px' }}
        >
            <header style={{ marginBottom: '40px' }}>
                <h1 className="glowing-heading" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Device Console</h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Advanced hardware management and low-level debugging.</p>
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
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Current Version</span>
                                <span style={{ fontWeight: 600, fontFamily: 'Roboto Mono' }}>v1.2.0</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Build Date</span>
                                <span style={{ fontWeight: 500 }}>2024-05-15</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>UUID</span>
                                <span style={{ fontWeight: 500, fontFamily: 'Roboto Mono', fontSize: '0.75rem' }}>a1b2c3d4-e5f6-7890</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>NUS</span>
                                <span style={{ fontWeight: 500, fontFamily: 'Roboto Mono', fontSize: '0.75rem' }}>6E400001-B5A3-F393</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>MAC Address</span>
                                <span style={{ fontWeight: 500, fontFamily: 'Roboto Mono', fontSize: '0.75rem' }}>A4:CF:12:8E:3B:01</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>ESP32 Rev</span>
                                <span style={{ fontWeight: 500, fontFamily: 'Roboto Mono' }}>Rev 3.1</span>
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

                            {isUpdating && (
                                <div style={{ marginTop: '10px' }}>
                                    <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                                        <motion.div
                                            initial={{ x: '-100%' }}
                                            animate={{ x: '100%' }}
                                            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                                            style={{ width: '50%', height: '100%', background: 'var(--primary-color)' }}
                                        />
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>Uploading...</div>
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                                <button
                                    onClick={handleUpdate}
                                    disabled={isUpdating}
                                    className="glass btn-shimmer"
                                    style={{ width: '100%', padding: '12px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: 'var(--primary-color)' }}
                                >
                                    <Upload size={18} /> Upload Firmware (.bin)
                                </button>
                                <button style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
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
                            <button style={{ width: '100%', padding: '10px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer', fontWeight: 600 }}>
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
                            <button onClick={() => setLogs([])} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                            <div style={{ width: 1, height: 16, background: 'var(--border-color)' }}></div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Zap size={14} fill="var(--success-color)" /> ACTIVE
                            </span>
                        </div>
                    </div>

                    <div style={{ flex: 1, padding: '20px', fontFamily: 'Roboto Mono', fontSize: '0.85rem', color: 'var(--text-primary)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {logs.map((log, idx) => (
                            <div key={idx} style={{
                                color: log.startsWith('>') ? 'var(--primary-color)' :
                                    log.includes('[SYSTEM]') ? 'var(--success-color)' :
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
                            placeholder="Enter command (e.g. SET_GAIN=4, RESET)..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px 16px', color: 'white', fontFamily: 'Roboto Mono', outline: 'none' }}
                        />
                        <button
                            onClick={handleSend}
                            style={{ background: 'var(--primary-color)', border: 'none', borderRadius: '10px', width: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <Send size={20} color="black" />
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default DeviceConsole;
