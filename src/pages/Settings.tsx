import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Moon,
    Sun,
    Monitor,
    Database,
    Globe,
    Shield,
    Trash2,
    Download,
    Layers,
    Key,
    Brain
} from 'lucide-react';

const OPENROUTER_KEY_STORAGE = 'spectru_openrouter_key';
const OPENROUTER_MODEL_STORAGE = 'spectru_openrouter_model';

export function getOpenRouterKey(): string {
    return localStorage.getItem(OPENROUTER_KEY_STORAGE) || '';
}
export function getOpenRouterModel(): string {
    return localStorage.getItem(OPENROUTER_MODEL_STORAGE) || 'x-ai/grok-4.1-fast';
}

const Settings: React.FC = () => {
    const [theme, setTheme] = useState('dark');
    const [smoothing, setSmoothing] = useState(true);
    const [units, setUnits] = useState('metric');
    const [apiKey, setApiKey] = useState(() => getOpenRouterKey());
    const [model, setModel] = useState(() => getOpenRouterModel());
    const [keySaved, setKeySaved] = useState(false);

    const sections = [
        {
            title: 'Application Preferences',
            icon: Monitor,
            settings: [
                {
                    label: 'Theme', description: 'Switch between light and dark modes.', component: (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => setTheme('light')} className="glass" style={{ padding: '8px 12px', borderRadius: '8px', border: theme === 'light' ? '1px solid var(--primary-color)' : '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <Sun size={14} /> Light
                            </button>
                            <button onClick={() => setTheme('dark')} className="glass" style={{ padding: '8px 12px', borderRadius: '8px', border: theme === 'dark' ? '1px solid var(--primary-color)' : '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <Moon size={14} /> Dark
                            </button>
                        </div>
                    )
                },
                {
                    label: 'Graph Smoothing', description: 'Enable anti-aliasing for real-time waveforms.', component: (
                        <div
                            onClick={() => setSmoothing(!smoothing)}
                            style={{
                                width: 48,
                                height: 24,
                                borderRadius: 12,
                                background: smoothing ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)',
                                position: 'relative',
                                cursor: 'pointer',
                                transition: '0.3s'
                            }}
                        >
                            <div style={{
                                width: 18,
                                height: 18,
                                borderRadius: '50%',
                                background: smoothing ? 'black' : 'white',
                                position: 'absolute',
                                top: 3,
                                left: smoothing ? 27 : 3,
                                transition: '0.3s'
                            }}></div>
                        </div>
                    )
                },
                {
                    label: 'Units', description: 'Standard weights and measurements.', component: (
                        <select value={units} onChange={(e) => setUnits(e.target.value)} className="glass" style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'white', outline: 'none' }}>
                            <option value="metric">Metric (kg, cm)</option>
                            <option value="imperial">Imperial (lb, in)</option>
                        </select>
                    )
                }
            ]
        },
        {
            title: 'Connection & Storage',
            icon: Globe,
            settings: [
                {
                    label: 'Default Protocol', description: 'Preferred method for device pairing.', component: (
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Bluetooth LE</span>
                    )
                },
                {
                    label: 'Data Logging', description: 'Automatic syncing to encrypted cloud storage.', component: (
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Cloud Sync (Active)</span>
                    )
                }
            ]
        },
        {
            title: 'AI Configuration',
            icon: Brain,
            settings: [
                {
                    label: 'OpenRouter API Key', description: 'Required for AI reports and chat. Get one at openrouter.ai/keys', component: (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => { setApiKey(e.target.value); setKeySaved(false); }}
                                placeholder="sk-or-..."
                                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', width: 260, outline: 'none', fontFamily: 'monospace', fontSize: '0.85rem' }}
                            />
                            <button
                                onClick={() => { localStorage.setItem(OPENROUTER_KEY_STORAGE, apiKey); setKeySaved(true); setTimeout(() => setKeySaved(false), 2000); }}
                                className="glass"
                                style={{ padding: '8px 16px', borderRadius: '8px', border: keySaved ? '1px solid #10b981' : '1px solid var(--border-color)', color: keySaved ? '#10b981' : 'var(--primary-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                            >
                                <Key size={14} /> {keySaved ? 'Saved!' : 'Save'}
                            </button>
                        </div>
                    )
                },
                {
                    label: 'AI Model', description: 'OpenRouter model for reports and chat.', component: (
                        <select
                            value={model}
                            onChange={(e) => { setModel(e.target.value); localStorage.setItem(OPENROUTER_MODEL_STORAGE, e.target.value); }}
                            className="glass"
                            style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'white', outline: 'none', minWidth: 220 }}
                        >
                            <option value="google/gemini-2.0-flash-001">Gemini 2.0 Flash</option>
                            <option value="google/gemini-2.5-pro-preview">Gemini 2.5 Pro</option>
                            <option value="anthropic/claude-sonnet-4">Claude Sonnet 4</option>
                            <option value="anthropic/claude-3.5-haiku">Claude 3.5 Haiku</option>
                            <option value="openai/gpt-4o-mini">GPT-4o Mini</option>
                            <option value="openai/gpt-4o">GPT-4o</option>
                            <option value="x-ai/grok-4.1-fast">Grok 4.1 Fast</option>
                            <option value="deepseek/deepseek-r1">DeepSeek R1</option>
                            <option value="meta-llama/llama-4-maverick">Llama 4 Maverick</option>
                        </select>
                    )
                }
            ]
        },
        {
            title: 'Data Management',
            icon: Database,
            settings: [
                {
                    label: 'Local Cache', description: 'Clear temporary sensor data from this browser.', component: (
                        <button className="glass" style={{ padding: '8px 12px', borderRadius: '8px', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Trash2 size={14} /> Clear Cache
                        </button>
                    )
                },
                {
                    label: 'Export All Data', description: 'Download a full archive of all patient records.', component: (
                        <button className="glass" style={{ padding: '8px 12px', borderRadius: '8px', color: 'var(--primary-color)', border: '1px solid rgba(0, 210, 255, 0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Download size={14} /> Export Archive
                        </button>
                    )
                }
            ]
        }
    ];

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="page-transition"
            style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '1000px' }}
        >
            <header style={{ marginBottom: '40px' }}>
                <h1 className="glowing-heading" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Settings</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Manage your application preferences and data security.</p>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {sections.map((section, idx) => (
                    <div key={idx} className="glass" style={{ borderRadius: '24px', overflow: 'hidden' }}>
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.02)' }}>
                            <section.icon size={20} color="var(--primary-color)" />
                            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{section.title}</h3>
                        </div>
                        <div style={{ padding: '12px 24px' }}>
                            {section.settings.map((item, sIdx) => (
                                <div key={sIdx} style={{
                                    padding: '20px 0',
                                    borderBottom: sIdx === section.settings.length - 1 ? 'none' : '1px solid var(--border-color)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <span style={{ fontWeight: 600 }}>{item.label}</span>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>{item.description}</span>
                                    </div>
                                    <div>{item.component}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                <div className="glass" style={{ padding: '24px', borderRadius: '24px', display: 'flex', gap: '20px', alignItems: 'center', border: '1px solid var(--primary-glow)' }}>
                    <div style={{ width: 64, height: 64, borderRadius: '16px', background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Layers size={32} color="var(--primary-color)" />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h4 style={{ fontWeight: 600 }}>Anebilin Suite - Professional v1.2.0</h4>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                            Build 2024.05.20.1 • Authorized for Medical Use only.
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                        <Shield size={16} /> Privacy Policy • Terms
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default Settings;
