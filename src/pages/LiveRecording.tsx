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
  MessageSquare,
  Send,
  Mail,
  Play,
  AlertTriangle,
  UserPlus,
  Users
} from "lucide-react";

import { usePatient } from "../components/layout/Shell";
import { useBLE, BLEStatus } from "../contexts/BLEContext";
import { usePatientStore } from "../contexts/PatientStore";
import type { Patient } from "../contexts/PatientStore";

const LiveRecording: React.FC = () => {
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
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Auto-save recording when scan finishes
  const savedRef = useRef(false);
  useEffect(() => {
    if (scanPhase === 'done' && selectedPatientId && !savedRef.current) {
      savedRef.current = true;
      const bpDefined = Object.fromEntries(Object.entries(bestBP).filter(([, v]) => v !== undefined));
      const final = { ...bestNormal, ...bpDefined };
      saveRecording(selectedPatientId, final);
    }
    if (scanPhase === 'idle') {
      savedRef.current = false;
    }
  }, [scanPhase, selectedPatientId, bestNormal, bestBP, saveRecording]);

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

  const startScanWithPatient = (patient: Patient) => {
    setSelectedPatientId(patient.id);
    setActivePatient(patient.name);
    savedRef.current = false;
    setShowPatientPicker(false);
    startFullScan();
  };

  const handleAddAndStart = () => {
    if (!newName.trim() || !newAge.trim()) return;
    const p = addPatient({ name: newName.trim(), age: parseInt(newAge), sex: newSex });
    setNewName(""); setNewAge(""); setNewSex('Male');
    startScanWithPatient(p);
  };

  // AI report state (unchanged)
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [reportId, setReportId] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [isChatting, setIsChatting] = useState(false);
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
                     scanPhase === 'bp' ? "BP Scan" :
                     scanPhase === 'done' ? "Scan Complete" : "";

  // Vital cards — from best results
  const vitalCards = useMemo(() => {
    const d = displayData;
    return [
      { label: "Heart Rate", value: d?.hr ? d.hr.toFixed(2) : "--", unit: "bpm", icon: Heart, color: "#ef4444" },
      { label: "SpO2", value: d?.spo2 ? d.spo2.toFixed(2) : "--", unit: "%", icon: Droplets, color: "#00d2ff" },
      { label: "Blood Pressure", value: d?.bpSys ? `${d.bpSys.toFixed(2)}/${d.bpDia?.toFixed(2)}` : "--", unit: "mmHg", icon: ActivityIcon, color: "#f59e0b" },
      { label: "Resp Rate", value: d?.respRate ? d.respRate.toFixed(2) : "--", unit: "brpm", icon: Wind, color: "#10b981" },
      { label: "Hemoglobin", value: d?.hb ? d.hb.toFixed(2) : "--", unit: "g/dL", icon: FlaskConical, color: "#a855f7" },
      { label: "Bilirubin", value: d?.bilirubin ? d.bilirubin.toFixed(2) : "--", unit: "mg/dL", icon: ActivityIcon, color: "#f59e0b" },
      { label: "HRV (SDNN)", value: d?.sdnn ? d.sdnn.toFixed(2) : "--", unit: "ms", icon: Brain, color: "#10b981" },
    ];
  }, [displayData]);

  // AI Report
  const generateAIReport = async () => {
    if (!displayData?.hr) return;
    setIsAnalyzing(true);
    const payload = {
      heartRate: Math.round(displayData.hr || 0),
      bloodPreasure: Math.round(displayData.bpSys || 120),
      spo2Level: displayData.spo2 || 0,
      sdnn: displayData.sdnn || 0,
      rmssd: displayData.rmssd || 0,
      heamoglobin: displayData.hb || 0,
      bilirubin: displayData.bilirubin || 0,
      deviceId: "WEB_CLIENT",
      patientName: activePatient || "Guest",
      patientAge: 30,
      sendEmail: false
    };
    try {
      const res = await fetch("http://127.0.0.1:8000/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.status === "success") { setAnalysisResult(data.analysis); setReportId(data.report_id); }
    } catch (e) { console.error(e); }
    setIsAnalyzing(false);
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

  // Chat — uses Grok API (xAI)
  const GROK_API_KEY = "xai-placeholder-key"; // Replace with actual key
  const sendMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = { sender: "You", text: chatInput };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput(""); setIsChatting(true);

    // Build context from biomarkers
    const ctx = displayData ? Object.entries(displayData)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}: ${typeof v === 'number' ? (v as number).toFixed(2) : v}`)
      .join(', ') : 'No data';

    try {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROK_API_KEY}`
        },
        body: JSON.stringify({
          model: "grok-3-mini-fast",
          messages: [
            { role: "system", content: `You are a medical AI assistant. The patient's latest biomarker readings are: ${ctx}. Answer health questions based on this data. Be concise and clinically relevant.` },
            ...chatHistory.map(m => ({ role: m.sender === "You" ? "user" : "assistant", content: m.text })),
            { role: "user", content: userMsg.text }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content ?? data.error?.message ?? "No response";
      setChatHistory(prev => [...prev, { sender: "Grok AI", text: reply }]);
    } catch (e: any) {
      setChatHistory(prev => [...prev, { sender: "System", text: `Error: ${e.message}` }]);
    }
    setIsChatting(false);
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
            <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>SQI: <strong style={{ color: "var(--text-primary)" }}>{(liveSqi ?? 0).toFixed(2)}</strong></span>
          </div>
        )}

        {scanPhase === 'bp' && biomarkers.pulseRate !== undefined && biomarkers.pulseRate > 0 && (
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
              <p style={{ margin: "10px 0 0 0", color: "var(--text-primary)", lineHeight: 1.6 }}>{analysisResult.general}</p>
            </div>
            <div style={{ background: "rgba(255,255,255,0.03)", padding: 20, borderRadius: 12, border: "1px solid var(--border-color)" }}>
              <strong style={{ color: "var(--primary-color)", fontSize: "1.1rem" }}>Detailed Report:</strong> 
              <p style={{ margin: "10px 0 0 0", color: "var(--text-primary)", lineHeight: 1.6 }}>{analysisResult.report}</p>
            </div>
            <div style={{ background: "rgba(16, 185, 129, 0.1)", padding: 20, borderRadius: 12, border: "1px solid rgba(16, 185, 129, 0.2)" }}>
              <strong style={{ color: "var(--success-color)", fontSize: "1.1rem" }}>Recommended Action:</strong> 
              <p style={{ margin: "10px 0 0 0", color: "var(--text-primary)", lineHeight: 1.6 }}>{analysisResult.whatnow}</p>
            </div>
          </div>
        </div>
      )}

      {/* CHAT SECTION — Grok AI */}
      <div className="glass card-glow" style={{ marginTop: 40, padding: 30, borderRadius: 16 }}>
        <h3 className="glowing-heading" style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 12, fontSize: "1.5rem" }}>
          <MessageSquare size={24} color="var(--primary-color)" /> Ask Grok AI
        </h3>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginBottom: 20 }}>Chat about your vitals and health data with Grok AI.</p>

        <div className="scroll-hide" style={{ maxHeight: 350, overflowY: "auto", padding: 15, display: "flex", flexDirection: "column", gap: 12, background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-color)", borderRadius: 12, marginBottom: 20, minHeight: 150 }}>
          {chatHistory.length === 0 && <p style={{ color: "var(--text-tertiary)", textAlign: "center", marginTop: 40 }}>No messages yet — ask about your readings...</p>}
          
          {chatHistory.map((msg, i) => {
            const isUser = msg.sender === "You";
            return (
              <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
                <div style={{ 
                  maxWidth: "80%", 
                  padding: "12px 18px", 
                  borderRadius: 16, 
                  backgroundColor: isUser ? "rgba(0, 210, 255, 0.15)" : "rgba(255, 255, 255, 0.05)", 
                  color: "var(--text-primary)",
                  border: `1px solid ${isUser ? 'rgba(0, 210, 255, 0.3)' : 'var(--border-color)'}`,
                  borderBottomRightRadius: isUser ? 4 : 16,
                  borderBottomLeftRadius: isUser ? 16 : 4
                }}>
                  <b style={{ display: "block", fontSize: "0.8rem", color: isUser ? "var(--primary-color)" : "var(--text-secondary)", opacity: 0.9, marginBottom: 6 }}>{msg.sender}</b>
                  <div style={{ lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{msg.text}</div>
                </div>
              </div>
            );
          })}
          {isChatting && <div style={{ color: "var(--text-tertiary)", fontStyle: "italic", marginLeft: 15 }}>Grok is thinking...</div>}
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="E.g. What does my SDNN score mean?"
            style={{ flex: 1, padding: "14px 20px", borderRadius: 12, border: "1px solid var(--border-color)", outline: "none", background: "rgba(0,0,0,0.3)", color: "var(--text-primary)", fontSize: "1rem" }}
          />
          <button 
            onClick={sendMessage} 
            disabled={isChatting}
            className="btn-shimmer hover-lift-glow"
            style={{ padding: "0 24px", color: "var(--text-primary)", border: "1px solid var(--secondary-color)", borderRadius: 12, cursor: isChatting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 10, fontWeight: "500", fontSize: "1rem", background: "transparent" }}
          >
            <Send size={18} /> Send
          </button>
        </div>
      </div>

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
            style={{ padding: 35, borderRadius: 20, width: "520px", maxWidth: "95%", maxHeight: "80vh", display: "flex", flexDirection: "column", gap: 20 }}
          >
            <h3 className="glowing-heading" style={{ margin: 0, display: "flex", alignItems: "center", gap: 12, fontSize: "1.5rem" }}>
              <Users size={24} color="var(--primary-color)" /> Select Patient
            </h3>

            {/* Existing Patients */}
            {patients.length > 0 && (
              <div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 10 }}>Registered Patients</p>
                <div className="scroll-hide" style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                  {patients.map(p => (
                    <button
                      key={p.id}
                      onClick={() => startScanWithPatient(p)}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "12px 16px", borderRadius: 10,
                        background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)",
                        cursor: "pointer", color: "var(--text-primary)", fontFamily: "inherit", fontSize: "0.95rem",
                        transition: "background 0.2s"
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.background = "rgba(0,210,255,0.08)")}
                      onMouseOut={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                    >
                      <span style={{ fontWeight: 600 }}>{p.name}</span>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-tertiary)" }}>
                        {p.age}y / {p.sex}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: "var(--border-color)" }} />
              <span style={{ fontSize: "0.8rem", color: "var(--text-tertiary)" }}>OR ADD NEW</span>
              <div style={{ flex: 1, height: 1, background: "var(--border-color)" }} />
            </div>

            {/* New Patient Form */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Full Name *"
                style={{ padding: "12px 16px", borderRadius: 8, border: "1px solid var(--border-color)", background: "rgba(0,0,0,0.3)", color: "var(--text-primary)", outline: "none", fontSize: "0.95rem" }}
              />
              <div style={{ display: "flex", gap: 12 }}>
                <input
                  value={newAge}
                  onChange={(e) => setNewAge(e.target.value)}
                  placeholder="Age *"
                  type="number"
                  style={{ flex: 1, padding: "12px 16px", borderRadius: 8, border: "1px solid var(--border-color)", background: "rgba(0,0,0,0.3)", color: "var(--text-primary)", outline: "none", fontSize: "0.95rem" }}
                />
                <select
                  value={newSex}
                  onChange={(e) => setNewSex(e.target.value as 'Male' | 'Female' | 'Other')}
                  style={{ flex: 1, padding: "12px 16px", borderRadius: 8, border: "1px solid var(--border-color)", background: "rgba(0,0,0,0.3)", color: "var(--text-primary)", outline: "none", fontSize: "0.95rem" }}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <button
                onClick={handleAddAndStart}
                disabled={!newName.trim() || !newAge.trim()}
                className="btn-shimmer hover-lift-glow"
                style={{ padding: "14px", borderRadius: 10, border: "none", cursor: (!newName.trim() || !newAge.trim()) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)", opacity: (!newName.trim() || !newAge.trim()) ? 0.5 : 1 }}
              >
                <UserPlus size={20} /> Add & Start Recording
              </button>
            </div>

            <button
              onClick={() => setShowPatientPicker(false)}
              style={{ alignSelf: "center", padding: "8px 24px", background: "none", border: "1px solid var(--border-color)", borderRadius: 8, cursor: "pointer", color: "var(--text-secondary)", fontSize: "0.9rem" }}
            >
              Cancel
            </button>
          </motion.div>
        </div>
      )}

    </motion.div>
  );
};

export default LiveRecording;