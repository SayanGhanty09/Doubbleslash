import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Search,
    UserPlus,
    MoreVertical,
    Filter,
    FileText,
    UserCheck,
    RefreshCw
} from 'lucide-react';
import { usePatient } from '../components/layout/Shell';

const PatientManagement: React.FC = () => {
    const { activePatient, setActivePatient } = usePatient();
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [patients, setPatients] = useState<any[]>([]);
    
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

    // --- FETCH DATA FROM BACKEND ---
    const fetchPatients = async () => {
        setIsLoading(true);
        try {
            const response = await fetch("http://127.0.0.1:8000/patients/all");
            const result = await response.json();
            if (result.status === "success") {
                setPatients(result.records);
            }
        } catch (error) {
            console.error("Error fetching patients:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPatients();
    }, []);

    const handleSavePatient = () => {
        if (!newPatient.firstName || !newPatient.lastName) {
            alert("Please provide at least a first and last name.");
            return;
        }
        // For now, this still updates local state as per your original logic
        const addedPatient = {
            id: `NEW-${Math.floor(Math.random() * 1000)}`,
            name: `${newPatient.firstName} ${newPatient.lastName}`,
            score: "N/A",
            status: "Permanent",
            email: "manual@entry.com"
        };

        setPatients([addedPatient, ...patients]);
        setActivePatient(addedPatient.name);
        alert(`Patient ${addedPatient.name} saved successfully!`);
        setNewPatient({ firstName: "", lastName: "", age: "", sex: "Male", weight: "", height: "", conditions: "", notes: "" });
    };

    const filteredPatients = patients.filter(p =>
        (p.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (p.id?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (p.email?.toLowerCase() || "").includes(searchQuery.toLowerCase())
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
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={fetchPatients} className="glass" style={{ padding: '10px', borderRadius: '10px', color: 'white', cursor: 'pointer', border: '1px solid var(--border-color)' }}>
                        <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
                    </button>
                    <button className="btn-shimmer" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', background: 'var(--primary-color)', color: 'black', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                        <UserPlus size={18} />
                        Add New Patient
                    </button>
                </div>
            </header>

            <div className="glass hover-lift-glow" style={{ padding: '16px', borderRadius: '16px', display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                    <input
                        type="text"
                        placeholder="Search by name, ID, or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outline: 'none' }}
                    />
                </div>
                <button className="glass hover-lift-glow" style={{ padding: '10px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <Filter size={18} />
                    Filters
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'start' }}>
                {/* Updated Table to show Backend Data */}
                <div className="glass hover-lift-glow" style={{ borderRadius: '16px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
                                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Patient ID</th>
                                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Name / Email</th>
                                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Health Score</th>
                                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Status</th>
                                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>Syncing with Health DB...</td></tr>
                            ) : filteredPatients.map((patient) => (
                                <tr
                                    key={patient.id}
                                    style={{
                                        borderBottom: '1px solid var(--border-color)',
                                        background: activePatient === patient.name ? 'rgba(0, 210, 255, 0.05)' : 'transparent',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => setActivePatient(patient.name)}
                                >
                                    <td style={{ padding: '16px', fontFamily: 'Roboto Mono', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                        {patient.id.slice(-6).toUpperCase()}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ fontWeight: 600 }}>{patient.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{patient.email || "No Email"}</div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <span style={{ 
                                            color: patient.score >= 7 ? '#4ade80' : patient.score >= 5 ? '#fbbf24' : '#f87171',
                                            fontWeight: 'bold' 
                                        }}>
                                            {patient.score} / 10
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <span style={{ 
                                            fontSize: '0.7rem', 
                                            padding: '4px 8px', 
                                            borderRadius: '20px', 
                                            background: patient.status === 'Permanent' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                                            color: patient.status === 'Permanent' ? '#4ade80' : '#fbbf24',
                                            border: `1px solid ${patient.status === 'Permanent' ? '#4ade80' : '#fbbf24'}`
                                        }}>
                                            {patient.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <UserCheck size={18} color={activePatient === patient.name ? 'var(--primary-color)' : 'var(--text-tertiary)'} />
                                            <FileText size={18} color="var(--text-tertiary)" />
                                            <MoreVertical size={18} color="var(--text-tertiary)" />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Quick Add Panel (Kept your exact design) */}
                <div className="glass card-glow hover-lift-glow" style={{ padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>New Patient Profile</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>First Name</label>
                                <input type="text" className="glass" value={newPatient.firstName} onChange={(e) => setNewPatient({ ...newPatient, firstName: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Last Name</label>
                                <input type="text" className="glass" value={newPatient.lastName} onChange={(e) => setNewPatient({ ...newPatient, lastName: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }} />
                            </div>
                        </div>
                        <button className="btn-shimmer" onClick={handleSavePatient} style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'var(--secondary-color)', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', marginTop: '8px' }}>
                            Save Patient Profile
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default PatientManagement;