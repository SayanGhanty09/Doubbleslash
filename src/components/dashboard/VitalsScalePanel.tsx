import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, ThermometerSun, AlertTriangle, Wind, HeartPulse } from 'lucide-react';

interface VitalMetric {
    name: string;
    value: number; // 1 to 10
    icon: React.ElementType;
    color: string;
}

const VitalsScalePanel: React.FC = () => {
    // Initial simulated values on a 1-10 scale
    const [metrics, setMetrics] = useState<VitalMetric[]>([
        { name: 'Stress Level', value: 3, icon: Activity, color: '#f59e0b' },
        { name: 'Anemia', value: 2, icon: AlertTriangle, color: '#ef4444' },
        { name: 'Jaundice', value: 1, icon: ThermometerSun, color: '#eab308' },
        { name: 'Coughless', value: 8, icon: Wind, color: '#10b981' }, // 10 = perfectly coughless, 1 = severe cough
        { name: 'Blood Pressure', value: 5, icon: HeartPulse, color: '#00d2ff' } // 5 = normal, 10 = severe hypertension
    ]);

    // Simulate slight fluctuations for a "live" feel
    useEffect(() => {
        const interval = setInterval(() => {
            setMetrics(prev => prev.map(m => {
                // Occasional slight fluctuation +/- 1, keeping within 1-10 bounds
                if (Math.random() > 0.7) {
                    let move = Math.random() > 0.5 ? 1 : -1;
                    let newVal = Math.max(1, Math.min(10, m.value + move));

                    // Don't fluctuate Jaundice and Anemia as much, as they are chronic
                    if ((m.name === 'Jaundice' || m.name === 'Anemia') && Math.random() > 0.2) {
                        newVal = m.value;
                    }

                    return { ...m, value: newVal };
                }
                return m;
            }));
        }, 3000); // Update every 3 seconds

        return () => clearInterval(interval);
    }, []);

    const getColorForValue = (value: number, name: string) => {
        // For 'Coughless', higher is better (green). For others, lower is better (green).
        const isHigherBetter = name === 'Coughless';

        let normalized = value;
        if (isHigherBetter) normalized = 11 - value; // Flip logic for coloring

        if (normalized <= 3) return '#10b981'; // Green (Safe)
        if (normalized <= 6) return '#eab308'; // Yellow (Warning)
        return '#ef4444'; // Red (Danger)
    };

    return (
        <div className="glass" style={{ flex: 1, borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: 700 }}>
                    <Activity size={20} color="var(--primary-color)" />
                    Clinical AI Analysis
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    Scale: 1 (Min) - 10 (Max)
                </div>
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

                            {/* Custom Progress Bar */}
                            <div style={{
                                height: '8px',
                                width: '100%',
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: '4px',
                                overflow: 'hidden',
                                display: 'flex'
                            }}>
                                <motion.div
                                    animate={{ width: `${(metric.value / 10) * 100}%` }}
                                    transition={{ type: 'spring', stiffness: 50, damping: 15 }}
                                    style={{
                                        height: '100%',
                                        background: statusColor,
                                        borderRadius: '4px',
                                        boxShadow: `0 0 10px ${statusColor}40`
                                    }}
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
