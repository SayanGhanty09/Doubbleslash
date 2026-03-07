import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    Heart,
    Wind,
    Activity as ActivityIcon,
    Droplets,
    FlaskConical,
    Square,
    AlertCircle,
    Brain,
    Loader2
} from 'lucide-react';
import { usePatient } from '../components/layout/Shell';
import VitalsScalePanel from '../components/dashboard/VitalsScalePanel';
import { useBLE, BLEStatus } from '../contexts/BLEContext';

const LiveRecording: React.FC = () => {
    const { activePatient } = usePatient();
    const { status, waveformSamples, biomarkers, sendCommand } = useBLE();
    const [seconds, setSeconds] = useState(0);

    const isConnected = status !== BLEStatus.DISCONNECTED && status !== BLEStatus.CONNECTING;
    const isRecording = status === BLEStatus.SCANNING_40HZ || status === BLEStatus.SCANNING_200HZ;
    const isFinished = status === BLEStatus.FINISHED;

    // Use a ref so the interval callback always sees the latest status without
    // needing to be in the dependency array (avoids restarting the interval on
    // every status tick).
    const statusRef = useRef(status);
    useEffect(() => { statusRef.current = status; });

    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | undefined;
        if (isRecording) {
            interval = setInterval(() => {
                setSeconds(prev => {
                    const next = prev + 1;
                    // Auto-stop at 30 s for 40 Hz scan if the device status
                    // notification has not already arrived.
                    if (next >= 30 && statusRef.current === BLEStatus.SCANNING_40HZ) {
                        clearInterval(interval);
                        sendCommand(0x02);
                        return 30;
                    }
                    return next;
                });
            }, 1000);
        } else if (!isFinished) {
            setSeconds(0);
        }
        return () => clearInterval(interval);
    }, [isRecording, isFinished, sendCommand]);

    const formatTime = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleToggleRecording = async () => {
        if (isRecording) {
            await sendCommand(0x02); // Stop
        } else {
            await sendCommand(0x01); // Start 40Hz
        }
    };

    const vitalCards = useMemo(() => {
        const baseCards = [
            { label: 'Heart Rate', value: biomarkers?.hr ? biomarkers.hr.toFixed(0) : '--', unit: 'bpm', icon: Heart, color: '#ef4444' },
            { label: 'SpO2', value: biomarkers?.spo2 ? biomarkers.spo2.toFixed(1) : '--', unit: '%', icon: Droplets, color: '#00d2ff' },
        ];

        if (status === BLEStatus.SCANNING_200HZ || biomarkers?.bpSys) {
            return [
                ...baseCards,
                { label: 'Blood Pressure', value: biomarkers?.bpSys ? `${biomarkers.bpSys}/${biomarkers.bpDia}` : '--', unit: 'mmHg', icon: ActivityIcon, color: '#f59e0b' },
                { label: 'Resp. Rate', value: biomarkers?.respRate || '--', unit: 'bpm', icon: Wind, color: '#10b981' },
            ];
        }

        return [
            ...baseCards,
            { label: 'Hemoglobin', value: biomarkers?.hb ? biomarkers.hb.toFixed(1) : '--', unit: 'g/dL', icon: FlaskConical, color: '#a855f7' },
            { label: 'Bilirubin', value: biomarkers?.bilirubin ? biomarkers.bilirubin.toFixed(2) : '--', unit: 'mg/dL', icon: ActivityIcon, color: '#f59e0b' },
            { label: 'Stress Index', value: biomarkers?.stress || '--', unit: '', icon: Brain, color: '#10b981' },
        ];
    }, [biomarkers, status]);

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
                    <span className={`status-dot ${isConnected ? 'active' : ''}`}></span>
                    {isConnected ? 'Device connected. Ready for recording.' : 'Device disconnected. Please connect in Console.'}
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

                <div style={{ display: 'flex', gap: '12px' }}>
                    {isFinished && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 20px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)', fontWeight: 600 }}>
                            <ActivityIcon size={18} /> SCAN COMPLETE
                        </div>
                    )}
                    <button
                        onClick={handleToggleRecording}
                        disabled={!isConnected}
                        className={!isRecording && isConnected ? 'btn-shimmer' : ''}
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
                            cursor: isConnected ? 'pointer' : 'not-allowed',
                            transition: '0.2s',
                            opacity: isConnected ? 1 : 0.5
                        }}
                    >
                        {isRecording ? <><Square size={18} fill="#ef4444" /> STOP RECORDING</> : <><ActivityIcon size={18} /> START 40HZ SCAN</>}
                    </button>
                    {!isRecording && isConnected && (
                        <button
                            onClick={() => sendCommand(0x03)}
                            className="glass"
                            style={{
                                padding: '12px 24px',
                                borderRadius: '12px',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'white',
                                border: '1px solid var(--border-color)',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            START 200HZ HRV
                        </button>
                    )}
                </div>
            </div>

            {/* Main Monitoring Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '20px' }}>
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
                {/* Real-time Waveform Panel */}
                <div className="glass" style={{ padding: '24px', borderRadius: '24px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-tertiary)' }}>
                            <ActivityIcon size={18} color="var(--primary-color)" /> LIVE WAVEFORM STREAM
                        </h4>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'Roboto Mono' }}>
                            {status === BLEStatus.SCANNING_200HZ ? '200Hz' : isRecording ? '40Hz' : 'IDLE'}
                        </div>
                    </div>
                    <div style={{ flex: 1, minHeight: '300px' }}>
                        {/* waveformData passed to panel for visualization */}
                        <VitalsScalePanel waveformSamples={waveformSamples} hrBpm={biomarkers?.hr} sqi={biomarkers?.sqi} />
                    </div>
                </div>

                {/* Secondary Metrics container */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="glass" style={{ padding: '24px', borderRadius: '24px', background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.1) 0%, rgba(0, 210, 255, 0.05) 100%)' }}>
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-tertiary)', marginBottom: '16px' }}>
                            <Brain size={18} color="var(--primary-color)" />
                            BIOMARKER STATUS
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ color: isFinished ? 'var(--success-color)' : 'var(--primary-color)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {isRecording ? <Loader2 size={18} className="animate-spin" /> : isFinished ? <ActivityIcon size={20} /> : <Square size={18} />}
                                    {isRecording ? 'ANALYZING STREAM...' : isFinished ? 'SCAN SUCCESSFUL' : 'READY TO START'}
                                </div>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                {isRecording ? 'Detecting biomarkers from live telemetry. Please keep the patient still for optimal readings.' :
                                    isFinished ? 'Biomarker analysis complete. Results synchronized to history.' :
                                        'Waiting for device activation to begin biomarker extraction.'}
                            </p>
                        </div>
                    </div>

                    <div className="glass" style={{ padding: '24px', borderRadius: '24px', flex: 1 }}>
                        <h4 style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)', marginBottom: '20px' }}>CLINICAL INDICES</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>HRV Status (Stress)</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{biomarkers?.stress || '--'}</div>
                            </div>
                            {biomarkers?.sdnn && (
                                <div style={{ display: 'flex', gap: '20px' }}>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>SDNN</div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{biomarkers.sdnn} <span style={{ fontSize: '0.8rem' }}>ms</span></div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>RMSSD</div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{biomarkers.rmssd} <span style={{ fontSize: '0.8rem' }}>ms</span></div>
                                    </div>
                                </div>
                            )}
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Spo2 Level</div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: (biomarkers?.spo2 || 0) > 95 ? 'var(--success-color)' : 'var(--warning-color)' }}>
                                    {biomarkers?.spo2 ? `${biomarkers.spo2.toFixed(1)}%` : '--'}
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: 'auto', padding: '16px', borderRadius: '12px', background: isRecording ? 'rgba(0, 210, 255, 0.05)' : 'rgba(239, 68, 68, 0.05)', border: `1px solid ${isRecording ? 'var(--border-color)' : 'rgba(239, 68, 68, 0.2)'}`, display: 'flex', gap: '12px' }}>
                            {isRecording ? <ActivityIcon color="var(--primary-color)" size={20} /> : <AlertCircle color="#ef4444" size={20} />}
                            <div style={{ fontSize: '0.8rem', color: isRecording ? 'var(--text-secondary)' : '#ef4444' }}>
                                {isRecording ? 'Recording in progress...' : 'Monitoring inactive.'}
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
        .status-dot.active {
            background: var(--success-color);
            box-shadow: 0 0 10px var(--success-color);
        }
      `}</style>
        </motion.div >
    );
};

export default LiveRecording;
