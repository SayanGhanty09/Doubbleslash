import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    FileDown,
    Calendar,
    Activity,
    Info,
    ChevronDown,
    Download
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

const Statistics: React.FC = () => {
    const [selectedSession] = useState("Session #1024 - 2024-05-20");

    // Mock Trend Data
    const trendData = Array.from({ length: 50 }, (_, i) => ({
        time: `${i}:00`,
        hr: 70 + Math.random() * 20,
        spo2: 96 + Math.random() * 4,
        bp: 110 + Math.random() * 20,
        ppg: 50 + Math.sin(i * 0.5) * 20 + Math.random() * 5
    }));

    const exportToCSV = () => {
        const headers = ["Time", "Heart Rate (bpm)", "SpO2 (%)", "Blood Pressure (mmHg)", "PPG"];
        const rows = trendData.map(d => [d.time, d.hr.toFixed(1), d.spo2.toFixed(1), d.bp.toFixed(1), d.ppg.toFixed(1)]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `statistics_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrint = () => {
        window.print();
    };


    const metrics = [
        { label: 'Duration', value: '00:45:12', sub: 'Completed' },
        { label: 'Avg Heart Rate', value: '78', sub: 'bpm' },
        { label: 'Min/Max SpO2', value: '96/100', sub: '%' },
        { label: 'Avg BP', value: '118/79', sub: 'mmHg' },
    ];

    const hrvMetrics = [
        { label: 'SDNN', value: '54.2', unit: 'ms' },
        { label: 'RMSSD', value: '48.9', unit: 'ms' },
        { label: 'Stress Score', value: '22', unit: '/100' },
        { label: 'PI (Perfusion Index)', value: '4.8', unit: '%' },
        { label: 'SQI (Signal Quality Index)', value: '87', unit: '/100' },
    ];

    return (
        <div className="page-wrapper">
            {/* Screen-only view */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="page-transition bg-mesh-animated no-print"
                style={{ display: 'flex', flexDirection: 'column', gap: '24px', borderRadius: '24px', padding: '12px' }}
            >
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <h1 className="glowing-heading" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Statistics & History</h1>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="glass" onClick={exportToCSV} style={{ padding: '10px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <Download size={18} />
                            Export CSV
                        </button>
                        <button onClick={handlePrint} style={{
                            padding: '10px 16px',
                            borderRadius: '10px',
                            background: 'var(--primary-color)',
                            color: 'black',
                            border: 'none',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer'
                        }}>
                            <FileDown size={18} />
                            Generate PDF
                        </button>
                    </div>
                </header>

                {/* Session Selector */}
                <div className="glass" style={{ padding: '16px 24px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Calendar size={20} color="var(--primary-color)" />
                        <div style={{ border: 'none', background: 'none', color: 'var(--text-primary)', fontWeight: 600, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            {selectedSession}
                            <ChevronDown size={16} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '24px' }}>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            Patient: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>John Doe</span>
                        </div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            ID: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>P-1001</span>
                        </div>
                    </div>
                </div>

                {/* Session Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                    {metrics.map((m, idx) => (
                        <div key={idx} className="glass" style={{ padding: '20px', borderRadius: '16px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '8px', textTransform: 'uppercase' }}>{m.label}</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '2px' }}>{m.value}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{m.sub}</div>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '24px' }}>
                    {/* HRV Analysis Panel */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div className="glass hover-lift-glow" style={{ padding: '24px', borderRadius: '24px', flex: 1 }}>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                Advanced Analysis <Info size={16} color="var(--text-tertiary)" />
                            </h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                {hrvMetrics.map((h, i) => (
                                    <div key={i}>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>{h.label}</div>
                                        <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{h.value} <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{h.unit}</span></div>
                                        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '8px' }}>
                                            <div style={{ width: `${Math.random() * 60 + 20}%`, height: '100%', background: 'var(--primary-color)', borderRadius: '2px' }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ marginTop: '40px', padding: '16px', borderRadius: '16px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--success-color)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <Activity size={14} /> Clinical Summary
                                </div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                    Indices remain within normal recovery ranges. No significant autonomic dysfunction observed.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Global Trends Area */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div className="glass border-spin-premium hover-lift-glow" style={{ padding: '24px', borderRadius: '24px', flex: 1.5, minHeight: '350px' }}>
                            <h3 style={{ fontSize: '1rem', marginBottom: '24px' }}>Full Session Linear Trend</h3>
                            <div style={{ height: '300px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={trendData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis dataKey="time" hide />
                                        <YAxis stroke="var(--text-tertiary)" fontSize={12} />
                                        <Tooltip
                                            contentStyle={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                                            itemStyle={{ fontSize: '0.8rem' }}
                                        />
                                        <Line type="monotone" dataKey="hr" stroke="#ef4444" strokeWidth={2} dot={false} />
                                        <Line type="monotone" dataKey="spo2" stroke="#00d2ff" strokeWidth={2} dot={false} />
                                        <Line type="monotone" dataKey="bp" stroke="#f59e0b" strokeWidth={2} dot={false} />
                                        <Line type="monotone" dataKey="ppg" stroke="#10b981" strokeWidth={2} dot={false} name="PPG" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                            <div className="glass" style={{ padding: '24px', borderRadius: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '16px' }}>
                                <div style={{ width: 120, height: 120, borderRadius: '50%', border: '8px solid var(--border-color)', borderTopColor: 'var(--success-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>94%</div>
                                        <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Efficiency</div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontWeight: 600 }}>Data Quality Score</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Minimal artifacts detected</div>
                                </div>
                            </div>
                        </div>
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
                        <p style={{ margin: 0 }}>Session ID: #1024</p>
                    </div>
                </div>

                <div style={{ marginBottom: '40px', background: '#f5f5f5', padding: '20px', borderRadius: '4px' }}>
                    <h2 style={{ fontSize: '14pt', borderBottom: '1px solid #ccc', paddingBottom: '5px', marginBottom: '15px' }}>PATIENT INFORMATION</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div><strong>Name:</strong> John Doe</div>
                        <div><strong>Patient ID:</strong> P-1001</div>
                        <div><strong>Age / Sex:</strong> 45 / Male</div>
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

                <div style={{ marginBottom: '40px' }}>
                    <h2 style={{ fontSize: '14pt', borderBottom: '1px solid #ccc', paddingBottom: '5px', marginBottom: '15px' }}>CLINICAL INDICES (HRV)</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        {hrvMetrics.map((h, i) => (
                            <div key={i} style={{ padding: '10px', border: '1px solid #eee', borderRadius: '4px' }}>
                                <span style={{ color: '#666' }}>{h.label}:</span> <strong style={{ float: 'right' }}>{h.value} {h.unit}</strong>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ marginTop: '80px', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '30px' }}>
                    <p style={{ fontSize: '12pt', fontWeight: 600, color: '#444' }}>
                        NOTE: This data is only for screening purposes.
                    </p>
                    <p style={{ fontSize: '9pt', color: '#888', marginTop: '10px' }}>
                        IEEE JU Health Integration System • Session ID: #1024
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Statistics;
