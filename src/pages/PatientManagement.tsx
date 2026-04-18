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
    FileText,
    MapPin,
    Loader2,
    AlertCircle,
    Map as MapIcon,
    Locate,
} from 'lucide-react';
import { usePatientStore, type Patient } from '../contexts/PatientStore';
import HeatmapComponent from '../components/HeatmapComponent';
import { reverseGeocode } from '../utils/reverseGeocode';

const PatientManagement: React.FC = () => {
    const { patients, recordings, addPatient, updatePatient, deletePatient, deleteRecording, loading, error } = usePatientStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [showHeatmap, setShowHeatmap] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLocatingAdd, setIsLocatingAdd] = useState(false);
    const [isLocatingEdit, setIsLocatingEdit] = useState(false);
    const [isGeocodingAdd, setIsGeocodingAdd] = useState(false);
    const [isGeocodingEdit, setIsGeocodingEdit] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);

    // Add form state
    const [newName, setNewName] = useState('');
    const [newAge, setNewAge] = useState('');
    const [newSex, setNewSex] = useState<'Male' | 'Female' | 'Other'>('Male');
    const [newLatitude, setNewLatitude] = useState('');
    const [newLongitude, setNewLongitude] = useState('');
    const [newState, setNewState] = useState('');
    const [newCity, setNewCity] = useState('');

    // Edit form state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editAge, setEditAge] = useState('');
    const [editSex, setEditSex] = useState<'Male' | 'Female' | 'Other'>('Male');
    const [editLatitude, setEditLatitude] = useState('');
    const [editLongitude, setEditLongitude] = useState('');
    const [editState, setEditState] = useState('');
    const [editCity, setEditCity] = useState('');

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

    const geocodeCoordinates = async (lat: number, lon: number, target: 'add' | 'edit') => {
        if (target === 'add') setIsGeocodingAdd(true);
        else setIsGeocodingEdit(true);

        try {
            const result = await reverseGeocode(lat, lon);
            if (result) {
                if (target === 'add') {
                    setNewState(result.state);
                    setNewCity(result.city);
                } else {
                    setEditState(result.state);
                    setEditCity(result.city);
                }
            }
        } catch (err) {
            console.error('Reverse geocoding failed:', err);
        } finally {
            if (target === 'add') setIsGeocodingAdd(false);
            else setIsGeocodingEdit(false);
        }
    };

    const requestAccurateLocation = async (target: 'add' | 'edit') => {
        setLocationError(null);

        if (!('geolocation' in navigator)) {
            setLocationError('Geolocation is not supported by this browser.');
            return;
        }

        if (target === 'add') setIsLocatingAdd(true);
        else setIsLocatingEdit(true);

        try {
            if ('permissions' in navigator && navigator.permissions?.query) {
                const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
                if (permission.state === 'denied') {
                    setLocationError('Location permission is blocked. Please enable location access in browser settings.');
                    return;
                }
            }

            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    maximumAge: 0,
                    timeout: 15000,
                });
            });

            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            if (target === 'add') {
                setNewLatitude(lat.toFixed(6));
                setNewLongitude(lon.toFixed(6));
                // Auto-fill state and city
                await geocodeCoordinates(lat, lon, 'add');
            } else {
                setEditLatitude(lat.toFixed(6));
                setEditLongitude(lon.toFixed(6));
                // Auto-fill state and city
                await geocodeCoordinates(lat, lon, 'edit');
            }
        } catch (err) {
            const geoError = err as GeolocationPositionError;
            if (geoError?.code === 1) {
                setLocationError('Location permission denied. Please allow location access to auto-fill coordinates.');
            } else if (geoError?.code === 2) {
                setLocationError('Location unavailable. Make sure GPS/location services are enabled.');
            } else if (geoError?.code === 3) {
                setLocationError('Location request timed out. Try again in an open area for better GPS accuracy.');
            } else {
                setLocationError('Unable to fetch location. Please enter coordinates manually.');
            }
        } finally {
            if (target === 'add') setIsLocatingAdd(false);
            else setIsLocatingEdit(false);
        }
    };

    const handleAddPatient = async () => {
        if (!newName.trim()) return;
        setIsSubmitting(true);
        
        await addPatient({
            name: newName.trim(),
            age: parseInt(newAge) || 0,
            sex: newSex,
            latitude: newLatitude ? parseFloat(newLatitude) : undefined,
            longitude: newLongitude ? parseFloat(newLongitude) : undefined,
            state: newState || undefined,
            city: newCity || undefined,
        });
        
        setNewName('');
        setNewAge('');
        setNewSex('Male');
        setNewLatitude('');
        setNewLongitude('');
        setNewState('');
        setNewCity('');
        setShowAddForm(false);
        setIsSubmitting(false);
    };

    const startEdit = (p: Patient) => {
        setEditingId(p.id);
        setEditName(p.name);
        setEditAge(String(p.age || ''));
        setEditSex(p.sex);
        setEditLatitude(p.latitude?.toString() || '');
        setEditLongitude(p.longitude?.toString() || '');
        setEditState(p.state || '');
        setEditCity(p.city || '');
    };

    const saveEdit = async () => {
        if (!editingId || !editName.trim()) return;
        setIsSubmitting(true);
        
        await updatePatient(editingId, {
            name: editName.trim(),
            age: parseInt(editAge) || 0,
            sex: editSex,
            latitude: editLatitude ? parseFloat(editLatitude) : undefined,
            longitude: editLongitude ? parseFloat(editLongitude) : undefined,
            state: editState || undefined,
            city: editCity || undefined,
        });
        
        setEditingId(null);
        setIsSubmitting(false);
    };

    const handleDelete = async (id: string) => {
        setIsSubmitting(true);
        
        // Delete all recordings for this patient
        const patientRecordings = recordings.filter(r => r.patientId === id);
        for (const r of patientRecordings) {
            await deleteRecording(r.id);
        }
        
        await deletePatient(id);
        setConfirmDeleteId(null);
        setIsSubmitting(false);
    };

    if (loading) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '60vh',
                    gap: '16px',
                }}
            >
                <Loader2 size={32} className="animate-spin" />
                <p style={{ color: 'var(--text-secondary)' }}>Loading patient data...</p>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="page-transition bg-mesh-animated"
            style={{ display: 'flex', flexDirection: 'column', gap: '24px', borderRadius: '24px', padding: '12px' }}
        >
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <h1 className="glowing-heading" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Patient Management</h1>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => setShowHeatmap(!showHeatmap)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '10px 18px',
                            borderRadius: 10,
                            background: showHeatmap ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)',
                            color: 'white',
                            border: 'none',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        <MapIcon size={18} /> {showHeatmap ? 'Hide' : 'View'} Heatmap
                    </button>
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '10px 18px',
                            borderRadius: 10,
                            background: 'var(--primary-color)',
                            color: 'black',
                            border: 'none',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        <UserPlus size={18} /> Add Patient
                    </button>
                </div>
            </header>

            {/* Error message */}
            {error && (
                <div style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid #f87171',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                    color: '#fca5a5',
                }}>
                    <AlertCircle size={18} />
                    <span>{error}</span>
                </div>
            )}

            {/* Heatmap */}
            {showHeatmap && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="glass"
                    style={{ padding: '16px', borderRadius: '16px' }}
                >
                    <HeatmapComponent />
                </motion.div>
            )}

            {/* Add Form */}
            {showAddForm && (
                <div className="glass" style={{ padding: 20, borderRadius: 16, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 2, minWidth: 150 }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Name *</label>
                        <input
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            placeholder="Full name"
                            disabled={isSubmitting}
                            style={{
                                padding: 10,
                                borderRadius: 8,
                                border: '1px solid var(--border-color)',
                                background: 'rgba(255,255,255,0.03)',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                opacity: isSubmitting ? 0.6 : 1,
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 80 }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Age</label>
                        <input
                            value={newAge}
                            onChange={e => setNewAge(e.target.value)}
                            type="number"
                            placeholder="Age"
                            disabled={isSubmitting}
                            style={{
                                padding: 10,
                                borderRadius: 8,
                                border: '1px solid var(--border-color)',
                                background: 'rgba(255,255,255,0.03)',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                opacity: isSubmitting ? 0.6 : 1,
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 100 }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Sex</label>
                        <select
                            value={newSex}
                            onChange={e => setNewSex(e.target.value as any)}
                            disabled={isSubmitting}
                            style={{
                                padding: 10,
                                borderRadius: 8,
                                border: '1px solid var(--border-color)',
                                background: 'rgba(255,255,255,0.03)',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                opacity: isSubmitting ? 0.6 : 1,
                            }}
                        >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 80 }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Latitude</label>
                        <input
                            value={newLatitude}
                            onChange={e => setNewLatitude(e.target.value)}
                            type="number"
                            step="0.0001"
                            placeholder="e.g., 28.7041"
                            disabled={isSubmitting}
                            style={{
                                padding: 10,
                                borderRadius: 8,
                                border: '1px solid var(--border-color)',
                                background: 'rgba(255,255,255,0.03)',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                opacity: isSubmitting ? 0.6 : 1,
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 80 }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Longitude</label>
                        <input
                            value={newLongitude}
                            onChange={e => setNewLongitude(e.target.value)}
                            type="number"
                            step="0.0001"
                            placeholder="e.g., 77.1025"
                            disabled={isSubmitting}
                            style={{
                                padding: 10,
                                borderRadius: 8,
                                border: '1px solid var(--border-color)',
                                background: 'rgba(255,255,255,0.03)',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                opacity: isSubmitting ? 0.6 : 1,
                            }}
                        />
                    </div>
                    <button
                        onClick={() => requestAccurateLocation('add')}
                        disabled={isSubmitting || isLocatingAdd}
                        style={{
                            padding: '10px 14px',
                            borderRadius: 8,
                            background: 'rgba(59,130,246,0.15)',
                            color: '#93c5fd',
                            border: '1px solid rgba(147,197,253,0.35)',
                            fontWeight: 600,
                            cursor: (isSubmitting || isLocatingAdd) ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            opacity: (isSubmitting || isLocatingAdd) ? 0.7 : 1,
                        }}
                    >
                        {isLocatingAdd ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
                        {isLocatingAdd ? 'Requesting...' : 'Use Current Location (Accurate)'}
                    </button>
                    <button
                        onClick={() => {
                            const lat = parseFloat(newLatitude);
                            const lon = parseFloat(newLongitude);
                            if (!isNaN(lat) && !isNaN(lon)) {
                                geocodeCoordinates(lat, lon, 'add');
                            } else {
                                setLocationError('Please enter valid latitude and longitude first.');
                            }
                        }}
                        disabled={isSubmitting || isGeocodingAdd || !newLatitude || !newLongitude}
                        style={{
                            padding: '10px 14px',
                            borderRadius: 8,
                            background: 'rgba(34,197,94,0.15)',
                            color: '#86efac',
                            border: '1px solid rgba(134,239,172,0.35)',
                            fontWeight: 600,
                            cursor: (isSubmitting || isGeocodingAdd || !newLatitude || !newLongitude) ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            opacity: (isSubmitting || isGeocodingAdd) ? 0.7 : !newLatitude || !newLongitude ? 0.5 : 1,
                        }}
                    >
                        {isGeocodingAdd ? <Loader2 size={16} className="animate-spin" /> : <Locate size={16} />}
                        {isGeocodingAdd ? 'Finding...' : 'Find State & City'}
                    </button>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 80 }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>State</label>
                        <input
                            value={newState}
                            onChange={e => setNewState(e.target.value)}
                            placeholder="e.g., Delhi"
                            disabled={isSubmitting}
                            style={{
                                padding: 10,
                                borderRadius: 8,
                                border: '1px solid var(--border-color)',
                                background: 'rgba(255,255,255,0.03)',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                opacity: isSubmitting ? 0.6 : 1,
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 80 }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>City</label>
                        <input
                            value={newCity}
                            onChange={e => setNewCity(e.target.value)}
                            placeholder="City name"
                            disabled={isSubmitting}
                            style={{
                                padding: 10,
                                borderRadius: 8,
                                border: '1px solid var(--border-color)',
                                background: 'rgba(255,255,255,0.03)',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                opacity: isSubmitting ? 0.6 : 1,
                            }}
                        />
                    </div>
                    <button
                        onClick={handleAddPatient}
                        disabled={isSubmitting || !newName.trim()}
                        style={{
                            padding: '10px 24px',
                            borderRadius: 8,
                            background: isSubmitting ? 'rgba(34,197,94,0.5)' : 'var(--success-color)',
                            color: 'white',
                            border: 'none',
                            fontWeight: 600,
                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            opacity: isSubmitting ? 0.7 : 1,
                        }}
                    >
                        {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                        Save
                    </button>
                    {locationError && (
                        <div style={{
                            width: '100%',
                            marginTop: '8px',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.35)',
                            color: '#fca5a5',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                        }}>
                            <AlertCircle size={16} />
                            <span>{locationError}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Search */}
            <div className="glass" style={{ padding: 12, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                <Search size={18} color="var(--text-tertiary)" />
                <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search patients..."
                    style={{
                        flex: 1,
                        padding: 8,
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--text-primary)',
                        outline: 'none',
                        fontSize: '0.95rem',
                    }}
                />
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
                            <div key={p.id} className="glass" style={{ padding: '16px 24px', borderRadius: 14, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {isEditing ? (
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                        <div style={{ display: 'flex', gap: 8, flex: 1, minWidth: '100%', flexWrap: 'wrap' }}>
                                            <input
                                                value={editName}
                                                onChange={e => setEditName(e.target.value)}
                                                disabled={isSubmitting}
                                                style={{
                                                    padding: 8,
                                                    borderRadius: 6,
                                                    border: '1px solid var(--border-color)',
                                                    background: 'rgba(255,255,255,0.03)',
                                                    color: 'var(--text-primary)',
                                                    outline: 'none',
                                                    flex: 2,
                                                    minWidth: 120,
                                                    opacity: isSubmitting ? 0.6 : 1,
                                                }}
                                            />
                                            <input
                                                value={editAge}
                                                onChange={e => setEditAge(e.target.value)}
                                                type="number"
                                                placeholder="Age"
                                                disabled={isSubmitting}
                                                style={{
                                                    padding: 8,
                                                    borderRadius: 6,
                                                    border: '1px solid var(--border-color)',
                                                    background: 'rgba(255,255,255,0.03)',
                                                    color: 'var(--text-primary)',
                                                    outline: 'none',
                                                    width: 60,
                                                    opacity: isSubmitting ? 0.6 : 1,
                                                }}
                                            />
                                            <select
                                                value={editSex}
                                                onChange={e => setEditSex(e.target.value as any)}
                                                disabled={isSubmitting}
                                                style={{
                                                    padding: 8,
                                                    borderRadius: 6,
                                                    border: '1px solid var(--border-color)',
                                                    background: 'rgba(255,255,255,0.03)',
                                                    color: 'var(--text-primary)',
                                                    outline: 'none',
                                                    opacity: isSubmitting ? 0.6 : 1,
                                                }}
                                            >
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8, flex: 1, minWidth: '100%', flexWrap: 'wrap' }}>
                                            <input
                                                value={editLatitude}
                                                onChange={e => setEditLatitude(e.target.value)}
                                                type="number"
                                                step="0.0001"
                                                placeholder="Latitude"
                                                disabled={isSubmitting}
                                                style={{
                                                    padding: 8,
                                                    borderRadius: 6,
                                                    border: '1px solid var(--border-color)',
                                                    background: 'rgba(255,255,255,0.03)',
                                                    color: 'var(--text-primary)',
                                                    outline: 'none',
                                                    flex: 1,
                                                    minWidth: 80,
                                                    opacity: isSubmitting ? 0.6 : 1,
                                                }}
                                            />
                                            <input
                                                value={editLongitude}
                                                onChange={e => setEditLongitude(e.target.value)}
                                                type="number"
                                                step="0.0001"
                                                placeholder="Longitude"
                                                disabled={isSubmitting}
                                                style={{
                                                    padding: 8,
                                                    borderRadius: 6,
                                                    border: '1px solid var(--border-color)',
                                                    background: 'rgba(255,255,255,0.03)',
                                                    color: 'var(--text-primary)',
                                                    outline: 'none',
                                                    flex: 1,
                                                    minWidth: 80,
                                                    opacity: isSubmitting ? 0.6 : 1,
                                                }}
                                            />
                                            <input
                                                value={editState}
                                                onChange={e => setEditState(e.target.value)}
                                                placeholder="State"
                                                disabled={isSubmitting}
                                                style={{
                                                    padding: 8,
                                                    borderRadius: 6,
                                                    border: '1px solid var(--border-color)',
                                                    background: 'rgba(255,255,255,0.03)',
                                                    color: 'var(--text-primary)',
                                                    outline: 'none',
                                                    flex: 1,
                                                    minWidth: 80,
                                                    opacity: isSubmitting ? 0.6 : 1,
                                                }}
                                            />
                                            <input
                                                value={editCity}
                                                onChange={e => setEditCity(e.target.value)}
                                                placeholder="City"
                                                disabled={isSubmitting}
                                                style={{
                                                    padding: 8,
                                                    borderRadius: 6,
                                                    border: '1px solid var(--border-color)',
                                                    background: 'rgba(255,255,255,0.03)',
                                                    color: 'var(--text-primary)',
                                                    outline: 'none',
                                                    flex: 1,
                                                    minWidth: 80,
                                                    opacity: isSubmitting ? 0.6 : 1,
                                                }}
                                            />
                                            <button
                                                onClick={() => requestAccurateLocation('edit')}
                                                disabled={isSubmitting || isLocatingEdit}
                                                style={{
                                                    padding: '8px 10px',
                                                    borderRadius: 6,
                                                    background: 'rgba(59,130,246,0.15)',
                                                    color: '#93c5fd',
                                                    border: '1px solid rgba(147,197,253,0.35)',
                                                    fontWeight: 600,
                                                    cursor: (isSubmitting || isLocatingEdit) ? 'not-allowed' : 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    opacity: (isSubmitting || isLocatingEdit) ? 0.7 : 1,
                                                }}
                                            >
                                                {isLocatingEdit ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
                                                {isLocatingEdit ? 'Requesting...' : 'Accurate Location'}
                                            </button>
                                        </div>
                                        {locationError && (
                                            <div style={{
                                                width: '100%',
                                                marginTop: '6px',
                                                padding: '8px 10px',
                                                borderRadius: '8px',
                                                background: 'rgba(239,68,68,0.1)',
                                                border: '1px solid rgba(239,68,68,0.35)',
                                                color: '#fca5a5',
                                                fontSize: '0.8rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                            }}>
                                                <AlertCircle size={14} />
                                                <span>{locationError}</span>
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: '4px' }}>
                                            <button
                                                onClick={saveEdit}
                                                disabled={isSubmitting}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                                    color: '#4ade80',
                                                    padding: 4,
                                                    opacity: isSubmitting ? 0.6 : 1,
                                                }}
                                            >
                                                <Check size={18} />
                                            </button>
                                            <button
                                                onClick={() => setEditingId(null)}
                                                disabled={isSubmitting}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                                    color: 'var(--text-tertiary)',
                                                    padding: 4,
                                                    opacity: isSubmitting ? 0.6 : 1,
                                                }}
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{p.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: 4, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                                {p.age > 0 && <span>{p.age}y / {p.sex}</span>}
                                                <span>
                                                    <FileText size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                                    {recCount} recording{recCount !== 1 ? 's' : ''}
                                                </span>
                                                {(p.state || p.city) && (
                                                    <span>
                                                        <MapPin size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                                        {[p.city, p.state].filter(Boolean).join(', ')}
                                                    </span>
                                                )}
                                                <span>
                                                    <Calendar size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                                    {new Date(p.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button
                                                onClick={() => startEdit(p)}
                                                disabled={isSubmitting}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                                    color: 'var(--text-secondary)',
                                                    padding: 6,
                                                    opacity: isSubmitting ? 0.6 : 1,
                                                }}
                                                title="Edit"
                                            >
                                                <Edit3 size={16} />
                                            </button>
                                            {confirmDeleteId === p.id ? (
                                                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.75rem', color: '#f87171' }}>Delete?</span>
                                                    <button
                                                        onClick={() => handleDelete(p.id)}
                                                        disabled={isSubmitting}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                                            color: '#f87171',
                                                            padding: 4,
                                                            opacity: isSubmitting ? 0.6 : 1,
                                                        }}
                                                    >
                                                        <Check size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmDeleteId(null)}
                                                        disabled={isSubmitting}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                                            color: 'var(--text-tertiary)',
                                                            padding: 4,
                                                            opacity: isSubmitting ? 0.6 : 1,
                                                        }}
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setConfirmDeleteId(p.id)}
                                                    disabled={isSubmitting}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                                        color: 'var(--text-tertiary)',
                                                        padding: 6,
                                                        opacity: isSubmitting ? 0.6 : 1,
                                                    }}
                                                    title="Delete"
                                                >
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