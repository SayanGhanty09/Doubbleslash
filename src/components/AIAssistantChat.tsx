import React, { useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { getOpenRouterKey, getOpenRouterModel } from "../pages/Settings";

interface AIAssistantChatProps {
  /** Biomarker data object to use as AI context */
  biomarkerData: Record<string, any> | null;
  /** Optional patient info for richer context */
  patient?: { name: string; age: number; sex: string } | null;
}

/** Render basic markdown: **bold**, *italic*, `code`, bullet lists, line breaks */
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  return lines.map((line, li) => {
    const trimmed = line.trimStart();
    const isBullet = /^[-*•]\s+/.test(trimmed);
    const content = isBullet ? trimmed.replace(/^[-*•]\s+/, '') : line;

    // split on bold, italic, code spans
    const parts = content.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    const rendered = parts.map((part, pi) => {
      if (part.startsWith('**') && part.endsWith('**'))
        return <strong key={pi}>{part.slice(2, -2)}</strong>;
      if (part.startsWith('*') && part.endsWith('*'))
        return <em key={pi}>{part.slice(1, -1)}</em>;
      if (part.startsWith('`') && part.endsWith('`'))
        return <code key={pi} style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 4, fontSize: '0.9em' }}>{part.slice(1, -1)}</code>;
      return part;
    });

    if (isBullet) {
      return <div key={li} style={{ display: 'flex', gap: 8, marginLeft: 8, marginTop: 2 }}><span style={{ color: 'var(--primary-color)' }}>•</span><span>{rendered}</span></div>;
    }
    if (line.trim() === '') return <br key={li} />;
    return <div key={li}>{rendered}</div>;
  });
}

const AIAssistantChat: React.FC<AIAssistantChatProps> = ({ biomarkerData, patient }) => {
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{ sender: string; text: string }[]>([]);
  const [isChatting, setIsChatting] = useState(false);

  const sendMessage = async () => {
    if (!chatInput.trim()) return;
    const apiKey = getOpenRouterKey();
    if (!apiKey) { alert("Please set your OpenRouter API key in Settings."); return; }

    const userMsg = { sender: "You", text: chatInput };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput("");
    setIsChatting(true);

    // Build context from biomarkers
    const ctx = biomarkerData
      ? Object.entries(biomarkerData)
          .filter(([, v]) => v !== undefined && v !== null)
          .map(([k, v]) => `${k}: ${typeof v === "number" ? (v as number).toFixed(2) : v}`)
          .join(", ")
      : "No data";

    const patientCtx = patient ? `Patient: ${patient.name}, Age: ${patient.age}, Sex: ${patient.sex}. ` : "";

    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": window.location.origin,
          "X-Title": "Anebilin Spectru",
        },
        body: JSON.stringify({
          model: getOpenRouterModel(),
          messages: [
            {
              role: "system",
              content: `You are a warm, friendly, and empathetic medical AI assistant for the Anebilin non-invasive screening device. ${patientCtx}The patient's latest biomarker readings are: ${ctx}.

Guidelines:
- Be approachable and supportive. Address the patient kindly, explain medical terms in simple language, and reassure them where appropriate.
- When reporting findings, explain what each value means for them in plain language (e.g. "Your hemoglobin is a bit low — this could mean your body isn't carrying as much oxygen as it should, which can make you feel tired").
- After giving your analysis, always ask 1-2 thoughtful follow-up questions to better understand their condition (e.g. "Have you been feeling more fatigued than usual?" or "Are you currently taking any supplements?").
- Use markdown formatting: **bold** for parameter names and key terms, bullet points for lists.
- Keep it conversational — you're talking TO the patient, not writing a clinical report.
- Always remind them this is screening data and recommend consulting a doctor for anything concerning.
- Do NOT use code blocks or JSON. Respond in natural, readable prose with markdown formatting.`,
            },
            ...chatHistory.map(m => ({
              role: m.sender === "You" ? "user" as const : "assistant" as const,
              content: m.text,
            })),
            { role: "user" as const, content: userMsg.text },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content ?? data.error?.message ?? "No response";
      setChatHistory(prev => [...prev, { sender: "AI", text: reply }]);
    } catch (e: any) {
      setChatHistory(prev => [...prev, { sender: "System", text: `Error: ${e.message}` }]);
    }
    setIsChatting(false);
  };

  return (
    <div className="glass card-glow" style={{ marginTop: 40, padding: 30, borderRadius: 16 }}>
      <h3
        className="glowing-heading"
        style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 12, fontSize: "1.5rem" }}
      >
        <MessageSquare size={24} color="var(--primary-color)" /> Ask AI Assistant
      </h3>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginBottom: 20 }}>
        Chat about your vitals and health data with AI.
      </p>

      <div
        className="scroll-hide"
        style={{
          maxHeight: 350,
          overflowY: "auto",
          padding: 15,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          background: "rgba(0,0,0,0.2)",
          border: "1px solid var(--border-color)",
          borderRadius: 12,
          marginBottom: 20,
          minHeight: 150,
        }}
      >
        {chatHistory.length === 0 && (
          <p style={{ color: "var(--text-tertiary)", textAlign: "center", marginTop: 40 }}>
            No messages yet — ask about your readings...
          </p>
        )}

        {chatHistory.map((msg, i) => {
          const isUser = msg.sender === "You";
          return (
            <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
              <div
                style={{
                  maxWidth: "80%",
                  padding: "12px 18px",
                  borderRadius: 16,
                  backgroundColor: isUser ? "rgba(0, 210, 255, 0.15)" : "rgba(255, 255, 255, 0.05)",
                  color: "var(--text-primary)",
                  border: `1px solid ${isUser ? "rgba(0, 210, 255, 0.3)" : "var(--border-color)"}`,
                  borderBottomRightRadius: isUser ? 4 : 16,
                  borderBottomLeftRadius: isUser ? 16 : 4,
                }}
              >
                <b
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    color: isUser ? "var(--primary-color)" : "var(--text-secondary)",
                    opacity: 0.9,
                    marginBottom: 6,
                  }}
                >
                  {msg.sender}
                </b>
                <div style={{ lineHeight: 1.6 }}>{isUser ? msg.text : renderMarkdown(msg.text)}</div>
              </div>
            </div>
          );
        })}
        {isChatting && (
          <div style={{ color: "var(--text-tertiary)", fontStyle: "italic", marginLeft: 15 }}>
            AI is thinking...
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <input
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="E.g. What does my SDNN score mean?"
          style={{
            flex: 1,
            padding: "14px 20px",
            borderRadius: 12,
            border: "1px solid var(--border-color)",
            outline: "none",
            background: "rgba(0,0,0,0.3)",
            color: "var(--text-primary)",
            fontSize: "1rem",
          }}
        />
        <button
          onClick={sendMessage}
          disabled={isChatting}
          className="btn-shimmer hover-lift-glow"
          style={{
            padding: "0 24px",
            color: "var(--text-primary)",
            border: "1px solid var(--secondary-color)",
            borderRadius: 12,
            cursor: isChatting ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontWeight: "500",
            fontSize: "1rem",
            background: "transparent",
          }}
        >
          <Send size={18} /> Send
        </button>
      </div>
    </div>
  );
};

export default AIAssistantChat;
