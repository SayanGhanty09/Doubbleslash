import React, { useMemo } from 'react';
import { Heart, Activity } from 'lucide-react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    YAxis,
    XAxis,
    ReferenceLine,
} from 'recharts';
interface WaveformSample { t: number; nir: number; }

interface VitalsScalePanelProps {
    waveformSamples?: WaveformSample[];
    hrBpm?: number;
    sqi?: number;
}

const VitalsScalePanel: React.FC<VitalsScalePanelProps> = ({ waveformSamples, hrBpm, sqi }) => {
    const chartData = useMemo(() => {
        if (!waveformSamples || waveformSamples.length < 20) return null;
        // Keep last 300 samples (~7.5 s @ 40 Hz)
        const recent = waveformSamples.slice(-300);
        // Remove DC baseline
        const mean = recent.reduce((a, b) => a + b.nir, 0) / recent.length;
        const raw = recent.map(s => s.nir - mean);
        // 7-point weighted moving average — suppresses high-frequency noise
        // while preserving the PPG pulse shape (0.5–4 Hz).
        const weights = [0.05, 0.1, 0.2, 0.3, 0.2, 0.1, 0.05];
        const vals = raw.map((_, i) => {
            let sum = 0, wSum = 0;
            for (let j = -3; j <= 3; j++) {
                const k = i + j;
                if (k >= 0 && k < raw.length) {
                    sum += raw[k] * weights[j + 3];
                    wSum += weights[j + 3];
                }
            }
            return sum / wSum;
        });
        // Normalise to [-100, 100]
        const maxAbs = Math.max(...vals.map(Math.abs), 1);
        // Use the device timestamp as x so the chart scrolls as new data arrives
        return recent.map((s, i) => ({ t: s.t, val: (vals[i] / maxAbs) * 100 }));
    }, [waveformSamples]);

    const hasData = (chartData?.length ?? 0) > 20;

    const hrColor = !hrBpm
        ? 'var(--text-tertiary)'
        : hrBpm > 100 || hrBpm < 50 ? '#ef4444'
        : hrBpm > 90 || hrBpm < 60 ? '#f59e0b'
        : '#10b981';

    return (
        <div style={{ width: '100%', height: '100%', minHeight: '260px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Heart
                        size={16}
                        color="#ef4444"
                        style={{
                            filter: hasData ? 'drop-shadow(0 0 6px #ef4444)' : 'none',
                            animation: hasData ? 'ppg-heartbeat 0.8s ease-in-out infinite' : 'none',
                        }}
                    />
                    <span style={{ fontSize: '0.75rem', fontFamily: 'Roboto Mono', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        PPG HEARTRATE SIGNAL
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {sqi !== undefined && (
                        <span style={{
                            fontSize: '0.7rem', fontFamily: 'Roboto Mono',
                            color: sqi > 70 ? '#10b981' : sqi > 40 ? '#f59e0b' : '#ef4444',
                        }}>
                            SQI {sqi}%
                        </span>
                    )}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                        <span style={{ fontSize: '1.4rem', fontWeight: 700, color: hrColor, fontFamily: 'Roboto Mono' }}>
                            {hrBpm ? hrBpm.toFixed(0) : '--'}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>bpm</span>
                    </div>
                </div>
            </div>

            {/* Chart surface */}
            <div style={{
                flex: 1,
                minHeight: '200px',
                filter: hasData ? 'drop-shadow(0 0 5px rgba(239,68,68,0.35))' : 'none',
            }}>
                {hasData ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData ?? []} margin={{ top: 10, right: 8, bottom: 10, left: 0 }}>
                            <defs>
                                <linearGradient id="ppgGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.22} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <YAxis hide domain={[-110, 110]} />
                            <XAxis hide dataKey="t" type="number" domain={['dataMin', 'dataMax']} />
                            <ReferenceLine y={0} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                            <Area
                                type="monotone"
                                dataKey="val"
                                stroke="#ef4444"
                                strokeWidth={2}
                                fill="url(#ppgGrad)"
                                dot={false}
                                isAnimationActive={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div style={{
                        width: '100%',
                        height: '100%',
                        minHeight: '200px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        border: '1px dashed rgba(255,255,255,0.08)',
                        borderRadius: '16px',
                    }}>
                        <Activity size={32} color="var(--text-tertiary)" style={{ opacity: 0.3 }} />
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                            Waveform stream inactive<br />
                            <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>Start a scan to see the live PPG signal</span>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes ppg-heartbeat {
                    0%, 100% { transform: scale(1); }
                    30%       { transform: scale(1.35); }
                    60%       { transform: scale(0.88); }
                }
            `}</style>
        </div>
    );
};

export default VitalsScalePanel;
