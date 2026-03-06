import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Heart,
    Wind,
    Activity,
    Droplets,
    Square,
    AlertCircle,
    Brain
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, YAxis, XAxis, CartesianGrid } from 'recharts';
import { usePatient } from '../components/layout/Shell';
import VitalsScalePanel from '../components/dashboard/VitalsScalePanel';

const LiveRecording: React.FC = () => {
    const { activePatient } = usePatient();
    const [isRecording, setIsRecording] = useState(true);
    const [seconds, setSeconds] = useState(0);
    const [vitals, setVitals] = useState({
        hr: 72,
        spo2: 98,
        rr: 16,
        bp: { sys: 120, dia: 80 },
        bilirubin: 0.8
    });

    // Simulated Waveform Data
    const [data, setData] = useState(() => {
        return Array.from({ length: 40 }, (_, i) => ({
            time: i,
            val: 50 + Math.sin(i * 0.5) * 20 + Math.random() * 5
        }));
    });

    useEffect(() => {
        if (!isRecording) return;

        const interval = setInterval(() => {
            setSeconds(s => s + 1);

            // Update Vitals slightly
            setVitals(v => ({
                ...v,
                hr: Math.max(60, Math.min(100, v.hr + (Math.random() - 0.5) * 2)),
                spo2: Math.max(95, Math.min(100, v.spo2 + (Math.random() - 0.5) * 0.5)),
                rr: Math.max(12, Math.min(20, v.rr + (Math.random() - 0.5) * 1)),
            }));

            // Update Waveform
            setData(prev => {
                const next = [...prev.slice(1)];
                const lastIdx = prev[prev.length - 1].time;
                next.push({
                    time: lastIdx + 1,
                    val: 50 + Math.sin((lastIdx + 1) * 0.5) * 20 + Math.random() * 5
                });
                return next;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isRecording]);

    const formatTime = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const vitalCards = [
        { label: 'Heart Rate', value: vitals.hr.toFixed(0), unit: 'bpm', icon: Heart, color: '#ef4444', glow: 'rgba(239, 68, 68, 0.3)' },
        { label: 'SpO2', value: vitals.spo2.toFixed(1), unit: '%', icon: Droplets, color: '#00d2ff', glow: 'rgba(0, 210, 255, 0.3)' },
        { label: 'Resp. Rate', value: vitals.rr.toFixed(0), unit: 'rpm', icon: Wind, color: '#10b981', glow: 'rgba(16, 185, 129, 0.3)' },
        { label: 'Blood Pressure', value: `${vitals.bp.sys}/${vitals.bp.dia}`, unit: 'mmHg', icon: Activity, color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.3)' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="page-transition bg-mesh-animated"
            style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', borderRadius: '24px', padding: '12px' }}
        >
            <header style={{ marginBottom: '40px' }}>
                <h1 className="glowing-heading" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Live Monitoring</h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="status-dot"></span> Real-time telemetry and clinical observation.
                </p>
            </header>

            {/* Session Header */}
            <div className="glass" style={{ padding: '20px 24px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Patient Name</div>
                        <div style={{ fontWeight: 600, fontSize: '1.25rem' }}>{activePatient || "No Active Patient"}</div>
                    </div>
                    <div style={{ width: 1, height: 40, background: 'var(--border-color)' }}></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            background: isRecording ? '#ef4444' : 'var(--text-tertiary)',
                            animation: isRecording ? 'pulse 1.5s infinite' : 'none'
                        }}></div>
                        <div style={{ fontFamily: 'Roboto Mono', fontSize: '1.5rem', fontWeight: 500 }}>{formatTime(seconds)}</div>
                    </div>
                </div>

                <button
                    onClick={() => setIsRecording(!isRecording)}
                    className={!isRecording ? 'btn-shimmer' : ''}
                    style={{
                        padding: '12px 24px',
                        borderRadius: '12px',
                        background: isRecording ? 'rgba(239, 68, 68, 0.1)' : 'var(--primary-color)',
                        color: isRecording ? '#ef4444' : 'black',
                        border: `1px solid ${isRecording ? '#ef4444' : 'transparent'}`,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        transition: '0.2s'
                    }}
                >
                    {isRecording ? <><Square size={18} fill="#ef4444" /> STOP RECORDING</> : <><Activity size={18} /> START RECORDING</>}
                </button>
            </div>

            {/* Main Monitoring Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                {vitalCards.map((card, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * idx, type: 'spring', stiffness: 100 }}
                        whileHover={{ scale: 1.03, y: -5 }}
                        className="glass vital-card-edge-glow hover-lift-glow"
                        style={{
                            padding: '24px',
                            borderRadius: '20px',
                            '--card-color': card.color,
                            boxShadow: `0 8px 32px rgba(0,0,0,0.2)`,
                            cursor: 'default'
                        } as React.CSSProperties}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{card.label}</span>
                            <card.icon color={card.color} size={20} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                            <span style={{ fontSize: '2.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{card.value}</span>
                            <span style={{ fontSize: '1rem', color: 'var(--text-tertiary)' }}>{card.unit}</span>
                        </div>
                    </motion.div>
                ))}
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 80 }}
                style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', flex: 1 }}
            >
                {/* Replaced ECG with new Vitals Panel */}
                <VitalsScalePanel />

                {/* Secondary Metrics container */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="glass" style={{ padding: '24px', borderRadius: '24px', background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.1) 0%, rgba(0, 210, 255, 0.05) 100%)' }}>
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-tertiary)', marginBottom: '16px' }}>
                            <Brain size={18} color="var(--primary-color)" />
                            AI PREDICTION
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ color: 'var(--success-color)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Activity size={20} /> NORMAL SINUS RHYTHM
                                </div>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Analysis suggests stable rhythm patterns with no acute irregularities detected in the last 2 minutes of recording.
                            </p>
                        </div>
                    </div>

                    <div className="glass" style={{ padding: '24px', borderRadius: '24px', flex: 1 }}>
                        <h4 style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)', marginBottom: '20px' }}>SECONDARY LOGS</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Bilirubin Index</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>0.8 <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>mg/dL</span></div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Stress Detection</div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--success-color)' }}>LOW</div>
                            </div>
                        </div>

                        <div style={{ marginTop: 'auto', padding: '16px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', gap: '12px' }}>
                            <AlertCircle color="#ef4444" size={20} />
                            <div style={{ fontSize: '0.8rem', color: '#ef4444' }}>
                                Stable recording. No alerts active.
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            <style>{`
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
        </motion.div >
    );
};

export default LiveRecording;
