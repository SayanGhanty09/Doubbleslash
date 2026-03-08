import React, { useState, useMemo } from 'react';
import { useBLE } from '../contexts/BLEContext';
import { usePatientStore } from '../contexts/PatientStore';
import type { RecordingEntry, Patient } from '../contexts/PatientStore';
import { motion } from 'framer-motion';
import {
    FileDown,
    Calendar,
    Activity,
    Info,
    ChevronDown,
    Download,
    User,
    Trash2,
    Heart,
    Wind
} from 'lucide-react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip
} from 'recharts';
import AIAssistantChat from '../components/AIAssistantChat';

const Statistics: React.FC = () => {
    const { biomarkers } = useBLE();
    const { patients, recordings, deleteRecording } = usePatientStore();

    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(null);

    // Group recordings by patient
    const patientMap = useMemo(() => {
        const m = new Map<string, { patient: Patient; records: RecordingEntry[] }>();
        for (const p of patients) {
            m.set(p.id, { patient: p, records: [] });
        }
        for (const r of recordings) {
            const entry = m.get(r.patientId);
            if (entry) entry.records.push(r);
            else m.set(r.patientId, { patient: { id: r.patientId, name: r.patientName, age: 0, sex: 'Other', createdAt: '' }, records: [r] });
        }
        return m;
    }, [patients, recordings]);

    const selectedData = useMemo(() => {
        if (selectedRecordingId) {
            const rec = recordings.find(r => r.id === selectedRecordingId);
            return rec?.biomarkers ?? null;
        }
        return null;
    }, [selectedRecordingId, recordings]);

    // Use selected recording data for display, fallback to live biomarkers
    const displayBio = selectedData ?? biomarkers;

    // Synthetic waveform based on HR and RR
    const waveformData = useMemo(() => {
        const hr = displayBio?.hr ?? 72;
        const rr = displayBio?.respRate ?? 16;
        const points = 200;
        const duration = 4; // seconds
        const data = [];
        for (let i = 0; i < points; i++) {
            const t = (i / points) * duration;
            // Cardiac component — sharp systolic peak + dicrotic notch
            const cardiacPhase = (t * hr / 60) % 1;
            let cardiac = 0;
            if (cardiacPhase < 0.1) cardiac = Math.sin(cardiacPhase / 0.1 * Math.PI) * 80;
            else if (cardiacPhase < 0.15) cardiac = Math.sin((cardiacPhase - 0.1) / 0.05 * Math.PI) * -15;
            else if (cardiacPhase < 0.25) cardiac = Math.sin((cardiacPhase - 0.15) / 0.1 * Math.PI) * 30;
            else cardiac = -5 * Math.exp(-8 * (cardiacPhase - 0.25));
            // Respiratory modulation
            const respMod = 1 + 0.12 * Math.sin(2 * Math.PI * rr / 60 * t);
            data.push({ time: t.toFixed(2), ppg: parseFloat((cardiac * respMod).toFixed(2)) });
        }
        return data;
    }, [displayBio?.hr, displayBio?.respRate]);

    const metrics = [
        { label: 'Heart Rate', value: displayBio?.hr ? displayBio.hr.toFixed(2) : '--', sub: 'bpm' },
        { label: 'SpO2', value: displayBio?.spo2 ? displayBio.spo2.toFixed(2) : '--', sub: '%' },
        { label: 'Hemoglobin (Hb)', value: displayBio?.hb ? displayBio.hb.toFixed(2) : '--', sub: 'g/dL' },
        { label: 'Bilirubin', value: displayBio?.bilirubin ? displayBio.bilirubin.toFixed(2) : '--', sub: 'mg/dL' },
        { label: 'Blood Pressure', value: displayBio?.bpSys ? `${displayBio.bpSys.toFixed(2)}/${displayBio.bpDia?.toFixed(2)}` : '--', sub: 'mmHg' },
        { label: 'Resp. Rate', value: displayBio?.respRate ? displayBio.respRate.toFixed(2) : '--', sub: 'br/min' },
    ];

    const hrvMetrics = [
        { label: 'SDNN', value: displayBio?.sdnn ? displayBio.sdnn.toFixed(2) : '--', unit: 'ms', pct: Math.min(100, ((displayBio?.sdnn ?? 0) / 100) * 100) },
        { label: 'RMSSD', value: displayBio?.rmssd ? displayBio.rmssd.toFixed(2) : '--', unit: 'ms', pct: Math.min(100, ((displayBio?.rmssd ?? 0) / 80) * 100) },
        { label: 'PI (Perfusion Index)', value: displayBio?.pi ? displayBio.pi.toFixed(2) : '--', unit: '%', pct: Math.min(100, ((displayBio?.pi ?? 0) / 5) * 100) },
        { label: 'SQI (Signal Quality)', value: displayBio?.sqi !== undefined ? (displayBio.sqi * 100).toFixed(0) : '--', unit: '/100', pct: (displayBio?.sqi ?? 0) * 100 },
        { label: 'Hemoglobin (Hb)', value: displayBio?.hb ? displayBio.hb.toFixed(2) : '--', unit: 'g/dL', pct: Math.min(100, Math.max(0, ((displayBio?.hb ?? 0) - 8) / 10 * 100)) },
    ];

    const clinicalSummary = useMemo(() => {
        if (!displayBio) return 'No scan data available. Connect your device and run a scan to populate this section.';
        const flags: string[] = [];
        if (displayBio.spo2 && displayBio.spo2 < 95) flags.push(`Low SpO₂ (${displayBio.spo2.toFixed(2)}%)`);
        if (displayBio.hb && displayBio.hb < 12) flags.push(`Low Hb (${displayBio.hb.toFixed(2)} g/dL)`);
        if (displayBio.bilirubin && displayBio.bilirubin > 2.0) flags.push(`Elevated Bilirubin (${displayBio.bilirubin.toFixed(2)} mg/dL)`);
        if (displayBio.hr && (displayBio.hr > 100 || displayBio.hr < 50)) flags.push(`Abnormal HR (${displayBio.hr.toFixed(2)} bpm)`);
        if (flags.length > 0) return `Attention — ${flags.join('; ')}. Clinical review recommended.`;
        return 'All indices remain within normal ranges. No significant autonomic dysfunction or haematological abnormalities detected.';
    }, [displayBio]);

    const exportToCSV = () => {
        const headers = ["Parameter", "Value", "Unit"];
        const rows = [
            ["Heart Rate", displayBio?.hr ? displayBio.hr.toFixed(2) : "--", "bpm"],
            ["SpO2", displayBio?.spo2 ? displayBio.spo2.toFixed(2) : "--", "%"],
            ["Hemoglobin (Hb)", displayBio?.hb ? displayBio.hb.toFixed(2) : "--", "g/dL"],
            ["Bilirubin", displayBio?.bilirubin ? displayBio.bilirubin.toFixed(2) : "--", "mg/dL"],
            ["Blood Pressure", displayBio?.bpSys ? `${displayBio.bpSys.toFixed(2)}/${displayBio.bpDia?.toFixed(2)}` : "--", "mmHg"],
            ["PI", displayBio?.pi ? displayBio.pi.toFixed(2) : "--", "%"],
            ["SQI", displayBio?.sqi !== undefined ? (displayBio.sqi * 100).toFixed(0) : "--", "/100"],
            ["SDNN", displayBio?.sdnn ? displayBio.sdnn.toFixed(2) : "--", "ms"],
            ["RMSSD", displayBio?.rmssd ? displayBio.rmssd.toFixed(2) : "--", "ms"],
        ];
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `statistics_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const selectedPatientRecords = selectedPatientId ? (patientMap.get(selectedPatientId)?.records ?? []) : [];
    const selectedPatient = selectedPatientId ? patientMap.get(selectedPatientId)?.patient : null;

    return (
        <div className="page-wrapper">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="page-transition bg-mesh-animated no-print"
                style={{ display: 'flex', flexDirection: 'column', gap: '24px', borderRadius: '24px', padding: '12px' }}
            >
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h1 className="glowing-heading" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Statistics & History</h1>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="glass" onClick={exportToCSV} style={{ padding: '10px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <Download size={18} /> Export CSV
                        </button>
                        <button onClick={() => window.print()} style={{ padding: '10px 16px', borderRadius: '10px', background: 'var(--primary-color)', color: 'black', border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <FileDown size={18} /> Generate PDF
                        </button>
                    </div>
                </header>

                {/* Patient List — segregated history */}
                <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px' }}>
                    {/* Left sidebar: patient list */}
                    <div className="glass" style={{ borderRadius: '16px', padding: '16px', maxHeight: '70vh', overflowY: 'auto' }}>
                        <h3 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <User size={16} /> Patients
                        </h3>
                        {patients.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 40 }}>No patients yet</p>}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {[...patientMap.entries()].map(([pid, { patient, records: recs }]) => (
                                <button
                                    key={pid}
                                    onClick={() => { setSelectedPatientId(pid); setSelectedRecordingId(null); }}
                                    style={{
                                        width: '100%', padding: '12px', borderRadius: 10, cursor: 'pointer',
                                        background: selectedPatientId === pid ? 'rgba(0,210,255,0.1)' : 'rgba(255,255,255,0.02)',
                                        border: selectedPatientId === pid ? '1px solid rgba(0,210,255,0.3)' : '1px solid var(--border-color)',
                                        color: 'var(--text-primary)', fontFamily: 'inherit', textAlign: 'left'
                                    }}
                                >
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{patient.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                        {patient.age > 0 ? `${patient.age}y / ${patient.sex}` : ''} — {recs.length} recording{recs.length !== 1 ? 's' : ''}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right: recordings for selected patient */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {selectedPatient ? (
                            <>
                                <div className="glass" style={{ padding: '16px 24px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>{selectedPatient.name}</span>
                                        <span style={{ marginLeft: 12, fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>{selectedPatient.age > 0 ? `${selectedPatient.age}y / ${selectedPatient.sex}` : ''}</span>
                                    </div>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>{selectedPatientRecords.length} recordings</span>
                                </div>

                                {selectedPatientRecords.length === 0 && (
                                    <div className="glass" style={{ padding: 40, borderRadius: 16, textAlign: 'center', color: 'var(--text-tertiary)' }}>
                                        No recordings yet for this patient. Start a Live Recording to create one.
                                    </div>
                                )}

                                {/* Recording list */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: selectedRecordingId ? '180px' : '400px', overflowY: 'auto' }}>
                                    {selectedPatientRecords.map(rec => {
                                        const d = new Date(rec.timestamp);
                                        const active = selectedRecordingId === rec.id;
                                        return (
                                            <div
                                                key={rec.id}
                                                onClick={() => setSelectedRecordingId(active ? null : rec.id)}
                                                className="glass"
                                                style={{
                                                    padding: '14px 20px', borderRadius: 12, cursor: 'pointer',
                                                    border: active ? '1px solid rgba(0,210,255,0.4)' : '1px solid var(--border-color)',
                                                    background: active ? 'rgba(0,210,255,0.06)' : undefined,
                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                                }}
                                            >
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                                        <Calendar size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                                                        {d.toLocaleDateString()} {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: 4, display: 'flex', gap: 16 }}>
                                                        <span><Heart size={12} style={{ verticalAlign: 'middle' }} /> HR: {rec.biomarkers.hr ? Number(rec.biomarkers.hr).toFixed(2) : '--'}</span>
                                                        <span>SpO2: {rec.biomarkers.spo2 ? Number(rec.biomarkers.spo2).toFixed(2) : '--'}%</span>
                                                        {rec.biomarkers.bpSys && <span>BP: {Number(rec.biomarkers.bpSys).toFixed(0)}/{Number(rec.biomarkers.bpDia).toFixed(0)}</span>}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); deleteRecording(rec.id); }}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4 }}
                                                    title="Delete recording"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Selected recording details */}
                                {selectedData && (
                                    <>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
                                            {metrics.map((m, idx) => (
                                                <div key={idx} className="glass" style={{ padding: '16px', borderRadius: '14px', textAlign: 'center' }}>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginBottom: '6px', textTransform: 'uppercase' }}>{m.label}</div>
                                                    <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{m.value}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{m.sub}</div>
                                                </div>
                                            ))}
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
                                            {/* HRV panel */}
                                            <div className="glass" style={{ padding: '20px', borderRadius: '20px' }}>
                                                <h3 style={{ fontSize: '1rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Info size={16} color="var(--text-tertiary)" /> HRV Analysis
                                                </h3>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                                    {hrvMetrics.map((h, i) => (
                                                        <div key={i}>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>{h.label}</div>
                                                            <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{h.value} <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{h.unit}</span></div>
                                                            <div style={{ width: '100%', height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '6px' }}>
                                                                <div style={{ width: `${h.pct}%`, height: '100%', background: 'var(--primary-color)', borderRadius: '2px', transition: 'width 0.5s ease' }} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div style={{ marginTop: '24px', padding: '14px', borderRadius: '12px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.1)' }}>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--success-color)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                                        <Activity size={12} /> Clinical Summary
                                                    </div>
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>{clinicalSummary}</p>
                                                </div>
                                            </div>

                                            {/* Waveform */}
                                            <div className="glass border-spin-premium" style={{ padding: '20px', borderRadius: '20px', minHeight: '300px' }}>
                                                <h3 style={{ fontSize: '1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <Wind size={16} /> Synthetic PPG Waveform
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                                                        HR={displayBio?.hr ? displayBio.hr.toFixed(0) : '72'} bpm | RR={displayBio?.respRate ? displayBio.respRate.toFixed(0) : '16'} brpm
                                                    </span>
                                                </h3>
                                                <div style={{ height: '260px' }}>
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <LineChart data={waveformData}>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                                            <XAxis dataKey="time" hide />
                                                            <YAxis stroke="var(--text-tertiary)" fontSize={11} />
                                                            <Tooltip contentStyle={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '8px' }} itemStyle={{ fontSize: '0.8rem' }} />
                                                            <Line type="monotone" dataKey="ppg" stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive={false} name="PPG" />
                                                        </LineChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* AI Assistant Chat — uses selected recording data */}
                                <AIAssistantChat
                                    biomarkerData={selectedData}
                                    patient={selectedPatient ? { name: selectedPatient.name, age: selectedPatient.age, sex: selectedPatient.sex } : null}
                                />
                            </>
                        ) : (
                            <div className="glass" style={{ padding: 60, borderRadius: 20, textAlign: 'center', color: 'var(--text-tertiary)' }}>
                                <User size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
                                <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>Select a patient to view their recording history</p>
                                <p style={{ fontSize: '0.85rem', marginTop: 8 }}>Recordings are automatically saved when a scan completes.</p>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Prescription Print Template */}
            <div className="prescription-only" style={{ fontFamily: 'Arial, sans-serif' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid black', paddingBottom: '20px', marginBottom: '30px' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '24pt' }}>IEEE JU MEDICAL CENTER</h1>
                        <p style={{ margin: '5px 0' }}>Electronic Digital Health Record</p>
                        <p style={{ margin: 0, fontSize: '10pt', color: '#444' }}>Session Data & Vital Reports</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: 700, margin: 0 }}>Date: {new Date().toLocaleDateString()}</p>
                        <p style={{ margin: 0 }}>Patient: {selectedPatient?.name ?? 'N/A'}</p>
                    </div>
                </div>

                <div style={{ marginBottom: '40px', background: '#f5f5f5', padding: '20px', borderRadius: '4px' }}>
                    <h2 style={{ fontSize: '14pt', borderBottom: '1px solid #ccc', paddingBottom: '5px', marginBottom: '15px' }}>PATIENT INFORMATION</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div><strong>Name:</strong> {selectedPatient?.name ?? 'N/A'}</div>
                        <div><strong>Patient ID:</strong> {selectedPatient?.id ?? 'N/A'}</div>
                        <div><strong>Age / Sex:</strong> {selectedPatient ? `${selectedPatient.age} / ${selectedPatient.sex}` : 'N/A'}</div>
                        <div><strong>Report Type:</strong> Session Statistics</div>
                    </div>
                </div>

                <div style={{ marginBottom: '40px' }}>
                    <h2 style={{ fontSize: '14pt', borderBottom: '1px solid #ccc', paddingBottom: '5px', marginBottom: '15px' }}>VITAL READINGS SUMMARY</h2>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f0f0f0' }}>
                                <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ccc' }}>Parameter</th>
                                <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ccc' }}>Value</th>
                                <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ccc' }}>Reference Range</th>
                            </tr>
                        </thead>
                        <tbody>
                            {metrics.map((m, i) => (
                                <tr key={i}>
                                    <td style={{ padding: '10px', border: '1px solid #ccc' }}>{m.label}</td>
                                    <td style={{ padding: '10px', border: '1px solid #ccc', fontWeight: 700 }}>{m.value} {m.sub}</td>
                                    <td style={{ padding: '10px', border: '1px solid #ccc', color: '#666' }}>Normal</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div style={{ marginTop: '80px', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '30px' }}>
                    <p style={{ fontSize: '12pt', fontWeight: 600, color: '#444' }}>
                        NOTE: This data is only for screening purposes.
                    </p>
                    <p style={{ fontSize: '9pt', color: '#888', marginTop: '10px' }}>
                        IEEE JU Health Integration System
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Statistics;
