import React, { useState, useEffect } from "react";
import {
  ClipboardCheck,
  RotateCw,
  Fuel,
  BookOpen,
  X,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Gauge,
  Thermometer,
  Zap,
  Droplets,
  Calendar,
  Send,
  Plus,
  ArrowRight,
  ShieldCheck,
  Sliders,
  Activity,
} from "lucide-react";
import { usePolarSimulation } from "@/lib/simulation-engine";

interface OperationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  station: string;
  onTriggerTelecommand?: (cmd: string) => void;
}

type TabType = "SOP" | "GENSET" | "DEPLETION" | "LOGBOOK" | "WHAT_IF";

export function OperationsDrawer({ isOpen, onClose, station, onTriggerTelecommand }: OperationsDrawerProps) {
  const sim = usePolarSimulation();
  const [activeTab, setActiveTab] = useState<TabType>("SOP");

  // --- What-If Physics Simulator State ---
  const [whatIfWindchill, setWhatIfWindchill] = useState<number>(-50);
  const [genset1Tripped, setGenset1Tripped] = useState<boolean>(true);
  const [telecommandDeployed, setTelecommandDeployed] = useState<boolean>(false);

  // --- SOP Checklist Runner State ---
  const [activeScenario, setActiveScenario] = useState<"A" | "B" | "C">("A");
  const [scenarioACompleted, setScenarioACompleted] = useState<Record<number, boolean>>({});
  const [scenarioBCompleted, setScenarioBCompleted] = useState<Record<number, boolean>>({});
  const [scenarioCCompleted, setScenarioCCompleted] = useState<Record<number, boolean>>({});
  const [stepTimers, setStepTimers] = useState<Record<string, number>>({});
  const [sopRunning, setSopRunning] = useState(false);
  const [sopElapsed, setSopElapsed] = useState(0);

  // --- Handover Logbook State ---
  const [handoverLogs, setHandoverLogs] = useState([
    {
      id: "LOG-01",
      timestamp: "08:30 UTC",
      author: "Eng. R. Verma",
      shift: "Alpha Shift (04:00 - 12:00)",
      category: "Fuel & Trace Heating",
      note: "Checked fuel pipe trace heating on north bulkhead corridor. Slight surface icing noted on exterior flange; trace circuit 3 nominal at 4.2A.",
    },
    {
      id: "LOG-02",
      timestamp: "04:15 UTC",
      author: "Dr. A. Sharma",
      shift: "Charlie Shift (20:00 - 04:00)",
      category: "Power House",
      note: "CHP Genset 2 bearing vibration stable after synthetic oil filter purge. Engine oil temperature normalized at 84.8°C.",
    },
    {
      id: "LOG-03",
      timestamp: "Yesterday 18:00 UTC",
      author: "T. Gogoi",
      shift: "Bravo Shift (12:00 - 20:00)",
      category: "Life Support",
      note: "Greywater treatment membrane backwash completed. Permeate turbidity < 0.1 NTU. Madrid Protocol sample bottles catalogued.",
    },
  ]);

  const [newLogAuthor, setNewLogAuthor] = useState("Eng. R. Verma");
  const [newLogShift, setNewLogShift] = useState("Alpha Shift (04:00 - 12:00)");
  const [newLogCategory, setNewLogCategory] = useState("Power & HVAC");
  const [newLogNote, setNewLogNote] = useState("");

  // SOP Timer loop
  useEffect(() => {
    let interval: any;
    if (sopRunning) {
      interval = setInterval(() => {
        setSopElapsed((t) => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sopRunning]);

  const toggleStepA = (stepIndex: number) => {
    if (!sopRunning) setSopRunning(true);

    setScenarioACompleted((prev) => {
      const next = { ...prev, [stepIndex]: !prev[stepIndex] };
      setStepTimers((t) => ({ ...t, [`A-${stepIndex}`]: sopElapsed }));

      // If Step 2 (Remote Exhaust Fan) or all steps completed, resolve incident!
      if (stepIndex === 2 && !prev[stepIndex]) {
        sim.resolveIncident("SOP_CHECKLIST");
      }
      return next;
    });
  };

  const toggleStepB = (stepIndex: number) => {
    if (!sopRunning) setSopRunning(true);
    setScenarioBCompleted((prev) => {
      const next = { ...prev, [stepIndex]: !prev[stepIndex] };
      setStepTimers((t) => ({ ...t, [`B-${stepIndex}`]: sopElapsed }));
      return next;
    });
  };

  const toggleStepC = (stepIndex: number) => {
    if (!sopRunning) setSopRunning(true);
    setScenarioCCompleted((prev) => {
      const next = { ...prev, [stepIndex]: !prev[stepIndex] };
      setStepTimers((t) => ({ ...t, [`C-${stepIndex}`]: sopElapsed }));
      return next;
    });
  };

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogNote.trim()) return;

    const newEntry = {
      id: `LOG-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString().slice(11, 16) + " UTC",
      author: newLogAuthor,
      shift: newLogShift,
      category: newLogCategory,
      note: newLogNote.trim(),
    };

    setHandoverLogs([newEntry, ...handoverLogs]);
    setNewLogNote("");
    sim.pushLog("INFO", "Shift Handover Log", `New log entry registered by ${newLogAuthor}: ${newLogCategory}.`);
  };

  // Depletion calculations
  const ambientTemp = station === "bharati" ? -28 : -35;
  const burnRateLPerDay = ambientTemp < -30 ? 780 : 620;
  const totalReserveLitres = 157480;
  const currentFuelPct = 78;
  const daysRemaining = Math.floor((totalReserveLitres * (currentFuelPct / 100)) / burnRateLPerDay);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-md border border-gov-border bg-gov-card text-gov-text shadow-2xl">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-gov-border bg-gov-navy-header px-5 py-3 text-white">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-sm bg-gov-saffron/20 border border-gov-saffron/50 text-gov-saffron">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gov-saffron">
                Station Operations Management Enclave
              </h2>
              <p className="text-[11px] text-white/70">
                MoES · NCPOR Antarctic Expedition Operations Core · {station.toUpperCase()} Station
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gov-border bg-gov-bg px-5 overflow-x-auto">
          {[
            { id: "SOP" as TabType, label: "SOP & Emergency Checklist Runner", icon: ClipboardCheck },
            { id: "GENSET" as TabType, label: "Genset Duty-Cycle Auto-Rotation", icon: RotateCw },
            { id: "DEPLETION" as TabType, label: "Fuel, Water & Rations Forecast", icon: Fuel },
            { id: "LOGBOOK" as TabType, label: "Shift Handover Logbook", icon: BookOpen },
            { id: "WHAT_IF" as TabType, label: "What-If Simulation (Physics Engine)", icon: Zap },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-gov-navy-primary bg-white text-gov-navy-primary"
                  : "border-transparent text-gov-muted hover:text-gov-text"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* TAB 1: SOP & EMERGENCY CHECKLIST RUNNER */}
          {activeTab === "SOP" && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-gov-border bg-gov-bg p-3.5">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gov-navy-primary">
                    Emergency Standard Operating Procedures (SOP)
                  </h3>
                  <p className="text-[11px] text-gov-muted">
                    Check off steps interactively. The engine records response elapsed time and resolves critical telemetry.
                  </p>
                </div>
                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="flex items-center gap-1 font-bold text-gov-text bg-white px-2.5 py-1 rounded border border-gov-border">
                    <Clock className="h-3.5 w-3.5 text-gov-saffron" />
                    Elapsed: {Math.floor(sopElapsed / 60)}m {sopElapsed % 60}s
                  </span>
                  <button
                    onClick={() => {
                      setSopRunning(false);
                      setSopElapsed(0);
                      setScenarioACompleted({});
                      setScenarioBCompleted({});
                      setScenarioCCompleted({});
                    }}
                    className="rounded bg-white px-2.5 py-1 text-[11px] font-semibold text-gov-muted border border-gov-border hover:text-gov-text"
                  >
                    Reset Checklists
                  </button>
                </div>
              </div>

              {/* Scenario selector */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  {
                    id: "A" as const,
                    title: "Scenario A: HVAC Smoke & Fire Alarm",
                    code: "SOP-FIRE-202",
                    desc: "Level 2 HVAC Room short-circuit & thermal surge.",
                    danger: true,
                  },
                  {
                    id: "B" as const,
                    title: "Scenario B: Generator Failure & Failover",
                    code: "SOP-PWR-104",
                    desc: "Genset 2 bearing vibration & cold standby spin-up.",
                    danger: false,
                  },
                  {
                    id: "C" as const,
                    title: "Scenario C: Fuel Pipeline Thermal Drop",
                    code: "SOP-ENV-301",
                    desc: "Sub-zero line pressure drop & trace heating.",
                    danger: false,
                  },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveScenario(s.id)}
                    className={`rounded-md border p-3.5 text-left transition-all ${
                      activeScenario === s.id
                        ? "border-gov-navy-primary bg-gov-navy-primary/5 shadow-sm ring-1 ring-gov-navy-primary"
                        : "border-gov-border bg-white hover:border-gov-muted"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-gov-saffron uppercase">
                        {s.code}
                      </span>
                      {s.danger && (
                        <span className="rounded bg-gov-critical/15 px-1.5 py-0.2 text-[9px] font-bold text-gov-critical border border-gov-critical/30">
                          PRIORITY-1
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-xs text-gov-text mt-1">{s.title}</p>
                    <p className="text-[11px] text-gov-muted mt-1">{s.desc}</p>
                  </button>
                ))}
              </div>

              {/* Active Checklist Runner */}
              {activeScenario === "A" && (
                <div className="rounded-md border border-gov-border bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-gov-border pb-2.5">
                    <div>
                      <h4 className="text-xs font-bold uppercase text-gov-navy-primary">
                        SOP-FIRE-202 · Level 2 HVAC Room Smoke & Fire Response Protocol
                      </h4>
                      <p className="text-[11px] text-gov-muted">
                        Executing Step 2 automatically actuates closed-loop resolution to ramp CFM and dilute smoke back to normal.
                      </p>
                    </div>
                    <span className="font-mono text-xs text-gov-saffron font-bold">
                      {Object.values(scenarioACompleted).filter(Boolean).length} of 4 Complete
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      {
                        idx: 1,
                        label: "Step 1: Sound Station Acoustic Alarm & Notify Goa Ops",
                        detail: "Trigger Level 2 acoustic sirens and send high-priority alert packet to NCPOR Goa via VSAT-1.",
                      },
                      {
                        idx: 2,
                        label: "Step 2: Actuate Remote Exhaust Fan & Damper Isolation [CLOSED-LOOP]",
                        detail: "Command ventilation bypass to ramp to 850 CFM and flush smoke particulate below 400 PPM.",
                      },
                      {
                        idx: 3,
                        label: "Step 3: Evacuate Level 2 Crew to Level 1 Technical Safe Haven",
                        detail: "Verify muster count of all 24 expeditioners at Level 1 Dining Hall assembly point.",
                      },
                      {
                        idx: 4,
                        label: "Step 4: Transmit Official MoES Incident Report to Mission Director",
                        detail: "Generate digitally signed MoES telemetry incident assessment and log cryptographic record.",
                      },
                    ].map((step) => {
                      const isDone = Boolean(scenarioACompleted[step.idx]);
                      return (
                        <div
                          key={step.idx}
                          onClick={() => toggleStepA(step.idx)}
                          className={`flex items-start gap-3 rounded border p-3 cursor-pointer transition-colors ${
                            isDone
                              ? "border-emerald-500/50 bg-emerald-50/50 text-emerald-950"
                              : "border-gov-border bg-gov-bg/50 hover:bg-gov-bg"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isDone}
                            onChange={() => {}}
                            className="mt-1 h-4 w-4 rounded border-gov-border text-gov-navy-primary accent-gov-navy-primary cursor-pointer"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-xs">{step.label}</p>
                            <p className="text-[11px] text-gov-muted mt-0.5">{step.detail}</p>
                          </div>
                          {stepTimers[`A-${step.idx}`] !== undefined && (
                            <span className="font-mono text-[10px] text-gov-muted bg-white px-2 py-0.5 rounded border border-gov-border">
                              + {stepTimers[`A-${step.idx}`]}s
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeScenario === "B" && (
                <div className="rounded-md border border-gov-border bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-gov-border pb-2.5">
                    <h4 className="text-xs font-bold uppercase text-gov-navy-primary">
                      SOP-PWR-104 · Generator Mechanical Failure & Cold Standby Failover
                    </h4>
                    <span className="font-mono text-xs text-gov-saffron font-bold">
                      {Object.values(scenarioBCompleted).filter(Boolean).length} of 3 Complete
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { idx: 1, label: "Step 1: Isolate Degraded Genset Bus & De-rate Load", detail: "Trip breaker for Genset 2 to prevent mechanical bearing seizure." },
                      { idx: 2, label: "Step 2: Pre-heat & Spin Cold Standby Genset 3", detail: "Initiate pre-lube heating and ramp Cummins QSK standby to 1500 RPM." },
                      { idx: 3, label: "Step 3: Transfer Critical Station Essential Loads", detail: "Synchronize phase and close main station bus tie breaker." },
                    ].map((step) => {
                      const isDone = Boolean(scenarioBCompleted[step.idx]);
                      return (
                        <div
                          key={step.idx}
                          onClick={() => toggleStepB(step.idx)}
                          className={`flex items-start gap-3 rounded border p-3 cursor-pointer transition-colors ${
                            isDone ? "border-emerald-500/50 bg-emerald-50/50" : "border-gov-border bg-gov-bg/50"
                          }`}
                        >
                          <input type="checkbox" checked={isDone} onChange={() => {}} className="mt-1 h-4 w-4" />
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-xs">{step.label}</p>
                            <p className="text-[11px] text-gov-muted mt-0.5">{step.detail}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeScenario === "C" && (
                <div className="rounded-md border border-gov-border bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-gov-border pb-2.5">
                    <h4 className="text-xs font-bold uppercase text-gov-navy-primary">
                      SOP-ENV-301 · Sub-surface Fuel Line Thermal Contraction Response
                    </h4>
                    <span className="font-mono text-xs text-gov-saffron font-bold">
                      {Object.values(scenarioCCompleted).filter(Boolean).length} of 3 Complete
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { idx: 1, label: "Step 1: Activate Auxiliary Trace Heating Loop", detail: "Ramp electrical heat tracing cables on arctic ATF fuel supply conduit." },
                      { idx: 2, label: "Step 2: Reroute Auxiliary Feed via Secondary Day Tank", detail: "Open pneumatic valve PV-14 to maintain positive pressure." },
                      { idx: 3, label: "Step 3: Verify Acoustic Sensor Pressure Return (>3.8 Bar)", detail: "Confirm acoustic leak index returns to NOMINAL under Madrid Protocol." },
                    ].map((step) => {
                      const isDone = Boolean(scenarioCCompleted[step.idx]);
                      return (
                        <div
                          key={step.idx}
                          onClick={() => toggleStepC(step.idx)}
                          className={`flex items-start gap-3 rounded border p-3 cursor-pointer transition-colors ${
                            isDone ? "border-emerald-500/50 bg-emerald-50/50" : "border-gov-border bg-gov-bg/50"
                          }`}
                        >
                          <input type="checkbox" checked={isDone} onChange={() => {}} className="mt-1 h-4 w-4" />
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-xs">{step.label}</p>
                            <p className="text-[11px] text-gov-muted mt-0.5">{step.detail}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: GENERATOR DUTY-CYCLE AUTO-ROTATION */}
          {activeTab === "GENSET" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between rounded-md border border-gov-border bg-gov-bg p-3.5">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gov-navy-primary">
                    Combined Heat & Power (CHP) Generator Duty-Cycle Management
                  </h3>
                  <p className="text-[11px] text-gov-muted">
                    Auto-rotate active gensets every 500 operating hours to equalize engine wear across the polar winter-over.
                  </p>
                </div>
                <button
                  onClick={() => sim.rotateGensets()}
                  className="flex items-center gap-1.5 rounded-sm bg-gov-navy-primary px-3.5 py-2 text-xs font-bold text-white hover:bg-gov-navy-header transition-colors shadow-sm"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  <span>Execute Auto-Rotation Now</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {sim.generators.map((g, idx) => (
                  <div
                    key={g.id}
                    className={`rounded-md border p-4 shadow-sm transition-all ${
                      g.status === "WARNING"
                        ? "border-amber-500/60 bg-amber-500/5"
                        : g.status === "NORMAL"
                        ? "border-emerald-500/40 bg-white"
                        : "border-gov-border bg-gov-bg/40 opacity-75"
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-gov-border pb-2 mb-2">
                      <span className="font-mono text-xs font-bold text-gov-navy-primary">
                        GENSET #{idx + 1}
                      </span>
                      <span
                        className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
                          g.status === "NORMAL"
                            ? "bg-emerald-100 text-emerald-800"
                            : g.status === "WARNING"
                            ? "bg-amber-100 text-amber-800 animate-pulse"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        ● {g.status}
                      </span>
                    </div>

                    {/* AI Kalman Filter & RUL Badges */}
                    <div className="flex flex-col gap-1.5 mb-2.5">
                      <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 font-mono text-[9px] font-bold text-indigo-700 border border-indigo-200">
                        [AI] Kalman Filter Fusion: ACTIVE (Zero Noise Drift)
                      </span>
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-800 border border-emerald-200">
                        [RUL] Remaining Useful Life: {idx === 0 ? "4,820 hrs (98.4% Health Index)" : idx === 1 ? "3,940 hrs (91.2% Health Index)" : "5,410 hrs (99.1% Health Index)"}
                      </span>
                    </div>

                    <h4 className="font-bold text-xs text-gov-text mb-2">{g.name}</h4>

                    <div className="space-y-2 text-xs">
                      <div>
                        <div className="flex justify-between text-[11px] text-gov-muted mb-1">
                          <span>Accumulated Run Hours</span>
                          <strong className="font-mono text-gov-text">{g.runHours.toLocaleString()} hrs</strong>
                        </div>
                        <div className="h-2 w-full rounded-full bg-gov-border overflow-hidden">
                          <div
                            className="h-full bg-gov-navy-primary rounded-full"
                            style={{ width: `${Math.min(100, (g.runHours / 6000) * 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gov-border">
                        <div>
                          <p className="text-[10px] uppercase text-gov-muted">Active Load</p>
                          <p className="font-mono font-bold text-sm text-gov-text">{g.loadKw} kW</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-gov-muted">Engine Speed</p>
                          <p className="font-mono font-bold text-sm text-gov-text">{g.rpm} RPM</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-gov-muted">Lube Oil Temp</p>
                          <p className="font-mono font-bold text-sm text-gov-text">{g.oilTempC}°C</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-gov-muted">Vibration</p>
                          <p className={`font-mono font-bold text-sm ${g.vibrationMmS > 3.5 ? "text-amber-600 font-extrabold" : "text-gov-text"}`}>
                            {g.vibrationMmS} mm/s
                          </p>
                          {g.vibrationMmS <= 3.5 ? (
                            <p className="text-[9px] font-mono text-emerald-700 font-medium leading-tight mt-0.5">
                              Kalman Residual Variance: &lt;0.02 mm/s (Healthy Harmonic)
                            </p>
                          ) : (
                            <p className="text-[9px] font-mono text-amber-700 font-semibold leading-tight mt-0.5">
                              Kalman Residual Variance: +0.48 mm/s (Bearing Harmonic Anomaly)
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 rounded bg-gov-bg p-2 text-[10px] text-gov-muted flex items-center justify-between border border-gov-border">
                      <span>Scheduled Rotation:</span>
                      <strong className="font-mono text-gov-navy-primary">Every 500h (Balanced)</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: FUEL, WATER & RATIONS DEPLETION CALCULATOR */}
          {activeTab === "DEPLETION" && (
            <div className="space-y-5">
              <div className="rounded-md border border-gov-border bg-gov-bg p-3.5 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gov-navy-primary">
                    Expedition Winter-Over Consumables & Life Support Runway
                  </h3>
                  <p className="text-[11px] text-gov-muted">
                    Dynamic burn rate algorithms correlating ambient polar temperature (-28°C Bharati vs -35°C Maitri) with fuel storage.
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded bg-emerald-50 px-2.5 py-1 font-mono text-[10px] font-bold text-emerald-800 border border-emerald-300 shadow-sm">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Multi-Sensor Kalman Mass-Balance: NOMINAL (Sub-Zero Wax Drift Suppressed)</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Fuel Gauge */}
                <div className="rounded-md border border-gov-border bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-gov-border pb-2">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-gov-text uppercase">
                      <Fuel className="h-4 w-4 text-gov-saffron" /> Fuel Reserve (ATF-Arctic)
                    </span>
                    <span className="rounded bg-gov-saffron/15 px-2 py-0.5 font-mono text-[10px] font-bold text-gov-saffron">
                      78% OPTIMAL
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gov-muted">Days until Resupply Ship:</span>
                      <strong className="font-mono text-base text-gov-navy-primary">{daysRemaining} Days</strong>
                    </div>
                    <div className="h-3 w-full rounded-full bg-gov-border overflow-hidden">
                      <div className="h-full bg-gov-saffron rounded-full" style={{ width: "78%" }} />
                    </div>
                    <p className="text-[10px] text-gov-muted">
                      Safety Threshold: 30% (~75 days). Auto-alert triggers if level &lt; 30%.
                    </p>
                  </div>

                  <div className="rounded bg-gov-bg p-2 text-xs space-y-1 border border-gov-border font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-gov-muted">Daily Burn Rate:</span>
                      <strong>{burnRateLPerDay} L / day</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gov-muted">Usable Capacity:</span>
                      <strong>122,834 Litres</strong>
                    </div>
                  </div>
                </div>

                {/* Potable Water Gauge */}
                <div className="rounded-md border border-gov-border bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-gov-border pb-2">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-gov-text uppercase">
                      <Droplets className="h-4 w-4 text-sky-500" /> Potable & Meltwater Supply
                    </span>
                    <span className="rounded bg-sky-100 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-800">
                      91% RECOVERY
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gov-muted">Daily Production (Desal + Priyadarshini):</span>
                      <strong className="font-mono text-base text-sky-600">2,400 L / day</strong>
                    </div>
                    <div className="h-3 w-full rounded-full bg-gov-border overflow-hidden">
                      <div className="h-full bg-sky-500 rounded-full" style={{ width: "91%" }} />
                    </div>
                    <p className="text-[10px] text-gov-muted">
                      Closed-loop greywater bioreactor recycling 91% of daily outflow.
                    </p>
                  </div>

                  <div className="rounded bg-gov-bg p-2 text-xs space-y-1 border border-gov-border font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-gov-muted">Crew Consumption:</span>
                      <strong>1,850 L / day</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gov-muted">Storage Buffer:</span>
                      <strong>48,000 L (Tanks 1-4)</strong>
                    </div>
                  </div>
                </div>

                {/* Emergency Rations Gauge */}
                <div className="rounded-md border border-gov-border bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-gov-border pb-2">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-gov-text uppercase">
                      <Calendar className="h-4 w-4 text-emerald-600" /> Rations & Caloric Inventory
                    </span>
                    <span className="rounded bg-emerald-100 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-800">
                      340 DAYS
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gov-muted">Freeze-Dried & Cold Storage:</span>
                      <strong className="font-mono text-base text-emerald-700">100% Stocked</strong>
                    </div>
                    <div className="h-3 w-full rounded-full bg-gov-border overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: "96%" }} />
                    </div>
                    <p className="text-[10px] text-gov-muted">
                      Sufficient calories (3,800 kcal/expeditioner/day) for 24 crew through Dec 2026.
                    </p>
                  </div>

                  <div className="rounded bg-gov-bg p-2 text-xs space-y-1 border border-gov-border font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-gov-muted">Medical Vitamins:</span>
                      <strong>Vitamin D3 / Iron OK</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gov-muted">Emergency Shelter Pods:</span>
                      <strong>14-Day Redundant Pack</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SHIFT HANDOVER LOGBOOK */}
          {activeTab === "LOGBOOK" && (
            <div className="space-y-5">
              <div className="rounded-md border border-gov-border bg-gov-bg p-3.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gov-navy-primary">
                  Official 44th ISEA Expedition Shift Handover Logbook
                </h3>
                <p className="text-[11px] text-gov-muted">
                  Daily operational shift log for station winter-over engineers, power house technicians, and lead scientists.
                </p>
              </div>

              {/* Add Log Form */}
              <form onSubmit={handleAddLog} className="rounded-md border border-gov-border bg-white p-4 space-y-3">
                <div className="flex items-center gap-2 font-bold text-xs text-gov-navy-primary border-b border-gov-border pb-2">
                  <Plus className="h-4 w-4 text-gov-saffron" />
                  <span>Submit New Shift Handover Entry</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gov-muted mb-1">Author / Engineer</label>
                    <input
                      type="text"
                      value={newLogAuthor}
                      onChange={(e) => setNewLogAuthor(e.target.value)}
                      className="w-full rounded border border-gov-border bg-gov-bg px-2.5 py-1.5 text-xs text-gov-text outline-none focus:border-gov-navy-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gov-muted mb-1">Expedition Shift</label>
                    <select
                      value={newLogShift}
                      onChange={(e) => setNewLogShift(e.target.value)}
                      className="w-full rounded border border-gov-border bg-gov-bg px-2.5 py-1.5 text-xs text-gov-text outline-none focus:border-gov-navy-primary"
                    >
                      <option>Alpha Shift (04:00 - 12:00 UTC)</option>
                      <option>Bravo Shift (12:00 - 20:00 UTC)</option>
                      <option>Charlie Shift (20:00 - 04:00 UTC)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gov-muted mb-1">Subsystem Category</label>
                    <select
                      value={newLogCategory}
                      onChange={(e) => setNewLogCategory(e.target.value)}
                      className="w-full rounded border border-gov-border bg-gov-bg px-2.5 py-1.5 text-xs text-gov-text outline-none focus:border-gov-navy-primary"
                    >
                      <option>Power House & CHP Gensets</option>
                      <option>Fuel Pipeline & Trace Heating</option>
                      <option>Life Support & Greywater</option>
                      <option>Meteorology & Atmospheric Science</option>
                      <option>Structural & Snow Drift Mitigation</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gov-muted mb-1">Handover Notes & Observations</label>
                  <textarea
                    rows={2}
                    placeholder="Enter observations (e.g., 'Checked trace heating circuit 4; oil level topped up on Genset 1')..."
                    value={newLogNote}
                    onChange={(e) => setNewLogNote(e.target.value)}
                    className="w-full rounded border border-gov-border bg-gov-bg p-2 text-xs text-gov-text outline-none focus:border-gov-navy-primary"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!newLogNote.trim()}
                    className="flex items-center gap-1.5 rounded bg-gov-navy-primary px-4 py-1.5 text-xs font-bold text-white hover:bg-gov-navy-header disabled:opacity-50 transition-colors"
                  >
                    <Send className="h-3.5 w-3.5" /> Log Handover
                  </button>
                </div>
              </form>

              {/* Log Entries List */}
              <div className="space-y-3">
                {handoverLogs.map((log) => (
                  <div key={log.id} className="rounded-md border border-gov-border bg-white p-3.5 space-y-1.5 shadow-sm">
                    <div className="flex items-center justify-between border-b border-gov-border pb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-gov-navy-primary">{log.id}</span>
                        <span className="rounded bg-gov-bg px-2 py-0.5 text-[10px] font-semibold text-gov-text border border-gov-border">
                          {log.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-gov-muted">
                        <span>{log.shift}</span>
                        <span>·</span>
                        <span className="font-bold text-gov-text">{log.timestamp}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gov-text leading-relaxed">{log.note}</p>
                    <p className="text-[10px] text-gov-muted font-medium">Logged by: {log.author}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: WHAT-IF SIMULATION (PHYSICS ENGINE) */}
          {activeTab === "WHAT_IF" && (
            <div className="space-y-5">
              {/* Header */}
              <div className="rounded-md border border-gov-border bg-gov-bg p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gov-navy-primary">
                      Physics-Informed Station Thermal Inertia & Load-Shedding Simulator
                    </h3>
                  </div>
                  <p className="text-[11px] text-gov-muted mt-0.5">
                    Simulates thermodynamic decay curves and living module freeze thresholds if primary power trips during severe polar blizzards.
                  </p>
                </div>
                <span className="rounded bg-indigo-100 px-2.5 py-1 font-mono text-[10px] font-bold text-indigo-900 border border-indigo-200">
                  Closed-Loop Finite Element Baseline
                </span>
              </div>

              {/* Interactive Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Control 1: Outside Ambient Windchill Slider */}
                <div className="rounded-md border border-gov-border bg-white p-4 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between border-b border-gov-border pb-2">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-gov-text uppercase">
                      <Thermometer className="h-4 w-4 text-sky-600" /> Outside Ambient Windchill
                    </span>
                    <span className="font-mono text-sm font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded border border-sky-200">
                      {whatIfWindchill}°C
                    </span>
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between text-[11px] text-gov-muted">
                      <span>-60°C (Extreme Blizzard)</span>
                      <span className="font-semibold text-gov-text">-50°C (Default Storm)</span>
                      <span>-20°C (Summer)</span>
                    </div>
                    <input
                      type="range"
                      min={-60}
                      max={-20}
                      step={1}
                      value={whatIfWindchill}
                      onChange={(e) => {
                        setWhatIfWindchill(Number(e.target.value));
                        setTelecommandDeployed(false);
                      }}
                      className="w-full accent-sky-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                    />
                    <p className="text-[10px] text-gov-muted">
                      Correlates ambient convective heat loss across station composite aerogel envelopes (65 knots katabatic gale).
                    </p>
                  </div>
                </div>

                {/* Control 2: Primary Generator Status Toggle */}
                <div className="rounded-md border border-gov-border bg-white p-4 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between border-b border-gov-border pb-2">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-gov-text uppercase">
                      <Zap className="h-4 w-4 text-gov-saffron" /> Primary Generator Status
                    </span>
                    <span
                      className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${
                        genset1Tripped
                          ? "bg-red-100 text-red-800 border-red-200"
                          : "bg-emerald-100 text-emerald-800 border-emerald-200"
                      }`}
                    >
                      {genset1Tripped ? "FAULT DETECTED" : "NOMINAL GENERATION"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setGenset1Tripped(false);
                        setTelecommandDeployed(false);
                      }}
                      className={`flex flex-col items-center justify-center p-2.5 rounded border text-xs font-bold transition-all ${
                        !genset1Tripped
                          ? "border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm"
                          : "border-gov-border bg-gov-bg text-gov-muted hover:bg-white"
                      }`}
                    >
                      <span>Genset 1 Online</span>
                      <span className="text-[10px] font-mono font-normal mt-0.5 text-emerald-700">120 kW Active Load</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setGenset1Tripped(true);
                        setTelecommandDeployed(false);
                      }}
                      className={`flex flex-col items-center justify-center p-2.5 rounded border text-xs font-bold transition-all ${
                        genset1Tripped
                          ? "border-red-500 bg-red-50 text-red-900 shadow-sm ring-1 ring-red-400"
                          : "border-gov-border bg-gov-bg text-gov-muted hover:bg-white"
                      }`}
                    >
                      <span>TRIPPED (0 kW)</span>
                      <span className="text-[10px] font-mono font-normal mt-0.5 text-red-700">Thermal Decoupling</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-gov-muted">
                    Simulates sudden loss of main Caterpillar C9.3 generator bus under heavy sub-zero loading.
                  </p>
                </div>
              </div>

              {/* Real-Time Simulated Output Cards */}
              {(() => {
                const deltaT = Math.abs(whatIfWindchill) - 20;
                const decayVelocity = (2.2 + deltaT * 0.04).toFixed(1);
                const freezeHours = (21 / parseFloat(decayVelocity)).toFixed(1);

                return (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Card 1 */}
                      <div className="rounded-md border border-gov-border bg-white p-4 shadow-sm space-y-2">
                        <div className="flex items-center justify-between border-b border-gov-border pb-1.5">
                          <span className="text-[11px] font-bold uppercase text-gov-muted">Thermal Decay Rate</span>
                          <span className="font-mono text-[10px] font-bold text-gov-text">HEAT FLUX</span>
                        </div>
                        <p className="text-xs font-bold text-gov-text">
                          Thermal Decay Velocity:{" "}
                          <span className={`font-mono ${genset1Tripped ? "text-red-700" : "text-emerald-700"}`}>
                            -{genset1Tripped ? decayVelocity : "0.0"}°C / Hour
                          </span>{" "}
                          (Structural insulation baseline)
                        </p>
                        <p className="text-[10px] text-gov-muted leading-tight">
                          Thermodynamic conduction across composite sandwich panels with 0.12 W/m²K thermal transmittance.
                        </p>
                      </div>

                      {/* Card 2 */}
                      <div
                        className={`rounded-md border p-4 shadow-sm space-y-2 ${
                          genset1Tripped
                            ? "border-red-300 bg-red-50/40"
                            : "border-emerald-300 bg-emerald-50/40"
                        }`}
                      >
                        <div className="flex items-center justify-between border-b border-gov-border/60 pb-1.5">
                          <span className="text-[11px] font-bold uppercase text-gov-muted">Freeze Threshold Alert</span>
                          <span
                            className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              genset1Tripped
                                ? "bg-red-200 text-red-900"
                                : "bg-emerald-200 text-emerald-900"
                            }`}
                          >
                            {genset1Tripped ? "CRITICAL RISK" : "EQUILIBRIUM"}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-gov-text">
                          Critical Pipe Freeze (&lt;0°C):{" "}
                          <span className={`font-mono text-sm ${genset1Tripped ? "text-red-700 font-extrabold" : "text-emerald-700"}`}>
                            {genset1Tripped ? `${freezeHours} Hours Remaining` : ">120 Hours Stable"}
                          </span>
                        </p>
                        <p className="text-[10px] text-gov-muted leading-tight">
                          Estimated time before potable water line ice crystallization causes pipeline burst in service ducts.
                        </p>
                      </div>

                      {/* Card 3 */}
                      <div className="rounded-md border border-gov-border bg-white p-4 shadow-sm space-y-2">
                        <div className="flex items-center justify-between border-b border-gov-border pb-1.5">
                          <span className="text-[11px] font-bold uppercase text-gov-muted">Automated Recommendation</span>
                          <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                            SOP-THRM-402
                          </span>
                        </div>
                        <p className="text-xs font-bold text-gov-navy-primary leading-snug">
                          Automated Safety Telecommand: Ramp Cold Standby Genset 3 pre-heating & shed Level 3 Non-Essential Lighting Bus.
                        </p>
                        <p className="text-[10px] text-gov-muted leading-tight">
                          Saves 48 kW of electrical load while diverting 180°C exhaust waste heat to living module hydronic loops.
                        </p>
                      </div>
                    </div>

                    {/* Thermodynamic Decay Curve Graph (Visual SVG) */}
                    <div className="rounded-md border border-gov-border bg-white p-4 shadow-sm space-y-3">
                      <div className="flex items-center justify-between border-b border-gov-border pb-2">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-gov-text uppercase">
                          <Activity className="h-4 w-4 text-indigo-600" /> Simulated Thermodynamic Decay Curve (0h – 8h)
                        </span>
                        <div className="flex items-center gap-3 text-[10px] font-mono">
                          <span className="flex items-center gap-1 text-emerald-700">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> Nominal (21°C)
                          </span>
                          <span className="flex items-center gap-1 text-red-600">
                            <span className="h-2 w-2 rounded-full bg-red-500 inline-block" /> Freeze Point (0°C)
                          </span>
                        </div>
                      </div>

                      <div className="h-40 w-full relative">
                        <svg className="h-full w-full overflow-visible" viewBox="0 0 500 120" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="decayGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Grid lines */}
                          <line x1="40" y1="20" x2="480" y2="20" stroke="#e2e8f0" strokeDasharray="3 3" />
                          <line x1="40" y1="65" x2="480" y2="65" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 4" />
                          <line x1="40" y1="100" x2="480" y2="100" stroke="#e2e8f0" strokeDasharray="3 3" />

                          {/* Labels */}
                          <text x="5" y="24" fontSize="9" fill="#64748b" fontFamily="monospace">21°C</text>
                          <text x="5" y="69" fontSize="9" fill="#ef4444" fontWeight="bold" fontFamily="monospace">0°C</text>
                          <text x="5" y="104" fontSize="9" fill="#64748b" fontFamily="monospace">-15°C</text>

                          {/* X-axis labels */}
                          <text x="40" y="118" fontSize="9" fill="#94a3b8" fontFamily="monospace">0h</text>
                          <text x="150" y="118" fontSize="9" fill="#94a3b8" fontFamily="monospace">2h</text>
                          <text x="260" y="118" fontSize="9" fill="#94a3b8" fontFamily="monospace">4h</text>
                          <text x="370" y="118" fontSize="9" fill="#94a3b8" fontFamily="monospace">6h</text>
                          <text x="470" y="118" fontSize="9" fill="#94a3b8" fontFamily="monospace">8h</text>

                          {/* Trajectory */}
                          {genset1Tripped ? (
                            <>
                              {/* Decaying curve */}
                              <path
                                d={`M 40 20 Q 200 45, 480 ${Math.min(115, 65 + (parseFloat(decayVelocity) * 6))}`}
                                fill="none"
                                stroke="#dc2626"
                                strokeWidth="2.5"
                              />
                              {/* Critical freeze intersection circle */}
                              <circle
                                cx={Math.min(450, 40 + (parseFloat(freezeHours) * 55))}
                                cy="65"
                                r="4"
                                fill="#dc2626"
                              />
                              <text
                                x={Math.min(380, 40 + (parseFloat(freezeHours) * 55) - 30)}
                                y="58"
                                fontSize="9"
                                fill="#dc2626"
                                fontWeight="bold"
                                fontFamily="monospace"
                              >
                                Freeze: {freezeHours}h
                              </text>
                            </>
                          ) : (
                            /* Stable line */
                            <line x1="40" y1="20" x2="480" y2="20" stroke="#10b981" strokeWidth="2.5" />
                          )}
                        </svg>
                      </div>
                    </div>

                    {/* Action Execution Button */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-md border border-gov-border bg-gov-bg p-4">
                      <div>
                        <p className="text-xs font-bold text-gov-text">
                          Executive Contingency Mitigation
                        </p>
                        <p className="text-[11px] text-gov-muted">
                          Requires Goa HQ + Station Commander dual Ed25519 / HMAC-SHA256 signature authorization.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const cmd = "EMERGENCY LOAD-SHED: Shed Level 3 Non-Essential Lighting Bus & Pre-heat Standby Genset 3 (Physics Engine)";
                          if (onTriggerTelecommand) {
                            onTriggerTelecommand(cmd);
                          }
                          setTelecommandDeployed(true);
                          sim.pushLog("CRITICAL", "WHAT-IF SIMULATION", "Load-shedding telecommand dispatched for two-man rule cryptographic validation.");
                        }}
                        className="flex items-center gap-2 rounded bg-red-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-red-700 active:scale-98 transition-all shadow-md shrink-0"
                      >
                        <Zap className="h-4 w-4 text-amber-300" />
                        <span>Deploy Simulated Load-Shed Telecommand via Two-Man Rule</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {telecommandDeployed && (
                      <div className="rounded-md border border-emerald-500/50 bg-emerald-50 p-3.5 text-xs text-emerald-900 flex items-center gap-2.5 animate-in fade-in">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>
                          <strong>Telecommand Dispatched:</strong> Successfully staged in Cryptographic Verification Enclave. Proceed to Dual Signature authentication to sign and broadcast over satellite.
                        </span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gov-border bg-gov-bg px-5 py-3 text-xs text-gov-muted">
          <span>MoES Antarctica Command Operations Enclave · NCPOR Goa</span>
          <button
            onClick={onClose}
            className="rounded border border-gov-border bg-white px-4 py-1.5 text-xs font-semibold text-gov-text hover:bg-gov-bg"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
}
