import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Search,
    UserPlus,
    MoreVertical,
    Filter,
    FileText,
    UserCheck
} from 'lucide-react';
import { usePatient } from '../components/layout/Shell';

const PatientManagement: React.FC = () => {
    const { activePatient, setActivePatient } = usePatient();
    const [searchQuery, setSearchQuery] = useState("");
    const [newPatient, setNewPatient] = useState({
        firstName: "",
        lastName: "",
        age: "",
        sex: "Male",
        weight: "",
        height: "",
        conditions: "",
        notes: ""
    });

    const [patients, setPatients] = useState([
        { id: 'P-1001', name: 'John Doe', age: 45, sex: 'Male', lastVisit: '2024-05-20', condition: 'Hypertension' },
        { id: 'P-1002', name: 'Jane Smith', age: 32, sex: 'Female', lastVisit: '2024-05-18', condition: 'Arrhythmia' },
        { id: 'P-1003', name: 'Robert Brown', age: 62, sex: 'Male', lastVisit: '2024-05-10', condition: 'Post-Surgery' },
        { id: 'P-1004', name: 'Sarah Wilson', age: 28, sex: 'Female', lastVisit: '2024-05-05', condition: 'Normal' },
    ]);

    const handleSavePatient = () => {
        if (!newPatient.firstName || !newPatient.lastName) {
            alert("Please provide at least a first and last name.");
            return;
        }

        const nextId = `P-${1000 + patients.length + 1}`;
        const addedPatient = {
            id: nextId,
            name: `${newPatient.firstName} ${newPatient.lastName}`,
            age: parseInt(newPatient.age) || 0,
            sex: newPatient.sex,
            lastVisit: new Date().toISOString().split('T')[0],
            condition: newPatient.conditions || 'New Patient'
        };

        setPatients([...patients, addedPatient]);
        setActivePatient(addedPatient.name);

        console.log("Saving patient:", addedPatient);
        alert(`Patient ${addedPatient.name} saved successfully!`);

        // Reset form
        setNewPatient({
            firstName: "",
            lastName: "",
            age: "",
            sex: "Male",
            weight: "",
            height: "",
            conditions: "",
            notes: ""
        });
    };

    const filteredPatients = patients.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="page-transition bg-mesh-animated"
            style={{ display: 'flex', flexDirection: 'column', gap: '24px', borderRadius: '24px', padding: '12px' }}
        >
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <h1 className="glowing-heading" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Patient Database</h1>
                <button className="btn-shimmer" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 18px',
                    borderRadius: '10px',
                    background: 'var(--primary-color)',
                    color: 'black',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer'
                }}>
                    <UserPlus size={18} />
                    Add New Patient
                </button>
            </header>

            {/* Search and Filters */}
            <div className="glass hover-lift-glow" style={{ padding: '16px', borderRadius: '16px', display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                    <input
                        type="text"
                        placeholder="Search by name or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px 12px 12px 40px',
                            borderRadius: '10px',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            outline: 'none'
                        }}
                    />
                </div>
                <button className="glass hover-lift-glow" style={{ padding: '10px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <Filter size={18} />
                    Filters
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'start' }}>
                {/* Patient Table */}
                <div className="glass hover-lift-glow" style={{ borderRadius: '16px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
                                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Patient ID</th>
                                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Name</th>
                                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Age / Sex</th>
                                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Last Visit</th>
                                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPatients.map((patient) => (
                                <tr
                                    key={patient.id}
                                    style={{
                                        borderBottom: '1px solid var(--border-color)',
                                        background: activePatient === patient.name ? 'rgba(0, 210, 255, 0.05)' : 'transparent',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => setActivePatient(patient.name)}
                                >
                                    <td style={{ padding: '16px', fontFamily: 'Roboto Mono', fontSize: '0.875rem' }}>{patient.id}</td>
                                    <td style={{ padding: '16px', fontWeight: 600 }}>{patient.name}</td>
                                    <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{patient.age} / {patient.sex}</td>
                                    <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{patient.lastVisit}</td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <UserCheck
                                                size={18}
                                                color={activePatient === patient.name ? 'var(--primary-color)' : 'var(--text-tertiary)'}
                                            />
                                            <FileText size={18} color="var(--text-tertiary)" />
                                            <MoreVertical size={18} color="var(--text-tertiary)" />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Quick Add / Info Panel */}
                <div className="glass card-glow hover-lift-glow" style={{ padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>New Patient Profile</h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>First Name</label>
                                <input
                                    type="text"
                                    className="glass"
                                    value={newPatient.firstName}
                                    onChange={(e) => setNewPatient({ ...newPatient, firstName: e.target.value })}
                                    style={{ width: '100%', minWidth: 0, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Last Name</label>
                                <input
                                    type="text"
                                    className="glass"
                                    value={newPatient.lastName}
                                    onChange={(e) => setNewPatient({ ...newPatient, lastName: e.target.value })}
                                    style={{ width: '100%', minWidth: 0, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Age</label>
                                <input
                                    type="number"
                                    className="glass"
                                    value={newPatient.age}
                                    onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
                                    style={{ width: '100%', minWidth: 0, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Sex</label>
                                <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                    {['Male', 'Female'].map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setNewPatient({ ...newPatient, sex: s })}
                                            style={{
                                                flex: 1,
                                                padding: '6px',
                                                borderRadius: '6px',
                                                border: 'none',
                                                background: newPatient.sex === s ? 'var(--primary-color)' : 'transparent',
                                                color: newPatient.sex === s ? 'black' : 'var(--text-secondary)',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Weight (kg)</label>
                                <input
                                    type="number"
                                    className="glass"
                                    value={newPatient.weight}
                                    onChange={(e) => setNewPatient({ ...newPatient, weight: e.target.value })}
                                    style={{ width: '100%', minWidth: 0, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Height (cm)</label>
                                <input
                                    type="number"
                                    className="glass"
                                    value={newPatient.height}
                                    onChange={(e) => setNewPatient({ ...newPatient, height: e.target.value })}
                                    style={{ width: '100%', minWidth: 0, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Medical Tags / Conditions</label>
                            <input
                                type="text"
                                placeholder="e.g. Hypertension, Diabetes"
                                className="glass"
                                value={newPatient.conditions}
                                onChange={(e) => setNewPatient({ ...newPatient, conditions: e.target.value })}
                                style={{ width: '100%', minWidth: 0, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Clinical Notes</label>
                            <textarea
                                className="glass"
                                rows={4}
                                value={newPatient.notes}
                                onChange={(e) => setNewPatient({ ...newPatient, notes: e.target.value })}
                                style={{ width: '100%', minWidth: 0, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', resize: 'none' }}
                            />
                        </div>

                        <button className="btn-shimmer" onClick={handleSavePatient} style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '10px',
                            background: 'var(--secondary-color)',
                            color: 'white',
                            border: 'none',
                            fontWeight: 600,
                            cursor: 'pointer',
                            marginTop: '8px'
                        }}>
                            Save Patient Profile
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default PatientManagement;
