import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Search,
    UserPlus,
    Trash2,
    Edit3,
    Check,
    X,
    User,
    Calendar,
    FileText
} from 'lucide-react';
import { usePatientStore } from '../contexts/PatientStore';
import type { Patient } from '../contexts/PatientStore';

const PatientManagement: React.FC = () => {
    const { patients, recordings, addPatient, updatePatient, deletePatient, deleteRecording } = usePatientStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newAge, setNewAge] = useState('');
    const [newSex, setNewSex] = useState<'Male' | 'Female' | 'Other'>('Male');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editAge, setEditAge] = useState('');
    const [editSex, setEditSex] = useState<'Male' | 'Female' | 'Other'>('Male');
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const filteredPatients = useMemo(() =>
        patients.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())),
        [patients, searchQuery]
    );

    const recordingCountMap = useMemo(() => {
        const m = new Map<string, number>();
        for (const r of recordings) {
            m.set(r.patientId, (m.get(r.patientId) ?? 0) + 1);
        }
        return m;
    }, [recordings]);

    const handleAddPatient = () => {
        if (!newName.trim()) return;
        addPatient({ name: newName.trim(), age: parseInt(newAge) || 0, sex: newSex });
        setNewName(''); setNewAge(''); setNewSex('Male'); setShowAddForm(false);
    };

    const startEdit = (p: Patient) => {
        setEditingId(p.id); setEditName(p.name); setEditAge(String(p.age || '')); setEditSex(p.sex as any);
    };

    const saveEdit = () => {
        if (!editingId || !editName.trim()) return;
        updatePatient(editingId, { name: editName.trim(), age: parseInt(editAge) || 0, sex: editSex });
        setEditingId(null);
    };

    const handleDelete = (id: string) => {
        deletePatient(id);
        // Delete all recordings for this patient
        recordings.filter(r => r.patientId === id).forEach(r => deleteRecording(r.id));
        setConfirmDeleteId(null);
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="page-transition bg-mesh-animated"
            style={{ display: 'flex', flexDirection: 'column', gap: '24px', borderRadius: '24px', padding: '12px' }}
        >
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1 className="glowing-heading" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Patient Management</h1>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, background: 'var(--primary-color)', color: 'black', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                >
                    <UserPlus size={18} /> Add Patient
                </button>
            </header>

            {/* Add Form */}
            {showAddForm && (
                <div className="glass" style={{ padding: 20, borderRadius: 16, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 2, minWidth: 150 }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Name</label>
                        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full name"
                            style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)', outline: 'none' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 80 }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Age</label>
                        <input value={newAge} onChange={e => setNewAge(e.target.value)} type="number" placeholder="Age"
                            style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)', outline: 'none' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 100 }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Sex</label>
                        <select value={newSex} onChange={e => setNewSex(e.target.value as any)}
                            style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)', outline: 'none' }}>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <button onClick={handleAddPatient}
                        style={{ padding: '10px 24px', borderRadius: 8, background: 'var(--success-color)', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                        Save
                    </button>
                </div>
            )}

            {/* Search */}
            <div className="glass" style={{ padding: 12, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                <Search size={18} color="var(--text-tertiary)" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search patients..."
                    style={{ flex: 1, padding: 8, border: 'none', background: 'transparent', color: 'var(--text-primary)', outline: 'none', fontSize: '0.95rem' }} />
            </div>

            {/* Patient Cards */}
            {filteredPatients.length === 0 ? (
                <div className="glass" style={{ padding: 60, borderRadius: 20, textAlign: 'center', color: 'var(--text-tertiary)' }}>
                    <User size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
                    <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>No patients found</p>
                    <p style={{ fontSize: '0.85rem', marginTop: 8 }}>Click "Add Patient" to create one.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {filteredPatients.map(p => {
                        const recCount = recordingCountMap.get(p.id) ?? 0;
                        const isEditing = editingId === p.id;
                        return (
                            <div key={p.id} className="glass" style={{ padding: '16px 24px', borderRadius: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                                {isEditing ? (
                                    <div style={{ display: 'flex', gap: 10, flex: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                                        <input value={editName} onChange={e => setEditName(e.target.value)}
                                            style={{ padding: 8, borderRadius: 6, border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)', outline: 'none', flex: 2, minWidth: 120 }} />
                                        <input value={editAge} onChange={e => setEditAge(e.target.value)} type="number" placeholder="Age"
                                            style={{ padding: 8, borderRadius: 6, border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)', outline: 'none', width: 60 }} />
                                        <select value={editSex} onChange={e => setEditSex(e.target.value as any)}
                                            style={{ padding: 8, borderRadius: 6, border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)', outline: 'none' }}>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                        <button onClick={saveEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4ade80', padding: 4 }}><Check size={18} /></button>
                                        <button onClick={() => setEditingId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4 }}><X size={18} /></button>
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{p.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: 4, display: 'flex', gap: 16 }}>
                                                {p.age > 0 && <span>{p.age}y / {p.sex}</span>}
                                                <span><FileText size={12} style={{ verticalAlign: 'middle' }} /> {recCount} recording{recCount !== 1 ? 's' : ''}</span>
                                                <span><Calendar size={12} style={{ verticalAlign: 'middle' }} /> {new Date(p.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button onClick={() => startEdit(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 6 }} title="Edit">
                                                <Edit3 size={16} />
                                            </button>
                                            {confirmDeleteId === p.id ? (
                                                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.75rem', color: '#f87171' }}>Delete?</span>
                                                    <button onClick={() => handleDelete(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 4 }}><Check size={16} /></button>
                                                    <button onClick={() => setConfirmDeleteId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4 }}><X size={16} /></button>
                                                </div>
                                            ) : (
                                                <button onClick={() => setConfirmDeleteId(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 6 }} title="Delete">
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </motion.div>
    );
};

export default PatientManagement;