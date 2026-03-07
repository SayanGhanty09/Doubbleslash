import React, { useState, useEffect, useMemo } from "react";
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
  Mail
} from "lucide-react";

import VitalsScalePanel from "../components/dashboard/VitalsScalePanel";
import { usePatient } from "../components/layout/Shell";

const LiveRecording: React.FC = () => {
  const { activePatient } = usePatient();

  // ======================
  // State
  // ======================
  const [biomarkers, setBiomarkers] = useState<any>(null);
  const [waveformSamples, setWaveformSamples] = useState<any[]>([]);
  const [seconds, setSeconds] = useState(0);

  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [reportId, setReportId] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [isChatting, setIsChatting] = useState(false);

  // Email Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({ name: "", age: "", email: "" });
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // ======================
  // Fetch Vitals & Timer
  // ======================
  useEffect(() => {
    const fetchVitals = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/vitals");
        const data = await res.json();
        setBiomarkers(data.biomarkers);
        setWaveformSamples(data.waveform);
      } catch (e) {
        console.error("Vitals error", e);
      }
    };

    fetchVitals();
    const interval = setInterval(fetchVitals, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  // ======================
  // AI Report
  // ======================
  const generateAIReport = async () => {
    if (!biomarkers) return;
    setIsAnalyzing(true);

    const payload = {
      heartRate: Math.round(biomarkers.hr || 0),
      bloodPreasure: Math.round(biomarkers.bpSys || 120),
      spo2Level: biomarkers.spo2 || 0,
      sdnn: biomarkers.sdnn || 0,
      rmssd: biomarkers.rmssd || 0,
      heamoglobin: biomarkers.hb || 0,
      bilirubin: biomarkers.bilirubin || 0,
      deviceId: "WEB_CLIENT",
      patientName: activePatient || "Guest",
      patientAge: 30,
      sendEmail: false // We handle email via the popup now
    };

    try {
      const res = await fetch("http://127.0.0.1:8000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.status === "success") {
        setAnalysisResult(data.analysis);
        setReportId(data.report_id);
      }
    } catch (e) {
      console.error(e);
    }
    setIsAnalyzing(false);
  };

  // ======================
  // Send PDF via Email
  // ======================
  const triggerPdfEmail = async () => {
    if (!emailForm.name || !emailForm.age || !emailForm.email) {
      alert("Please fill in all fields.");
      return;
    }

    if (!reportId) {
      alert("Please generate a report first.");
      return;
    }

    setIsSendingEmail(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/send-pdf/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_id: reportId,
          patientName: emailForm.name,
          patientAge: parseInt(emailForm.age),
          patientEmail: emailForm.email
        })
      });

      const data = await res.json();

      if (data.status === "success") {
        alert("PDF successfully sent to your email!");
        setIsModalOpen(false);
        setEmailForm({ name: "", age: "", email: "" });
      } else {
        alert("Failed to send: " + data.message);
      }
    } catch (e) {
      console.error("Email error:", e);
      alert("An error occurred while sending the email.");
    }

    setIsSendingEmail(false);
  };

  // ======================
  // Chat
  // ======================
  const sendMessage = async () => {
    if (!chatInput.trim()) return;

    if (!reportId) {
      alert("Please generate an AI Report first so the assistant has your context.");
      return;
    }

    const userMsg = { sender: "You", text: chatInput };
    setChatHistory((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsChatting(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_id: reportId,
          message: userMsg.text
        })
      });

      const data = await res.json();

      if (data.status === "success") {
        setChatHistory((prev) => [
          ...prev,
          { sender: "AI Assistant", text: data.reply }
        ]);
      } else {
        setChatHistory((prev) => [
          ...prev,
          { sender: "System", text: `Error: ${data.message || data.detail}` }
        ]);
      }
    } catch (e) {
      console.error(e);
      setChatHistory((prev) => [
        ...prev,
        { sender: "System", text: "Network error. Make sure the backend is running." }
      ]);
    }

    setIsChatting(false);
  };

  // ======================
  // Vital Cards Data
  // ======================
  const vitalCards = useMemo(() => {
    return [
      { label: "Heart Rate", value: biomarkers?.hr || "--", unit: "bpm", icon: Heart, color: "#ef4444" },
      { label: "SpO2", value: biomarkers?.spo2 || "--", unit: "%", icon: Droplets, color: "#00d2ff" },
      { label: "Blood Pressure", value: biomarkers?.bpSys ? `${biomarkers.bpSys}/${biomarkers.bpDia}` : "--", unit: "mmHg", icon: ActivityIcon, color: "#f59e0b" },
      { label: "Resp Rate", value: biomarkers?.respRate || "--", unit: "bpm", icon: Wind, color: "#10b981" },
      { label: "Hemoglobin", value: biomarkers?.hb || "--", unit: "g/dL", icon: FlaskConical, color: "#a855f7" },
      { label: "Bilirubin", value: biomarkers?.bilirubin || "--", unit: "mg/dL", icon: ActivityIcon, color: "#f59e0b" },
      { label: "Stress", value: biomarkers?.stress || "--", unit: "", icon: Brain, color: "#10b981" }
    ];
  }, [biomarkers]);

  // ======================
  // UI Render
  // ======================
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: 20, fontFamily: "sans-serif" }}>
      
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1>Live Monitoring</h1>
        <p style={{ fontWeight: "bold", color: "#555" }}>
          Patient: {activePatient || "Guest"} | Time: {formatTime(seconds)}
        </p>
      </div>

      {/* VITAL CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 20, marginBottom: 30 }}>
        {vitalCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} style={{ padding: 20, border: "1px solid #3a2a5d", borderRadius: 12, backgroundColor: "#564a74", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
              <Icon color={card.color} size={24} style={{ marginBottom: 10 }} />
              <h2 style={{ margin: "5px 0", fontSize: "1.5rem" }}>{card.value}</h2>
              <p style={{ margin: 0, color: "#ffff", fontSize: "0.9rem" }}>{card.label} ({card.unit})</p>
            </div>
          );
        })}
      </div>

      {/* WAVEFORM */}
      <div style={{ marginBottom: 30 }}>
        <VitalsScalePanel waveformSamples={waveformSamples} hrBpm={biomarkers?.hr} />
      </div>

      {/* AI REPORT BUTTON */}
      <button 
        onClick={generateAIReport} 
        disabled={isAnalyzing}
        style={{ padding: "12px 20px", backgroundColor: "#10b981", color: "white", border: "none", borderRadius: 8, cursor: isAnalyzing ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 10, fontSize: "1rem", fontWeight: "bold" }}
      >
        {isAnalyzing ? <Loader2 className="animate-spin" size={20} /> : <FileText size={20} />}
        {isAnalyzing ? "Analyzing Vitals..." : "Generate AI Report"}
      </button>

      {/* AI REPORT DISPLAY */}
      {analysisResult && (
        <div style={{ marginTop: 30, padding: 25, backgroundColor: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0" }}>
          <h2 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <ActivityIcon color="#2563eb" /> AI Clinical Analysis
          </h2>
          
          <div style={{ display: "flex", alignItems: "center", gap: 15, marginBottom: 20 }}>
            <h1 style={{ margin: 0, color: analysisResult.healthScore >= 7.5 ? "#10b981" : "#f59e0b" }}>
              Score: {analysisResult.healthScore}/10
            </h1>
            
            {/* EMAIL PDF BUTTON */}
            <button 
              onClick={() => setIsModalOpen(true)}
              style={{ padding: "8px 16px", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
            >
              <Mail size={16} /> Email PDF Report
            </button>
          </div>

          <div style={{ display: "grid", gap: 15 }}>
            <div style={{ backgroundColor: "#fff", padding: 15, borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <strong>Summary:</strong> <p style={{ margin: "5px 0 0 0" }}>{analysisResult.general}</p>
            </div>
            <div style={{ backgroundColor: "#fff", padding: 15, borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <strong>Detailed Report:</strong> <p style={{ margin: "5px 0 0 0" }}>{analysisResult.report}</p>
            </div>
            <div style={{ backgroundColor: "#eff6ff", padding: 15, borderRadius: 8, border: "1px solid #bfdbfe" }}>
              <strong style={{ color: "#1d4ed8" }}>Recommended Action:</strong> <p style={{ margin: "5px 0 0 0", color: "#1e3a8a" }}>{analysisResult.whatnow}</p>
            </div>
          </div>
        </div>
      )}

      {/* CHAT SECTION */}
      <div style={{ marginTop: 40, padding: 25, backgroundColor: "#110920", borderRadius: 12, border: "1px solid #e2e8f0" }}>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 10 }}>
          <MessageSquare size={20} color="#8b5cf6" /> Ask the Medical AI
        </h3>
        <p style={{ color: "#666", fontSize: "0.9rem" }}>Generate an AI report first to chat about your results.</p>

        <div style={{ maxHeight: 300, overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 10, backgroundColor: "#f8fafc", borderRadius: 8, marginBottom: 15, minHeight: 100 }}>
          {chatHistory.length === 0 && <p style={{ color: "#94a3b8", textAlign: "center", marginTop: 30 }}>No messages yet...</p>}
          
          {chatHistory.map((msg, i) => {
            const isUser = msg.sender === "You";
            return (
              <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
                <div style={{ 
                  maxWidth: "75%", 
                  padding: "10px 15px", 
                  borderRadius: 15, 
                  backgroundColor: isUser ? "#3b82f6" : "#e2e8f0", 
                  color: isUser ? "white" : "#1e293b",
                  borderBottomRightRadius: isUser ? 0 : 15,
                  borderBottomLeftRadius: isUser ? 15 : 0
                }}>
                  <b style={{ display: "block", fontSize: "0.8rem", opacity: 0.8, marginBottom: 4 }}>{msg.sender}</b>
                  {msg.text}
                </div>
              </div>
            );
          })}
          {isChatting && <div style={{ color: "#64748b", fontStyle: "italic", marginLeft: 10 }}>AI is typing...</div>}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="E.g. What does my SDNN score mean?"
            style={{ flex: 1, padding: "12px 15px", borderRadius: 8, border: "1px solid #cbd5e1", outline: "none" }}
            disabled={!reportId}
          />
          <button 
            onClick={sendMessage} 
            disabled={isChatting || !reportId}
            style={{ padding: "0 20px", backgroundColor: reportId ? "#8b5cf6" : "#cbd5e1", color: "white", border: "none", borderRadius: 8, cursor: reportId ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 8 }}
          >
            <Send size={18} /> Send
          </button>
        </div>
      </div>

      {/* EMAIL POPUP MODAL */}
      {isModalOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 50
        }}>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ backgroundColor: "white", padding: 30, borderRadius: 12, width: "350px", display: "flex", flexDirection: "column", gap: 15, boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}
          >
            <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
              <Mail size={20} color="#2563eb" /> Send Report
            </h3>
            
            <div>
              <label style={{ fontSize: "0.85rem", fontWeight: "bold", color: "#475569" }}>Patient Name</label>
              <input 
                placeholder="John Doe" 
                value={emailForm.name}
                onChange={(e) => setEmailForm({...emailForm, name: e.target.value})}
                style={{ width: "93%", padding: 10, borderRadius: 6, border: "1px solid #cbd5e1", marginTop: 5 }}
              />
            </div>
            
            <div>
              <label style={{ fontSize: "0.85rem", fontWeight: "bold", color: "#475569" }}>Patient Age</label>
              <input 
                placeholder="30" 
                type="number"
                value={emailForm.age}
                onChange={(e) => setEmailForm({...emailForm, age: e.target.value})}
                style={{ width: "93%", padding: 10, borderRadius: 6, border: "1px solid #cbd5e1", marginTop: 5 }}
              />
            </div>
            
            <div>
              <label style={{ fontSize: "0.85rem", fontWeight: "bold", color: "#475569" }}>Recipient Email</label>
              <input 
                placeholder="doctor@clinic.com" 
                type="email"
                value={emailForm.email}
                onChange={(e) => setEmailForm({...emailForm, email: e.target.value})}
                style={{ width: "93%", padding: 10, borderRadius: 6, border: "1px solid #cbd5e1", marginTop: 5 }}
              />
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 15 }}>
              <button 
                onClick={() => setIsModalOpen(false)} 
                style={{ padding: "10px 15px", backgroundColor: "#f1f5f9", color: "#475569", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}
                disabled={isSendingEmail}
              >
                Cancel
              </button>
              
              <button 
                onClick={triggerPdfEmail} 
                style={{ padding: "10px 15px", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", gap: 8 }}
                disabled={isSendingEmail}
              >
                {isSendingEmail ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                {isSendingEmail ? "Sending..." : "Send PDF"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </motion.div>
  );
};

export default LiveRecording;