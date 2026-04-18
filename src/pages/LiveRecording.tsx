import React, { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Heart,
  Wind,
  Activity as ActivityIcon,
  Droplets,
  FlaskConical,
  Brain,
  Loader2,
  FileText,
  Mail,
  Send,
  Play,
  AlertTriangle,
  UserPlus,
  Users,
  MapPin,
  AlertCircle,
  Locate,
} from "lucide-react";

import { usePatient } from "../components/layout/Shell";
import { useBLE, BLEStatus } from "../contexts/BLEContext";
import { usePatientStore } from "../contexts/PatientStore";
import type { Patient } from "../contexts/PatientStore";
import { getBPCaptureEnabled } from "../utils/preferences";
import { reverseGeocode } from "../utils/reverseGeocode";
import AIAssistantChat from "../components/AIAssistantChat";
import { requestLiveRecordingReport } from "../services/exchangeClient";

function formatFindingLabel(label: string): string {
  return label
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toUpperCase();
}

const LiveRecording: React.FC = () => {
  const bpCaptureEnabled = getBPCaptureEnabled();
  const location = useLocation();
  const { activePatient, setActivePatient } = usePatient();
  const {
    status, biomarkers, bestNormal, bestBP,
    scanPhase, scanSeconds, startFullScan
  } = useBLE();
  const { patients, addPatient, saveRecording } = usePatientStore();

  const isConnected = status === BLEStatus.CONNECTED ||
    status === BLEStatus.IDLE ||
    status === BLEStatus.SCANNING ||
    status === BLEStatus.SCANNING_BP;

  const isScanning = scanPhase === 'normal' || scanPhase === 'bp';

  // Patient picker popup
  const [showPatientPicker, setShowPatientPicker] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAge, setNewAge] = useState("");
  const [newSex, setNewSex] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [newLatitude, setNewLatitude] = useState("");
  const [newLongitude, setNewLongitude] = useState("");
  const [newState, setNewState] = useState("");
  const [newCity, setNewCity] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Auto-save recording when scan finishes
  const savedRef = useRef(false);
  useEffect(() => {
    if (scanPhase === 'done' && selectedPatientId && !savedRef.current) {
      savedRef.current = true;
      const bpDefined = Object.fromEntries(Object.entries(bestBP).filter(([, v]) => v !== undefined));
      const final = { ...bestNormal, ...bpDefined };
      saveRecording(selectedPatientId, final);

      // Also store a standalone last-reading JSON for external use
      const patient = patients.find(p => p.id === selectedPatientId);
      const lastReading = {
        deviceName: "Spectru",
        patient: patient ? { id: patient.id, name: patient.name, age: patient.age, sex: patient.sex } : null,
        timestamp: new Date().toISOString(),
        biomarkers: {
          spo2: final.spo2 ?? null,
          heartRate: final.hr ?? null,
          perfusionIndex: final.pi ?? null,
          signalQuality: final.sqi != null ? Math.round(final.sqi * 100) : null,
          sdnn: final.sdnn ?? null,
          rmssd: final.rmssd ?? null,
          hemoglobin: final.hb ?? null,
          bilirubin: final.bilirubin ?? null,
          systolicBP: final.bpSys ?? null,
          diastolicBP: final.bpDia ?? null,
          pulseRate: final.pulseRate ?? null,
          respirationRate: final.respRate ?? null,
        },
      };
      localStorage.setItem('spectru_last_reading', JSON.stringify(lastReading));
    }
    if (scanPhase === 'idle') {
      savedRef.current = false;
    }
  }, [scanPhase, selectedPatientId, bestNormal, bestBP, saveRecording, patients]);

  // Auto-start from Dashboard navigation
  const autoStartedRef = useRef(false);
  useEffect(() => {
    const state = location.state as { autoStartPatientId?: string; autoStartPatientName?: string } | null;
    if (state?.autoStartPatientId && isConnected && !autoStartedRef.current && scanPhase === 'idle') {
      autoStartedRef.current = true;
      setSelectedPatientId(state.autoStartPatientId);
      setActivePatient(state.autoStartPatientName ?? 'Unknown');
      savedRef.current = false;
      startFullScan();
      // Clear navigation state so refresh doesn't re-trigger
      window.history.replaceState({}, '');
    }
  }, [location.state, isConnected, scanPhase]);

  const handleMeasureClick = () => {
    if (!isConnected || isScanning) return;
    setShowPatientPicker(true);
  };

  const requestAccurateLocation = async () => {
    setLocationError(null);
    if (!('geolocation' in navigator)) {
      setLocationError('Geolocation is not supported by this browser.');
      return;
    }
    setIsLocating(true);
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
      setNewLatitude(lat.toFixed(6));
      setNewLongitude(lon.toFixed(6));
      // Auto-fill state and city
      await geocodeCoordinates(lat, lon);
    } catch (err) {
      const geoError = err as GeolocationPositionError;
      if (geoError?.code === 1) {
        setLocationError('Location permission denied. Please allow location access.');
      } else if (geoError?.code === 2) {
        setLocationError('Location unavailable. Make sure GPS is enabled.');
      } else if (geoError?.code === 3) {
        setLocationError('Location request timed out. Try again.');
      } else {
        setLocationError('Unable to fetch location. Please enter manually.');
      }
    } finally {
      setIsLocating(false);
    }
  };

  const geocodeCoordinates = async (lat: number, lon: number) => {
    setIsGeocoding(true);
    try {
      const result = await reverseGeocode(lat, lon);
      if (result) {
        setNewState(result.state);
        setNewCity(result.city);
      }
    } catch (err) {
      console.error('Reverse geocoding failed:', err);
    } finally {
      setIsGeocoding(false);
    }
  };

  const startScanWithPatient = (patient: Patient) => {
    setSelectedPatientId(patient.id);
    setActivePatient(patient.name);
    savedRef.current = false;
    setShowPatientPicker(false);
    startFullScan();
  };

  const handleAddAndStart = async () => {
    if (!newName.trim() || !newAge.trim()) return;
    const p = await addPatient({
      name: newName.trim(),
      age: parseInt(newAge),
      sex: newSex,
      latitude: newLatitude ? parseFloat(newLatitude) : undefined,
      longitude: newLongitude ? parseFloat(newLongitude) : undefined,
      state: newState || undefined,
      city: newCity || undefined,
    });
    if (!p) return;
    setNewName("");
    setNewAge("");
    setNewSex('Male');
    setNewLatitude("");
    setNewLongitude("");
    setNewState("");
    setNewCity("");
    setLocationError(null);
    startScanWithPatient(p);
  };

  // AI report state (unchanged)
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [reportId, setReportId] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({ name: "", age: "", email: "" });
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Use best results when done, live data while scanning
  const displayData = useMemo(() => {
    if (scanPhase === 'done') {
      // Only spread defined values from bestBP so undefined fields don't overwrite bestNormal
      const bpDefined = Object.fromEntries(Object.entries(bestBP).filter(([, v]) => v !== undefined));
      return { ...bestNormal, ...bpDefined };
    }
    return biomarkers;
  }, [scanPhase, bestNormal, bestBP, biomarkers]);

  // SQI/PI for live feedback during normal phase
  const livePi  = scanPhase === 'normal' ? biomarkers.pi  : undefined;
  const liveSqi = scanPhase === 'normal' ? biomarkers.sqi : undefined;

  const fingerGuidance = useMemo(() => {
    if (scanPhase !== 'normal') return null;
    if (livePi === undefined || livePi < 0.05) return { text: "Place your finger firmly on the sensor", color: "#ef4444" };
    if (liveSqi !== undefined && liveSqi < 0.3) return { text: "Hold still — signal quality is low", color: "#f59e0b" };
    if (liveSqi !== undefined && liveSqi < 0.6) return { text: "Getting signal... keep finger steady", color: "#f59e0b" };
    return { text: "Good signal — measuring...", color: "#10b981" };
  }, [scanPhase, livePi, liveSqi]);

  // Phase label
  const phaseLabel = scanPhase === 'normal' ? "Normal Scan" :
                     scanPhase === 'bp' && bpCaptureEnabled ? "BP Scan" :
                     scanPhase === 'done' ? "Scan Complete" : "";

  // Vital cards — from best results
  const vitalCards = useMemo(() => {
    const d = displayData;
    const cards = [
      { label: "Heart Rate", value: d?.hr ? d.hr.toFixed(2) : "--", unit: "bpm", icon: Heart, color: "#ef4444" },
      { label: "SpO2", value: d?.spo2 ? d.spo2.toFixed(2) : "--", unit: "%", icon: Droplets, color: "#00d2ff" },
      { label: "Hemoglobin", value: d?.hb ? d.hb.toFixed(2) : "--", unit: "g/dL", icon: FlaskConical, color: "#a855f7" },
      { label: "Bilirubin", value: d?.bilirubin ? d.bilirubin.toFixed(2) : "--", unit: "mg/dL", icon: ActivityIcon, color: "#f59e0b" },
      { label: "HRV (SDNN)", value: d?.sdnn ? d.sdnn.toFixed(2) : "--", unit: "ms", icon: Brain, color: "#10b981" },
    ];

    if (bpCaptureEnabled) {
      cards.splice(2, 0,
        { label: "Blood Pressure", value: d?.bpSys ? `${d.bpSys.toFixed(2)}/${d.bpDia?.toFixed(2)}` : "--", unit: "mmHg", icon: ActivityIcon, color: "#f59e0b" },
        { label: "Resp Rate", value: d?.respRate ? d.respRate.toFixed(2) : "--", unit: "brpm", icon: Wind, color: "#10b981" },
      );
    }

    return cards;
  }, [displayData, bpCaptureEnabled]);

  // AI Report — via Exchange endpoint (server-side report generation)
  const generateAIReport = async () => {
    if (!displayData?.hr) return;
    const patient = patients.find(p => p.id === selectedPatientId);
    if (!patient) {
      alert("Please select a patient before generating report.");
      return;
    }

    setIsAnalyzing(true);
    try {
      const readingPayload = {
        deviceName: "Spectru",
        patient: {
          id: patient.id,
          name: patient.name,
          age: patient.age,
          sex: patient.sex,
        },
        timestamp: new Date().toISOString(),
        biomarkers: {
          spo2: displayData.spo2 ?? null,
          heartRate: displayData.hr ?? null,
          perfusionIndex: displayData.pi ?? null,
          signalQuality: displayData.sqi != null ? Math.round(displayData.sqi * 100) : null,
          sdnn: displayData.sdnn ?? null,
          rmssd: displayData.rmssd ?? null,
          hemoglobin: displayData.hb ?? null,
          bilirubin: displayData.bilirubin ?? null,
          systolicBP: displayData.bpSys ?? null,
          diastolicBP: displayData.bpDia ?? null,
          pulseRate: displayData.pulseRate ?? null,
          respirationRate: displayData.respRate ?? null,
        },
      };

      const { requestId, report } = await requestLiveRecordingReport(readingPayload);
      setReportId(requestId);
      setAnalysisResult(report);

      localStorage.setItem('spectru_last_exchange_request_id', requestId);
      localStorage.setItem('spectru_last_exchange_payload', JSON.stringify(readingPayload));
      localStorage.setItem('spectru_last_exchange_report', JSON.stringify(report));
    } catch (e: any) {
      console.error(e);
      alert("AI report failed: " + e.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Email
  const triggerPdfEmail = async () => {
    if (!emailForm.name || !emailForm.age || !emailForm.email) { alert("Please fill in all fields."); return; }
    if (!reportId) { alert("Please generate a report first."); return; }
    setIsSendingEmail(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/send-pdf/", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_id: reportId, patientName: emailForm.name, patientAge: parseInt(emailForm.age), patientEmail: emailForm.email })
      });
      const data = await res.json();
      if (data.status === "success") { alert("PDF sent!"); setIsModalOpen(false); setEmailForm({ name: "", age: "", email: "" }); }
      else alert("Failed: " + data.message);
    } catch (e) { console.error(e); alert("Error sending email."); }
    setIsSendingEmail(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page-transition" style={{ padding: "20px" }}>

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
        <h1 className="glowing-heading" style={{ margin: 0, fontSize: "2.2rem" }}>Live Monitoring</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {isScanning && (
            <div className="glass" style={{ padding: "8px 16px", borderRadius: "20px", border: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: 10 }}>
              <Loader2 className="animate-spin" size={16} color="var(--primary-color)" />
              <span style={{ fontWeight: 600, color: "var(--primary-color)" }}>{phaseLabel}</span>
              <span style={{ fontFamily: "monospace", fontSize: "1.1rem", color: "var(--text-primary)" }}>{scanSeconds}s</span>
            </div>
          )}
          <div className="glass" style={{ padding: "8px 16px", borderRadius: "20px", border: "1px solid var(--border-color)" }}>
            <p style={{ margin: 0, fontWeight: "500", color: "var(--text-secondary)", fontSize: "0.95rem" }}>
              Patient: <span style={{ color: "var(--text-primary)" }}>{activePatient || "Guest"}</span>
            </p>
          </div>
        </div>
      </div>

      {/* MEASURE BUTTON + LIVE FEEDBACK */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24 }}>
        <button
          onClick={handleMeasureClick}
          disabled={!isConnected || isScanning}
          className="btn-shimmer hover-lift-glow"
          style={{
            padding: "16px 32px", border: "none", borderRadius: "14px",
            cursor: (!isConnected || isScanning) ? "not-allowed" : "pointer",
            display: "inline-flex", alignItems: "center", gap: 12,
            fontSize: "1.15rem", fontWeight: 700,
            opacity: (!isConnected || isScanning) ? 0.5 : 1,
            color: "var(--text-primary)"
          }}
        >
          {isScanning ? <Loader2 className="animate-spin" size={22} /> : <Play size={22} />}
          {isScanning ? "Measuring..." : scanPhase === 'done' ? "Measure Again" : "Measure Vitals"}
        </button>

        {scanPhase === 'done' && (
          <button
            onClick={() => {
              const raw = localStorage.getItem('spectru_last_reading');
              if (!raw) return;
              const blob = new Blob([raw], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `spectru-reading-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="btn-shimmer hover-lift-glow"
            style={{
              padding: "14px 24px", border: "none", borderRadius: "12px",
              cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 10,
              fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)"
            }}
          >
            <FileText size={18} /> Export JSON
          </button>
        )}

        {fingerGuidance && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10, padding: "12px 20px",
            borderRadius: "12px", border: `1px solid ${fingerGuidance.color}30`,
            background: `${fingerGuidance.color}10`
          }}>
            <AlertTriangle size={18} color={fingerGuidance.color} />
            <span style={{ color: fingerGuidance.color, fontWeight: 600, fontSize: "0.95rem" }}>{fingerGuidance.text}</span>
          </div>
        )}

        {scanPhase === 'normal' && livePi !== undefined && (
          <div style={{ display: "flex", gap: 16 }}>
            <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>PI: <strong style={{ color: "var(--text-primary)" }}>{livePi.toFixed(2)}%</strong></span>
            <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>SQI: <strong style={{ color: "var(--text-primary)" }}>{((liveSqi ?? 0) * 100).toFixed(0)}%</strong></span>
          </div>
        )}

        {bpCaptureEnabled && scanPhase === 'bp' && biomarkers.pulseRate !== undefined && biomarkers.pulseRate > 0 && (
          <div style={{ display: "flex", gap: 16 }}>
            <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>PR: <strong style={{ color: "var(--text-primary)" }}>{biomarkers.pulseRate.toFixed(0)} bpm</strong></span>
          </div>
        )}

        {!isConnected && (
          <span style={{ color: "var(--error-color)", fontWeight: 600, fontSize: "0.95rem" }}>
            Connect device first (Device Console)
          </span>
        )}
      </div>

      {/* VITAL CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24, marginBottom: 40 }}>
        {vitalCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="glass card-glow vital-card-edge-glow hover-lift-glow" style={{ padding: "24px", borderRadius: "16px", display: "flex", flexDirection: "column", '--card-color': card.color } as React.CSSProperties}>
              <Icon color={card.color} size={28} style={{ marginBottom: 16 }} />
              <h2 style={{ margin: "0 0 5px 0", fontSize: "2rem", color: "var(--text-primary)", fontWeight: "600" }}>{card.value}</h2>
              <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.95rem", fontWeight: "500" }}>{card.label} <span style={{ opacity: 0.6, fontSize: "0.85rem" }}>({card.unit})</span></p>
            </div>
          );
        })}
      </div>

      {/* AI REPORT BUTTON */}
      <button
        onClick={generateAIReport}
        disabled={isAnalyzing || !displayData?.hr}
        className="btn-shimmer hover-lift-glow"
        style={{ padding: "14px 28px", color: "var(--text-primary)", border: "none", borderRadius: "12px", cursor: (isAnalyzing || !displayData?.hr) ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 10, fontSize: "1.1rem", fontWeight: "600", opacity: !displayData?.hr ? 0.5 : 1 }}
      >
        {isAnalyzing ? <Loader2 className="animate-spin" size={22} /> : <FileText size={22} />}
        {isAnalyzing ? "Analyzing Vitals..." : "Generate AI Report"}
      </button>

      {/* AI REPORT DISPLAY */}
      {analysisResult && (
        <div className="glass border-spin-premium" style={{ marginTop: 40, padding: 30, borderRadius: 16 }}>
          <h2 className="glowing-heading" style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 12, fontSize: "1.8rem" }}>
            <ActivityIcon color="var(--primary-color)" size={28} /> AI Clinical Analysis
          </h2>
          
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 30, flexWrap: "wrap" }}>
            <h1 style={{ margin: 0, color: analysisResult.healthScore >= 7.5 ? "var(--success-color)" : "var(--warning-color)", fontSize: "2.5rem" }}>
              Score: {analysisResult.healthScore}/10
            </h1>
            
            {/* EMAIL PDF BUTTON */}
            <button 
              onClick={() => setIsModalOpen(true)}
              className="btn-shimmer hover-lift-glow"
              style={{ padding: "10px 20px", color: "var(--text-primary)", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontWeight: "500", border: "1px solid var(--secondary-color)", marginLeft: "auto" }}
            >
              <Mail size={18} /> Email PDF Report
            </button>
          </div>

          <div style={{ display: "grid", gap: 20 }}>
            <div style={{ background: "rgba(255,255,255,0.03)", padding: 20, borderRadius: 12, border: "1px solid var(--border-color)" }}>
              <strong style={{ color: "var(--primary-color)", fontSize: "1.1rem" }}>Summary:</strong> 
              <p style={{ margin: "10px 0 0 0", color: "var(--text-primary)", lineHeight: 1.6 }}>{analysisResult.summary}</p>
            </div>

            {analysisResult.findings?.length > 0 && (
              <div style={{ background: "rgba(255,255,255,0.03)", padding: 20, borderRadius: 12, border: "1px solid var(--border-color)" }}>
                <strong style={{ color: "var(--primary-color)", fontSize: "1.1rem" }}>Findings:</strong>
                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  {analysisResult.findings.map((f: any, i: number) => (
                    <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 14px", borderRadius: 8, background: f.status === 'abnormal' ? 'rgba(239,68,68,0.08)' : f.status === 'borderline' ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)', border: `1px solid ${f.status === 'abnormal' ? 'rgba(239,68,68,0.2)' : f.status === 'borderline' ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}` }}>
                      <span style={{ fontWeight: 700, minWidth: 100, color: f.status === 'abnormal' ? '#ef4444' : f.status === 'borderline' ? '#f59e0b' : '#10b981' }}>{formatFindingLabel(String(f.parameter ?? 'PARAMETER'))}</span>
                      <span style={{ fontFamily: "monospace", minWidth: 80, color: "var(--text-primary)" }}>{f.value}</span>
                      <span style={{ color: "var(--text-secondary)", flex: 1 }}>{f.interpretation}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysisResult.recommendations?.length > 0 && (
              <div style={{ background: "rgba(16, 185, 129, 0.08)", padding: 20, borderRadius: 12, border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                <strong style={{ color: "var(--success-color)", fontSize: "1.1rem" }}>Recommendations:</strong>
                <ul style={{ margin: "10px 0 0 0", paddingLeft: 20, color: "var(--text-primary)", lineHeight: 1.8 }}>
                  {analysisResult.recommendations.map((r: string, i: number) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}

            {analysisResult.warnings?.length > 0 && (
              <div style={{ background: "rgba(239, 68, 68, 0.08)", padding: 20, borderRadius: 12, border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                <strong style={{ color: "#ef4444", fontSize: "1.1rem" }}>&#9888; Warnings:</strong>
                <ul style={{ margin: "10px 0 0 0", paddingLeft: 20, color: "#ef4444", lineHeight: 1.8 }}>
                  {analysisResult.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}

            {analysisResult.disclaimer && (
              <p style={{ color: "var(--text-tertiary)", fontSize: "0.85rem", fontStyle: "italic", margin: "10px 0 0 0" }}>{analysisResult.disclaimer}</p>
            )}
          </div>
        </div>
      )}

      {/* CHAT SECTION — AI Assistant (reusable component) */}
      <AIAssistantChat
        biomarkerData={displayData}
        patient={selectedPatientId ? (() => { const p = patients.find(pt => pt.id === selectedPatientId); return p ? { name: p.name, age: p.age, sex: p.sex } : null; })() : null}
      />

      {/* EMAIL POPUP MODAL */}
      {isModalOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          backgroundColor: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100
        }}>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass border-spin-premium"
            style={{ padding: 35, borderRadius: 20, width: "400px", maxWidth: "90%", display: "flex", flexDirection: "column", gap: 20 }}
          >
            <h3 className="glowing-heading" style={{ margin: 0, display: "flex", alignItems: "center", gap: 12, fontSize: "1.5rem" }}>
              <Mail size={24} color="var(--primary-color)" /> Send Report
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: "0.9rem", fontWeight: "500", color: "var(--text-secondary)", marginBottom: 8, display: "block" }}>Patient Name</label>
                <input 
                  placeholder="John Doe" 
                  value={emailForm.name}
                  onChange={(e) => setEmailForm({...emailForm, name: e.target.value})}
                  style={{ width: "100%", padding: "12px 16px", borderRadius: 8, border: "1px solid var(--border-color)", background: "rgba(0,0,0,0.3)", color: "var(--text-primary)", outline: "none" }}
                />
              </div>
              
              <div>
                <label style={{ fontSize: "0.9rem", fontWeight: "500", color: "var(--text-secondary)", marginBottom: 8, display: "block" }}>Patient Age</label>
                <input 
                  placeholder="30" 
                  type="number"
                  value={emailForm.age}
                  onChange={(e) => setEmailForm({...emailForm, age: e.target.value})}
                  style={{ width: "100%", padding: "12px 16px", borderRadius: 8, border: "1px solid var(--border-color)", background: "rgba(0,0,0,0.3)", color: "var(--text-primary)", outline: "none" }}
                />
              </div>
              
              <div>
                <label style={{ fontSize: "0.9rem", fontWeight: "500", color: "var(--text-secondary)", marginBottom: 8, display: "block" }}>Recipient Email</label>
                <input 
                  placeholder="doctor@clinic.com" 
                  type="email"
                  value={emailForm.email}
                  onChange={(e) => setEmailForm({...emailForm, email: e.target.value})}
                  style={{ width: "100%", padding: "12px 16px", borderRadius: 8, border: "1px solid var(--border-color)", background: "rgba(0,0,0,0.3)", color: "var(--text-primary)", outline: "none" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 10 }}>
              <button 
                onClick={() => setIsModalOpen(false)} 
                style={{ padding: "12px 20px", background: "rgba(255,255,255,0.05)", color: "var(--text-primary)", border: "1px solid var(--border-color)", borderRadius: 8, cursor: "pointer", fontWeight: "500" }}
                disabled={isSendingEmail}
              >
                Cancel
              </button>
              
              <button 
                onClick={triggerPdfEmail} 
                className="btn-shimmer hover-lift-glow"
                style={{ padding: "12px 20px", color: "var(--text-primary)", border: "1px solid var(--primary-color)", borderRadius: 8, cursor: "pointer", fontWeight: "600", display: "flex", alignItems: "center", gap: 8 }}
                disabled={isSendingEmail}
              >
                {isSendingEmail ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                {isSendingEmail ? "Sending..." : "Send PDF"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* PATIENT PICKER POPUP */}
      {showPatientPicker && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 200
        }}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass border-spin-premium"
            style={{ padding: 24, borderRadius: 20, width: "520px", maxWidth: "95%", maxHeight: "85vh", display: "flex", flexDirection: "column", gap: 16 }}
          >
            <h3 className="glowing-heading" style={{ margin: 0, display: "flex", alignItems: "center", gap: 12, fontSize: "1.3rem", flexShrink: 0 }}>
              <Users size={20} color="var(--primary-color)" /> Select Patient
            </h3>

            {/* Scrollable content area */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14, overflowY: "auto", flex: 1, minHeight: 0 }}>
              {/* Existing Patients */}
              {patients.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "0 0 8px 0" }}>Registered Patients</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {patients.map(p => (
                      <button
                        key={p.id}
                        onClick={() => startScanWithPatient(p)}
                        style={{
                          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "10px 14px", borderRadius: 8,
                          background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)",
                          cursor: "pointer", color: "var(--text-primary)", fontFamily: "inherit", fontSize: "0.9rem",
                          transition: "background 0.2s"
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.background = "rgba(0,210,255,0.08)")}
                        onMouseOut={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                      >
                        <span style={{ fontWeight: 600 }}>{p.name}</span>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                          {p.age}y / {p.sex}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "8px 0" }}>
                    <div style={{ flex: 1, height: 1, background: "var(--border-color)" }} />
                    <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>OR ADD NEW</span>
                    <div style={{ flex: 1, height: 1, background: "var(--border-color)" }} />
                  </div>
                </div>
              )}

              {/* New Patient Form */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Full Name *"
                  style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-color)", background: "rgba(0,0,0,0.3)", color: "var(--text-primary)", outline: "none", fontSize: "0.9rem" }}
                />
                <div style={{ display: "flex", gap: 10 }}>
                  <input
                    value={newAge}
                    onChange={(e) => setNewAge(e.target.value)}
                    placeholder="Age *"
                    type="number"
                    style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-color)", background: "rgba(0,0,0,0.3)", color: "var(--text-primary)", outline: "none", fontSize: "0.9rem" }}
                  />
                  <select
                    value={newSex}
                    onChange={(e) => setNewSex(e.target.value as 'Male' | 'Female' | 'Other')}
                    style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-color)", background: "rgba(0,0,0,0.3)", color: "var(--text-primary)", outline: "none", fontSize: "0.9rem" }}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Location Fields */}
                <div style={{ display: "flex", gap: 10 }}>
                  <input
                    value={newLatitude}
                    onChange={(e) => setNewLatitude(e.target.value)}
                    type="number"
                    step="0.0001"
                    placeholder="Latitude"
                    style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-color)", background: "rgba(0,0,0,0.3)", color: "var(--text-primary)", outline: "none", fontSize: "0.85rem" }}
                  />
                  <input
                    value={newLongitude}
                    onChange={(e) => setNewLongitude(e.target.value)}
                    type="number"
                    step="0.0001"
                    placeholder="Longitude"
                    style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-color)", background: "rgba(0,0,0,0.3)", color: "var(--text-primary)", outline: "none", fontSize: "0.85rem" }}
                  />
                </div>

                <button
                  onClick={requestAccurateLocation}
                  disabled={isLocating}
                  style={{
                    padding: "9px 12px",
                    borderRadius: 8,
                    background: "rgba(59,130,246,0.15)",
                    color: "#93c5fd",
                    border: "1px solid rgba(147,197,253,0.35)",
                    fontWeight: 600,
                    cursor: isLocating ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    fontSize: "0.85rem",
                    opacity: isLocating ? 0.7 : 1,
                  }}
                >
                  {isLocating ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
                  {isLocating ? "Getting Location..." : "Use Current Location"}
                </button>

                {newLatitude && newLongitude && (
                  <button
                    onClick={async () => {
                      const lat = parseFloat(newLatitude);
                      const lon = parseFloat(newLongitude);
                      if (!isNaN(lat) && !isNaN(lon)) {
                        await geocodeCoordinates(lat, lon);
                      }
                    }}
                    disabled={isGeocoding}
                    style={{
                      padding: "9px 12px",
                      borderRadius: 8,
                      background: "rgba(34,197,94,0.15)",
                      color: "#86efac",
                      border: "1px solid rgba(134,239,172,0.35)",
                      fontWeight: 600,
                      cursor: isGeocoding ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      fontSize: "0.85rem",
                      opacity: isGeocoding ? 0.7 : 1,
                    }}
                  >
                    {isGeocoding ? <Loader2 size={14} className="animate-spin" /> : <Locate size={14} />}
                    {isGeocoding ? "Finding..." : "Find State & City"}
                  </button>
                )}

                {(newState || newCity) && (
                  <div style={{ display: "flex", gap: 10 }}>
                    <input
                      value={newState}
                      onChange={(e) => setNewState(e.target.value)}
                      placeholder="State"
                      style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-color)", background: "rgba(0,0,0,0.3)", color: "var(--text-primary)", outline: "none", fontSize: "0.9rem" }}
                    />
                    <input
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                      placeholder="City"
                      style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-color)", background: "rgba(0,0,0,0.3)", color: "var(--text-primary)", outline: "none", fontSize: "0.9rem" }}
                    />
                  </div>
                )}

                {locationError && (
                  <div style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.35)",
                    color: "#fca5a5",
                    fontSize: "0.8rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}>
                    <AlertCircle size={14} />
                    <span>{locationError}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Fixed Buttons at Bottom */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 }}>
              <button
                onClick={handleAddAndStart}
                disabled={!newName.trim() || !newAge.trim()}
                className="btn-shimmer hover-lift-glow"
                style={{ padding: "12px", borderRadius: 10, border: "none", cursor: (!newName.trim() || !newAge.trim()) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)", opacity: (!newName.trim() || !newAge.trim()) ? 0.5 : 1 }}
              >
                <UserPlus size={18} /> Add & Start Recording
              </button>
              <button
                onClick={() => setShowPatientPicker(false)}
                style={{ padding: "10px 20px", background: "none", border: "1px solid var(--border-color)", borderRadius: 8, cursor: "pointer", color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: 600 }}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </motion.div>
  );
};

export default LiveRecording;