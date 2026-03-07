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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page-transition" style={{ padding: "20px" }}>
      
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
        <h1 className="glowing-heading" style={{ margin: 0, fontSize: "2.2rem" }}>Live Monitoring</h1>
        <div className="glass" style={{ padding: "8px 16px", borderRadius: "20px", border: "1px solid var(--border-color)" }}>
          <p style={{ margin: 0, fontWeight: "500", color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Patient: <span style={{ color: "var(--text-primary)" }}>{activePatient || "Guest"}</span> <span style={{ margin: "0 10px", opacity: 0.3 }}>|</span> Time: <span style={{ color: "var(--primary-color)", fontFamily: "monospace", fontSize: "1.05rem" }}>{formatTime(seconds)}</span>
          </p>
        </div>
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

      {/* WAVEFORM */}
      <div className="glass card-glow" style={{ marginBottom: 40, padding: 20, borderRadius: 16 }}>
        <h3 style={{ margin: "0 0 20px 0", color: "var(--text-primary)", fontSize: "1.2rem", display: "flex", alignItems: "center", gap: 10 }}>
          <ActivityIcon size={20} color="var(--primary-color)" /> Real-Time ECG Waveform
        </h3>
        <VitalsScalePanel waveformSamples={waveformSamples} hrBpm={biomarkers?.hr} />
      </div>

      {/* AI REPORT BUTTON */}
      <button 
        onClick={generateAIReport} 
        disabled={isAnalyzing}
        className="btn-shimmer hover-lift-glow"
        style={{ padding: "14px 28px", color: "var(--text-primary)", border: "none", borderRadius: "12px", cursor: isAnalyzing ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 10, fontSize: "1.1rem", fontWeight: "600" }}
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

      {/* CHAT SECTION */}
      <div className="glass card-glow" style={{ marginTop: 40, padding: 30, borderRadius: 16 }}>
        <h3 className="glowing-heading" style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 12, fontSize: "1.5rem" }}>
          <MessageSquare size={24} color="var(--primary-color)" /> Ask the Medical AI
        </h3>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginBottom: 20 }}>Generate an AI report first to chat about your results.</p>

        <div className="scroll-hide" style={{ maxHeight: 350, overflowY: "auto", padding: 15, display: "flex", flexDirection: "column", gap: 12, background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-color)", borderRadius: 12, marginBottom: 20, minHeight: 150 }}>
          {chatHistory.length === 0 && <p style={{ color: "var(--text-tertiary)", textAlign: "center", marginTop: 40 }}>No messages yet...</p>}
          
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
                  <div style={{ lineHeight: 1.5 }}>{msg.text}</div>
                </div>
              </div>
            );
          })}
          {isChatting && <div style={{ color: "var(--text-tertiary)", fontStyle: "italic", marginLeft: 15 }}>AI is typing...</div>}
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="E.g. What does my SDNN score mean?"
            style={{ flex: 1, padding: "14px 20px", borderRadius: 12, border: "1px solid var(--border-color)", outline: "none", background: "rgba(0,0,0,0.3)", color: "var(--text-primary)", fontSize: "1rem" }}
            disabled={!reportId}
          />
          <button 
            onClick={sendMessage} 
            disabled={isChatting || !reportId}
            className={reportId ? "btn-shimmer hover-lift-glow" : ""}
            style={{ padding: "0 24px", backgroundColor: reportId ? "transparent" : "rgba(255,255,255,0.05)", color: reportId ? "var(--text-primary)" : "var(--text-tertiary)", border: reportId ? "1px solid var(--secondary-color)" : "1px solid var(--border-color)", borderRadius: 12, cursor: reportId ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 10, fontWeight: "500", fontSize: "1rem" }}
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

    </motion.div>
  );
};

export default LiveRecording;