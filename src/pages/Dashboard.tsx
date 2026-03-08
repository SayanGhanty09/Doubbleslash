import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Play,
    History as HistoryIcon,
    ArrowUpCircle,
    CheckCircle2,
    AlertCircle,
    Battery,
    Wifi,
    Cpu,
    Shield,
    UserPlus,
    Users,
    X
} from 'lucide-react';
import { useBLE, BLEStatus } from '../contexts/BLEContext';
import { usePatientStore } from '../contexts/PatientStore';
import type { Patient } from '../contexts/PatientStore';
import { usePatient } from '../components/layout/Shell';
import { useAuth } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { status, startFullScan } = useBLE();
    const { patients, recordings, addPatient } = usePatientStore();
    const { setActivePatient } = usePatient();
    const { doctor } = useAuth();

    const isConnected = status === BLEStatus.CONNECTED ||
        status === BLEStatus.IDLE ||
        status === BLEStatus.SCANNING ||
        status === BLEStatus.SCANNING_BP;

    // Patient picker state
    const [showPicker, setShowPicker] = useState(false);
    const [newName, setNewName] = useState('');
    const [newAge, setNewAge] = useState('');
    const [newSex, setNewSex] = useState<'Male' | 'Female' | 'Other'>('Male');

    const handleStartRecording = () => {
        setShowPicker(true);
    };

    const launchWithPatient = (patient: Patient) => {
        setActivePatient(patient.name);
        setShowPicker(false);
        // Navigate to live, passing patient info via state so LiveRecording can auto-start
        navigate('/live', { state: { autoStartPatientId: patient.id, autoStartPatientName: patient.name } });
    };

    const handleAddAndLaunch = () => {
        if (!newName.trim()) return;
        const p = addPatient({ name: newName.trim(), age: parseInt(newAge) || 0, sex: newSex });
        setNewName(''); setNewAge(''); setNewSex('Male');
        launchWithPatient(p);
    };

    // Real recent activity from recordings
    const recentActivity = recordings.slice(0, 5).map(r => ({
        id: r.id,
        date: new Date(r.timestamp).toLocaleDateString(),
        patient: r.patientName,
        duration: r.biomarkers.hr ? 'Completed' : 'Partial',
        status: 'Completed' as string,
        error: false
    }));

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="page-transition bg-mesh-animated"
            style={{ display: 'flex', flexDirection: 'column', gap: '24px', minHeight: '100%', borderRadius: '24px', padding: '12px' }}
        >
            {/* Welcome Section */}
            <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 className="glowing-heading" style={{ fontSize: '1.8rem', marginBottom: '40px', fontWeight: 700 }}>Welcome back, {doctor?.name ?? 'Doctor'}</h1>
                    <p style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        System Status: <span className="status-dot"></span> <span style={{ color: 'var(--success-color)', fontWeight: 600 }}>Normal</span>. 1 Device Connected.
                    </p>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                    <div>Monday, May 20, 2024</div>
                </div>
            </section>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                {/* Left Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Quick Actions */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                        {[
                            { title: 'Start New Recording', icon: Play, color: 'var(--primary-color)', onClick: handleStartRecording },
                            { title: 'View Last Session', icon: HistoryIcon, color: 'var(--secondary-color)', onClick: () => navigate('/stats') },
                            { title: 'Device Console', icon: ArrowUpCircle, color: 'var(--success-color)', onClick: () => navigate('/console') },
                        ].map((action, idx) => (
                            <motion.div
                                key={idx}
                                onClick={action.onClick}
                                whileHover={{ y: -5, scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="glass btn-shimmer hover-lift-glow"
                                style={{
                                    padding: '24px',
                                    borderRadius: '16px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '12px',
                                    borderBottom: `3px solid ${action.color}`
                                }}
                            >
                                <div style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: '12px',
                                    background: `${action.color}15`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <action.icon color={action.color} size={24} />
                                </div>
                                <span style={{ fontWeight: 600, fontSize: '0.9rem', textAlign: 'center' }}>{action.title}</span>
                            </motion.div>
                        ))}
                    </div>

                    {/* Recent Activity */}
                    <div className="glass" style={{ padding: '24px', borderRadius: '16px', flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '1.1rem' }}>Recent Activity Log</h3>
                            <span onClick={() => navigate('/stats')} style={{ fontSize: '0.8rem', color: 'var(--primary-color)', cursor: 'pointer' }}>View All</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {recentActivity.map((log) => (
                                <div key={log.id} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '16px',
                                    padding: '12px',
                                    borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid var(--border-color)'
                                }}>
                                    <div style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: '50%',
                                        background: log.error ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        {log.error ? <AlertCircle color="var(--error-color)" size={20} /> : <CheckCircle2 color="var(--success-color)" size={20} />}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{log.patient}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{log.date} • {log.duration}</div>
                                    </div>
                                    <div style={{
                                        fontSize: '0.75rem',
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        background: log.error ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                        color: log.error ? 'var(--error-color)' : 'var(--success-color)',
                                        fontWeight: 600
                                    }}>
                                        {log.status}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column - Device Status */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="glass border-spin-premium hover-lift-glow" style={{ padding: '24px', borderRadius: '24px', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, right: 0, padding: '16px' }}>
                            <Wifi size={18} color="var(--success-color)" />
                        </div>

                        <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Cpu size={20} color="var(--primary-color)" /> Hardware Status
                        </h3>

                        <div style={{
                            height: '180px',
                            background: 'rgba(0,210,255,0.02)',
                            borderRadius: '20px',
                            border: '1px dashed var(--border-color)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            marginBottom: '24px'
                        }}>
                            <Shield size={48} color="var(--primary-color)" className="animate-float" style={{ opacity: 0.8, filter: 'drop-shadow(0 0 10px rgba(0, 210, 255, 0.5))' }} />
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                                Secure Connection Active<br />
                                <span style={{ color: 'var(--primary-color)' }}>ESP32-MEDICAL-V1</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>MAC Address</span>
                                <span style={{ fontWeight: 500, fontFamily: 'Roboto Mono', fontSize: '0.85rem' }}>A1:B2:C3:D4:E5:F6</span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Battery size={20} color="var(--success-color)" />
                                <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
                                    <div style={{ width: '85%', height: '100%', background: 'var(--success-color)', borderRadius: '3px' }}></div>
                                </div>
                                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>85%</span>
                            </div>

                            <button style={{
                                width: '100%',
                                padding: '14px',
                                borderRadius: '12px',
                                background: 'rgba(255,255,255,0.03)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                marginTop: '8px'
                            }}>
                                Disconnect Device
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Patient Picker Popup */}
            {showPicker && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
                    onClick={() => setShowPicker(false)}>
                    <div className="glass" onClick={e => e.stopPropagation()} style={{ width: 420, maxHeight: '80vh', borderRadius: 20, padding: 28, overflow: 'auto', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Select Patient</h3>
                            <button onClick={() => setShowPicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={20} /></button>
                        </div>

                        {patients.length > 0 && (
                            <div style={{ marginBottom: 20 }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: 8 }}>
                                    <Users size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />Existing Patients
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                                    {patients.map(p => (
                                        <button key={p.id} onClick={() => launchWithPatient(p)}
                                            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                                                background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)',
                                                color: 'var(--text-primary)', fontFamily: 'inherit', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 600 }}>{p.name}</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{p.age > 0 ? `${p.age}y / ${p.sex}` : ''}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: 10 }}>
                                <UserPlus size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />New Patient
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full name"
                                    style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)', outline: 'none' }} />
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <input value={newAge} onChange={e => setNewAge(e.target.value)} placeholder="Age" type="number"
                                        style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)', outline: 'none' }} />
                                    <select value={newSex} onChange={e => setNewSex(e.target.value as any)}
                                        style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)', outline: 'none' }}>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <button onClick={handleAddAndLaunch}
                                    style={{ width: '100%', padding: '12px', borderRadius: 10, background: 'var(--primary-color)', color: 'black', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    <Play size={16} /> Add & Start Recording
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default Dashboard;
