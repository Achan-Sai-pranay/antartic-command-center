import React, { useState, useRef, useEffect } from "react";
import {
  Bot,
  Sparkles,
  Send,
  X,
  Settings,
  Download,
  Copy,
  Check,
  RotateCcw,
  Key,
  Shield,
  FileText,
  AlertTriangle,
  Flame,
  Activity,
  Maximize2,
  Minimize2,
  Compass,
  Cpu,
  Radio,
  MessageSquare,
  HelpCircle,
} from "lucide-react";
import {
  queryPolarisAI,
  getStoredApiKey,
  saveStoredApiKey,
  DEFAULT_GEMINI_KEY,
  GEMINI_MODEL,
  type PolarisContext,
  type ChatMessage,
} from "@/lib/polaris-ai";
import { usePolarSimulation } from "@/lib/simulation-engine";
import { PolarisAIMessageRenderer } from "./PolarisAIMessageRenderer";

interface PolarisAICopilotProps {
  isOpen: boolean;
  onClose: () => void;
  station: string;
}

export function PolarisAICopilot({ isOpen, onClose, station }: PolarisAICopilotProps) {
  const sim = usePolarSimulation();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg-welcome",
      role: "assistant",
      content: `### ❄️ Polaris AI Assistant Online
Welcome, Operator! I am **Polaris AI**, your 24/7 autonomous engineering copilot for the Indian Antarctic Research Stations (Bharati & Maitri).

* **Station Context:** Monitoring ${station.toUpperCase()} Station
* **Power Output:** ${Math.round((sim.generators[0]?.loadKw || 215) + (sim.generators[1]?.loadKw || 215))} kW (CHP Configuration)
* **Fuel Storage:** 78% (~254 Days Runway)
* **Life Support:** ${sim.activeIncident ? "⚠️ Active Incident Alert Registered" : "✅ All Subsystems Operating Within Safe Envelope"}

How can I help you today? You can select any quick inquiry below or ask anything about station telemetry, SOPs, or MoES reports.`,
      timestamp: new Date().toISOString().slice(11, 16) + " UTC",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [customKey, setCustomKey] = useState(() => getStoredApiKey());
  const [savedKeySuccess, setSavedKeySuccess] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const buildContext = (): PolarisContext => {
    const isBharati = station === "bharati";
    const totalGensetKw = Math.round((sim.generators[0]?.loadKw || 215) + (sim.generators[1]?.loadKw || 215));
    const targetRoom = sim.activeIncident ? sim.readings[sim.activeIncident.targetZoneId] : null;
    const smokePpm = targetRoom ? targetRoom.ppm : 410;

    return {
      station,
      weatherTempC: isBharati ? -28 : -35,
      weatherWind: isBharati ? "42 kts SW" : "58 kts SE",
      coords: station === "maitri-2" ? "70°45′S 11°43′E" : isBharati ? "69°24′S 76°11′E" : "70°46′S 11°44′E",
      gensetLoadKw: totalGensetKw,
      gensetVibrationMmS: sim.generators[1]?.vibrationMmS || 2.2,
      fuelReservePct: 78,
      fuelDepletionDays: 254,
      smokePPM: smokePpm,
      activeAlarmsCount: sim.alarms,
      selectedZoneName: sim.activeIncident?.targetZoneName,
      activeIncidentTitle: sim.activeIncident?.title,
      activeIncidentDescription: sim.activeIncident?.description,
      storeAndForwardBuffered: 0,
      madridCompliancePct: 100,
    };
  };

  const handleSend = async (textToSend?: string) => {
    const promptText = (textToSend || input).trim();
    if (!promptText || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: promptText,
      timestamp: new Date().toISOString().slice(11, 16) + " UTC",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const ctx = buildContext();
      const answer = await queryPolarisAI(promptText, ctx, messages);

      const isReport =
        promptText.toLowerCase().includes("report") ||
        promptText.toLowerCase().includes("moes") ||
        promptText.toLowerCase().includes("incident");

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: answer,
        timestamp: new Date().toISOString().slice(11, 16) + " UTC",
        isReport,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "⚠️ Polaris AI service encountered an error. Please verify your API key or network connection.",
          timestamp: new Date().toISOString().slice(11, 16) + " UTC",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportReport = (content: string) => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `MoES_Official_Incident_Report_${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSaveApiKey = () => {
    saveStoredApiKey(customKey);
    setSavedKeySuccess(true);
    setTimeout(() => {
      setSavedKeySuccess(false);
      setShowSettings(false);
    }, 1200);
  };

  if (!isOpen) return null;

  const contentWidget = (
    <div
      className={`relative flex flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white text-slate-800 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.18)] transition-all duration-300 ${
        isExpanded ? "h-[90vh] w-[94vw] max-w-5xl" : "h-[640px] max-h-[calc(100vh-2.5rem)] w-[440px] max-w-[calc(100vw-2.5rem)]"
      }`}
    >
      {/* Commercial Grade Light Header (Clean, Friendly & Professional like MCD / BK) */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-3.5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 text-white shadow-md shadow-blue-500/20">
            <Bot className="h-5 w-5" />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight text-slate-900">
                Polaris AI Copilot
              </h2>
              <span className="rounded-full border border-blue-200/80 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                {GEMINI_MODEL}
              </span>
            </div>
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              MoES Antarctic Command • Online • Instant Support
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="grid h-8 w-8 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            title="Configure API Key and Model"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="grid h-8 w-8 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            title={isExpanded ? "Collapse to docked widget" : "Expand window"}
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
            title="Close chat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* In-App Settings Drawer if toggled */}
      {showSettings && (
        <div className="border-b border-slate-200 bg-slate-50 p-4 text-xs animate-in slide-in-from-top-2 duration-150">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-bold text-slate-800">
              <Key className="h-3.5 w-3.5 text-blue-600" /> API Key Settings (Gemini / OpenAI Compatible)
            </span>
            <span className="font-mono text-[10px] text-slate-500">Target Model: {GEMINI_MODEL}</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="password"
              placeholder="Paste Gemini API Key (defaults to provided MoES key)"
              value={customKey}
              onChange={(e) => setCustomKey(e.target.value)}
              className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-mono text-xs text-slate-800 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={handleSaveApiKey}
              className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              {savedKeySuccess ? "Saved!" : "Save Key"}
            </button>
            <button
              onClick={() => setCustomKey(DEFAULT_GEMINI_KEY)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
              title="Reset to default key"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Real-time Station Telemetry Context Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/90 px-5 py-2 font-mono text-[11px] text-slate-600">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Station: <strong className="uppercase text-slate-900">{station}</strong>
          </span>
          <span>
            Ambient: <strong className="text-slate-900">{station === "bharati" ? "-28°C" : "-35°C"}</strong>
          </span>
          <span>
            Load: <strong className="text-slate-900">{Math.round((sim.generators[0]?.loadKw || 215) + (sim.generators[1]?.loadKw || 215))} kW</strong>
          </span>
          <span>
            Smoke: <strong className={`${sim.activeIncident ? "font-bold text-rose-600" : "text-slate-900"}`}>
              {sim.activeIncident ? "1372 PPM" : "410 PPM"}
            </strong>
          </span>
        </div>
        {sim.activeIncident && (
          <span className="flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 animate-pulse">
            <AlertTriangle className="h-3 w-3" />
            Active Incident: {sim.activeIncident.title}
          </span>
        )}
      </div>

      {/* Message Stream (Clean, Airy Commercial Light Canvas) */}
      <div className="flex-1 space-y-4 overflow-y-auto bg-[#f8fafc] p-4 sm:p-5">
        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div
              key={m.id}
              className={`flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200 ${
                isUser ? "justify-end" : "justify-start"
              }`}
            >
              {!isUser && (
                <div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 text-white shadow-xs">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div
                className={`group relative max-w-[88%] text-xs leading-relaxed ${
                  isUser
                    ? "rounded-2xl rounded-tr-xs bg-blue-600 p-4 font-medium text-white shadow-sm shadow-blue-500/10"
                    : "rounded-2xl rounded-tl-xs border border-slate-200/90 bg-white p-4 text-slate-800 shadow-sm"
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-4 border-b pb-1.5 border-current/10">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider opacity-80">
                    {isUser ? "You (Station Operator)" : "Polaris AI Specialist"}
                  </span>
                  <span className="font-mono text-[10px] opacity-60">{m.timestamp}</span>
                </div>

                {/* Render content */}
                {isUser ? (
                  <p className="text-xs leading-relaxed text-white">{m.content}</p>
                ) : (
                  <PolarisAIMessageRenderer content={m.content} />
                )}

                {/* Actions for bot messages */}
                {!isUser && (
                  <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 pt-2">
                    <button
                      onClick={() => handleCopy(m.id, m.content)}
                      className="flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                      title="Copy message"
                    >
                      {copiedId === m.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" /> Copy
                        </>
                      )}
                    </button>

                    {m.isReport && (
                      <button
                        onClick={() => handleExportReport(m.content)}
                        className="flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-900 shadow-sm transition-colors hover:bg-amber-100"
                      >
                        <Download className="h-3.5 w-3.5" /> Export Official Report (.md)
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start gap-3 animate-in fade-in duration-150">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 text-white shadow-xs">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2.5 rounded-2xl rounded-tl-xs border border-slate-200 bg-white p-4 text-xs text-slate-600 shadow-sm">
              <Sparkles className="h-4 w-4 animate-spin text-blue-600" />
              <span className="font-medium text-slate-700">
                Polaris AI is formulating assessment...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Inquiries (Commercial Style Pill Chips with Icons) */}
      <div className="border-t border-slate-100 bg-white p-3">
        <p className="mb-2 flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <Sparkles className="h-3 w-3 text-blue-600" />
          Suggested Inquiries:
        </p>
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: "Diagnose Alarms", icon: Activity, prompt: "Diagnose all active alarms and telemetry drifts across the station." },
            { label: "Fuel Depletion Forecast", icon: Flame, prompt: "Forecast fuel depletion rate based on current ambient temperature and days until resupply." },
            { label: "Generate MoES Report", icon: FileText, prompt: "Draft an official MoES Incident Report for the smoke alert in the HVAC room." },
            { label: "SOP Emergency Steps", icon: AlertTriangle, prompt: "List mandatory SOP emergency steps for Level 2 HVAC smoke and electrical isolation." },
            { label: "Madrid Protocol Status", icon: Shield, prompt: "Explain the Madrid Protocol compliance status of our waste incinerator and greywater plant." },
          ].map((chip) => (
            <button
              key={chip.label}
              onClick={() => handleSend(chip.prompt)}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-all hover:border-blue-300 hover:bg-blue-50/70 hover:text-blue-700 active:scale-95 disabled:opacity-50"
            >
              <chip.icon className="h-3 w-3 text-blue-600" />
              <span>{chip.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Input Bar (Modern Commercial Pill Form) */}
      <div className="border-t border-slate-100 bg-white p-3 sm:p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Ask Polaris AI (e.g., 'Analyze Genset 2 warning', 'Draft MoES Incident Report')..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none shadow-2xs transition-all focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className={`flex h-10 w-10 items-center justify-center rounded-full shadow-md transition-all ${
              input.trim() && !loading
                ? "bg-blue-600 text-white shadow-blue-500/25 hover:bg-blue-700 active:scale-95"
                : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
            }`}
            title="Send message"
          >
            <Send className="h-4 w-4 -ml-0.5" />
          </button>
        </form>
        <p className="pt-2 text-center text-[10px] font-medium text-slate-400">
          Powered by Polaris AI • NCPOR / MoES Autonomous Station Support
        </p>
      </div>
    </div>
  );

  // If expanded, wrap in soft centered overlay; if docked, position in bottom-right corner without dimming overlay
  if (isExpanded) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in duration-200">
        {contentWidget}
      </div>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5 duration-300">
      {contentWidget}
    </div>
  );
}
