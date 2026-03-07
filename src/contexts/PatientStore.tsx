import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// ========================================================================
// Patient & Recording History — persisted in localStorage
// ========================================================================

export interface Patient {
    id: string;
    name: string;
    age: number;
    sex: 'Male' | 'Female' | 'Other';
    createdAt: string;
}

export interface RecordingEntry {
    id: string;
    patientId: string;
    patientName: string;
    timestamp: string;              // ISO string
    biomarkers: Record<string, number | undefined>;
}

interface PatientStoreContextType {
    patients: Patient[];
    recordings: RecordingEntry[];
    addPatient: (p: Omit<Patient, 'id' | 'createdAt'>) => Patient;
    updatePatient: (id: string, data: Partial<Omit<Patient, 'id' | 'createdAt'>>) => void;
    saveRecording: (patientId: string, biomarkers: Record<string, number | undefined>) => void;
    getRecordingsForPatient: (patientId: string) => RecordingEntry[];
    deletePatient: (id: string) => void;
    deleteRecording: (id: string) => void;
}

const PATIENTS_KEY = 'spectru_patients';
const RECORDINGS_KEY = 'spectru_recordings';

const PatientStoreContext = createContext<PatientStoreContextType | null>(null);

export const usePatientStore = () => {
    const ctx = useContext(PatientStoreContext);
    if (!ctx) throw new Error('usePatientStore must be inside PatientStoreProvider');
    return ctx;
};

function loadJSON<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
}

export const PatientStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [patients, setPatients] = useState<Patient[]>(() => loadJSON(PATIENTS_KEY, []));
    const [recordings, setRecordings] = useState<RecordingEntry[]>(() => loadJSON(RECORDINGS_KEY, []));

    useEffect(() => { localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients)); }, [patients]);
    useEffect(() => { localStorage.setItem(RECORDINGS_KEY, JSON.stringify(recordings)); }, [recordings]);

    const addPatient = useCallback((p: Omit<Patient, 'id' | 'createdAt'>): Patient => {
        const newP: Patient = {
            ...p,
            id: `P-${Date.now().toString(36).toUpperCase()}`,
            createdAt: new Date().toISOString(),
        };
        setPatients(prev => [newP, ...prev]);
        return newP;
    }, []);

    const updatePatient = useCallback((id: string, data: Partial<Omit<Patient, 'id' | 'createdAt'>>) => {
        setPatients(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    }, []);

    const saveRecording = useCallback((patientId: string, biomarkers: Record<string, number | undefined>) => {
        const patient = patients.find(p => p.id === patientId);
        const entry: RecordingEntry = {
            id: `R-${Date.now().toString(36).toUpperCase()}`,
            patientId,
            patientName: patient?.name ?? 'Unknown',
            timestamp: new Date().toISOString(),
            biomarkers,
        };
        setRecordings(prev => [entry, ...prev]);
    }, [patients]);

    const getRecordingsForPatient = useCallback((patientId: string) => {
        return recordings.filter(r => r.patientId === patientId);
    }, [recordings]);

    const deletePatient = useCallback((id: string) => {
        setPatients(prev => prev.filter(p => p.id !== id));
        setRecordings(prev => prev.filter(r => r.patientId !== id));
    }, []);

    const deleteRecording = useCallback((id: string) => {
        setRecordings(prev => prev.filter(r => r.id !== id));
    }, []);

    return (
        <PatientStoreContext.Provider value={{ patients, recordings, addPatient, updatePatient, saveRecording, getRecordingsForPatient, deletePatient, deleteRecording }}>
            {children}
        </PatientStoreContext.Provider>
    );
};
