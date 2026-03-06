import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, ThermometerSun, AlertTriangle, Wind, HeartPulse } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, YAxis, XAxis } from 'recharts';

interface VitalMetric {
    name: string;
    value: number; // 1 to 10
    icon: React.ElementType;
    color: string;
}

interface VitalsScalePanelProps {
    waveformData?: number[];
}

const VitalsScalePanel: React.FC<VitalsScalePanelProps> = ({ waveformData }) => {
    // Initial simulated values on a 1-10 scale
    const [metrics, setMetrics] = useState<VitalMetric[]>([
        { name: 'Stress Level', value: 3, icon: Activity, color: '#f59e0b' },
        { name: 'Anemia', value: 2, icon: AlertTriangle, color: '#ef4444' },
        { name: 'Jaundice', value: 1, icon: ThermometerSun, color: '#eab308' },
        { name: 'Coughless', value: 8, icon: Wind, color: '#10b981' }, // 10 = perfectly coughless, 1 = severe cough
        { name: 'Blood Pressure', value: 5, icon: HeartPulse, color: '#00d2ff' } // 5 = normal, 10 = severe hypertension
    ]);

    // Format waveform for recharts
    const chartData = useMemo(() => {
        if (!waveformData) return [];
        return waveformData.map((val, i) => ({ time: i, val }));
    }, [waveformData]);

    // Simulate slight fluctuations for a "live" feel
    useEffect(() => {
        if (waveformData) return; // Disable simulation if real data is present
        const interval = setInterval(() => {
            setMetrics(prev => prev.map(m => {
                if (Math.random() > 0.7) {
                    let move = Math.random() > 0.5 ? 1 : -1;
                    let newVal = Math.max(1, Math.min(10, m.value + move));
                    if ((m.name === 'Jaundice' || m.name === 'Anemia') && Math.random() > 0.2) {
                        newVal = m.value;
                    }
                    return { ...m, value: newVal };
                }
                return m;
            }));
        }, 3000);

        return () => clearInterval(interval);
    }, [waveformData]);

    const getColorForValue = (value: number, name: string) => {
        const isHigherBetter = name === 'Coughless';
        let normalized = value;
        if (isHigherBetter) normalized = 11 - value;
        if (normalized <= 3) return '#10b981';
        if (normalized <= 6) return '#eab308';
        return '#ef4444';
    };

    if (waveformData) {
        return (
            <div style={{ width: '100%', height: '100%', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <YAxis hide domain={['auto', 'auto']} />
                            <XAxis hide />
                            <Line
                                type="monotone"
                                dataKey="val"
                                stroke="var(--primary-color)"
                                strokeWidth={3}
                                dot={false}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Waiting for waveform stream...</div>
                )}
            </div>
        );
    }

    return (
        <div className="glass" style={{ flex: 1, borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: 700 }}>
                    <Activity size={20} color="var(--primary-color)" />
                    Clinical AI Analysis
                </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, justifyContent: 'center' }}>
                {metrics.map((metric, idx) => {
                    const statusColor = getColorForValue(metric.value, metric.name);
                    return (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <metric.icon size={16} color={metric.color} />
                                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{metric.name}</span>
                                </div>
                                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: statusColor }}>
                                    {metric.value} <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>/ 10</span>
                                </span>
                            </div>
                            <div style={{ height: '8px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                <motion.div
                                    animate={{ width: `${(metric.value / 10) * 100}%` }}
                                    transition={{ type: 'spring', stiffness: 50, damping: 15 }}
                                    style={{ height: '100%', background: statusColor, borderRadius: '4px' }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default VitalsScalePanel;
