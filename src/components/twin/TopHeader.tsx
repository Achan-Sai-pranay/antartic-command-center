import { useState, useRef, useEffect } from "react";
import {
  Bell,
  ChevronDown,
  ExternalLink,
  Radio,
  Snowflake,
  Trash2,
  X,
  AlertTriangle,
  Info,
  CheckCircle2,
  Gauge,
  Bot,
  ShieldCheck,
  ClipboardCheck,
  Leaf,
  Shield,
  Flame,
  Wind,
  Zap,
  Clock,
} from "lucide-react";
import { useClock, type LogEntry, type LogLevel } from "@/lib/telemetry";
import { resolveZoneInfo, STATIONS } from "@/lib/twin-data";
import { SatelliteStatusPill } from "./SatelliteStatusPill";
import { BandwidthStatsWidget } from "./BandwidthStatsWidget";
import { useSecurity, ROLES, type UserRole } from "@/lib/security-context";
import { usePolarSimulation, type IncidentType } from "@/lib/simulation-engine";

const LEVEL_STYLE: Record<LogLevel, { badge: string; icon: typeof AlertTriangle }> = {
  CRITICAL: { badge: "bg-gov-critical/15 text-gov-critical border-gov-critical/30", icon: AlertTriangle },
  WARN: { badge: "bg-gov-warning/15 text-gov-warning border-gov-warning/30", icon: AlertTriangle },
  INFO: { badge: "bg-gov-navy-primary/15 text-gov-navy-primary border-gov-navy-primary/30", icon: Info },
  SUCCESS: { badge: "bg-gov-normal/15 text-gov-normal border-gov-normal/30", icon: CheckCircle2 },
};

export function TopHeader({
  station,
  onStation,
  alarms,
  log = [],
  onSelectZone,
  onOpenCopilot,
  onOpenOperations,
  onOpenMadrid,
  onOpenAudit,
}: {
  station: string;
  onStation: (id: string) => void;
  alarms: number;
  log?: LogEntry[];
  onSelectZone?: (
    id: string,
    targetStation?: "maitri" | "bharati" | "maitri-2",
    targetView?: "plan" | "section" | "transverse",
    alert?: LogEntry | null
  ) => void;
  onOpenCopilot?: () => void;
  onOpenOperations?: () => void;
  onOpenMadrid?: () => void;
  onOpenAudit?: () => void;
}) {
  const now = useClock();
  const utcTime = now.toISOString().slice(11, 19);
  const ist = new Date(now.getTime() + 5.5 * 3600_000).toISOString().slice(11, 19);
  const active = STATIONS.find((s) => s.id === station) || STATIONS[0];

  const { role, setRole, roleConfig } = useSecurity();
  const sim = usePolarSimulation();

  const [open, setOpen] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showIncidentMenu, setShowIncidentMenu] = useState(false);
  const [showComplianceMenu, setShowComplianceMenu] = useState(false);
  const [showBandwidthWidget, setShowBandwidthWidget] = useState(false);
  const [filter, setFilter] = useState<LogLevel | "ALL">("ALL");
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const popoverRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);
  const incidentRef = useRef<HTMLDivElement>(null);
  const complianceRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) {
        setShowRoleMenu(false);
      }
      if (incidentRef.current && !incidentRef.current.contains(e.target as Node)) {
        setShowIncidentMenu(false);
      }
      if (complianceRef.current && !complianceRef.current.contains(e.target as Node)) {
        setShowComplianceMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeLogs = log.filter((l) => !dismissed.has(l.id));
  const filteredLogs = activeLogs.filter((l) => filter === "ALL" || l.level === filter);

  const handleDismiss = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed((prev) => new Set(prev).add(id));
  };

  const handleClearAll = () => {
    setDismissed(new Set(log.map((l) => l.id)));
  };

  const isBharati = station === "bharati";
  const tickerItems = isBharati
    ? [
        "Outside Temp: -28°C",
        "Wind: 42 knots SW",
        "Solar Radiation: Low",
        "Blizzard Watch: Active until 18:00 UTC",
        "Sea Ice Extent: 4.2 km",
        "Fuel Reserve: 78% (ATF-Arctic)",
        "Desalination Output: 2.4 kL/day",
      ]
    : [
        "Outside Temp: -35°C",
        "Wind: 58 knots SE",
        "Schirmacher Oasis: High Katabatic Winds",
        "Priyadarshini Lake Pump: De-icing Loop Active",
        "Fuel Reserve: 74% (ATF-Arctic)",
        "Living Pods: Normal Atmospheric Pressure",
      ];

  return (
    <header className="z-30 bg-gov-navy-header text-white shadow-[0_2px_12px_rgba(0,42,84,0.35)]">
      {/* Upper Main Toolbar with Clean Flexbox Layout (Zero Collision) */}
      <div className="flex items-center justify-between gap-3 px-3 py-2 lg:px-4">
        {/* Left: Brand & Station Selector & Role Switcher */}
        <div className="flex items-center gap-2 shrink-0 min-w-0">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-cyan-400/40 bg-gov-navy-light/60 overflow-hidden shadow-inner p-0.5">
            <img src="/favicon.svg" alt="PolarTwin Logo" className="h-full w-full object-contain drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]" />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-gov-saffron">
              MoES · NCPOR
            </p>
            <div className="flex items-center gap-1.5 min-w-0">
              <h1 className="text-xs sm:text-sm font-bold truncate">
                PolarTwin <span className="hidden xl:inline text-white/80 font-normal">· Antarctic Digital Twin Command</span>
              </h1>
              <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[9px] font-bold text-sky-300 border border-sky-400/30 shrink-0">
                MoES PS-26060
              </span>
            </div>
          </div>

          {/* Station Switcher */}
          <div className="relative ml-1 hidden sm:block shrink-0">
            <select
              aria-label="Select research station"
              value={station}
              onChange={(e) => onStation(e.target.value)}
              className="appearance-none rounded-sm border border-white/25 bg-white/10 py-1 pl-2.5 pr-7 text-xs font-semibold text-white outline-none focus:border-gov-saffron cursor-pointer hover:bg-white/15 transition-colors"
            >
              {STATIONS.map((s) => (
                <option key={s.id} value={s.id} className="text-gov-text bg-white">
                  {s.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/70" />
          </div>

          {/* Enterprise Role Switcher */}
          <div className="relative hidden md:block shrink-0" ref={roleRef}>
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className={`flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-[11px] font-semibold transition-all ${roleConfig.badgeClass} hover:opacity-90 shadow-sm`}
              title="Switch Access Control Role"
            >
              <Shield className="h-3 w-3" />
              <span>{roleConfig.shortLabel}</span>
              <ChevronDown className="h-3 w-3 opacity-70" />
            </button>

            {showRoleMenu && (
              <div className="absolute left-0 top-8 z-50 w-64 rounded-md border border-gov-border bg-white p-1 text-gov-text shadow-xl">
                <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gov-muted border-b border-gov-border">
                  Enterprise Role Authorization
                </div>
                {(["OBSERVER", "GOA_OPERATOR", "STATION_COMMANDER"] as UserRole[]).map((r) => {
                  const cfg = ROLES[r];
                  return (
                    <button
                      key={r}
                      onClick={() => {
                        setRole(r);
                        setShowRoleMenu(false);
                      }}
                      className={`flex w-full flex-col p-2 text-left rounded transition-colors ${
                        role === r ? "bg-gov-navy-primary/10 text-gov-navy-primary font-bold" : "hover:bg-gov-bg"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span>{cfg.name}</span>
                        {role === r && <CheckCircle2 className="h-3.5 w-3.5 text-gov-navy-primary" />}
                      </div>
                      <span className="text-[10px] text-gov-muted font-normal mt-0.5 leading-tight">
                        {cfg.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Action Controls, Time & Notification Toolbar */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Satellite Storm Intermittency & Store-and-Forward Pill */}
          <SatelliteStatusPill />

          {/* Operations & SOPs Drawer Button */}
          <button
            onClick={onOpenOperations}
            title="Open Station Operations & SOP Runner"
            className="flex items-center gap-1.5 rounded-sm border border-white/25 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/90 hover:bg-white/20 transition-all shadow-sm shrink-0"
          >
            <ClipboardCheck className="h-3.5 w-3.5 text-gov-saffron" />
            <span className="hidden sm:inline">Operations</span>
          </button>

          {/* Unified Station Tools & Simulation Dropdown */}
          <div className="relative shrink-0" ref={complianceRef}>
            <button
              onClick={() => setShowComplianceMenu(!showComplianceMenu)}
              title="Failure Injection Simulation & MoES Compliance Protocols"
              className="flex items-center gap-1.5 rounded-sm border border-amber-500/50 bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition-all shadow-sm"
            >
              <Flame className="h-3.5 w-3.5 text-amber-400" />
              <span>Tools & Sim</span>
              <ChevronDown className="h-3 w-3 opacity-70" />
            </button>

            {showComplianceMenu && (
              <div className="absolute right-0 top-8 z-50 w-80 rounded-md border border-gov-border bg-white p-1.5 text-gov-text shadow-2xl animate-in fade-in duration-150">
                {/* Section 1: Failure Injection */}
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 rounded mb-1 flex items-center gap-1.5">
                  <Flame className="h-3 w-3 text-amber-600" />
                  <span>Failure Injection Simulation Engine</span>
                </div>
                <button
                  onClick={() => {
                    sim.triggerIncident("INCIDENT_A_HVAC_FIRE");
                    setShowComplianceMenu(false);
                  }}
                  className="flex w-full flex-col p-2 text-left rounded hover:bg-red-50 text-xs transition-colors"
                >
                  <span className="font-bold text-red-700">Incident A: HVAC Smoke Surge (1372 PPM)</span>
                  <span className="text-[10px] text-gov-muted mt-0.5">
                    Spikes Level 2 conference room to RED, drops airflow to 281 CFM.
                  </span>
                </button>
                <button
                  onClick={() => {
                    sim.triggerIncident("INCIDENT_B_GENSET_VIBE");
                    setShowComplianceMenu(false);
                  }}
                  className="flex w-full flex-col p-2 text-left rounded hover:bg-amber-50 text-xs transition-colors"
                >
                  <span className="font-bold text-amber-800">Incident B: Genset 2 Bearing Vibration (+3.8%)</span>
                  <span className="text-[10px] text-gov-muted mt-0.5">
                    Shifts Genset 2 panel to AMBER warning status.
                  </span>
                </button>
                <button
                  onClick={() => {
                    sim.triggerIncident("INCIDENT_C_PIPELINE_DROP");
                    setShowComplianceMenu(false);
                  }}
                  className="flex w-full flex-col p-2 text-left rounded hover:bg-amber-50 text-xs transition-colors"
                >
                  <span className="font-bold text-amber-800">Incident C: Fuel Pipeline Drop (2.1 Bar)</span>
                  <span className="text-[10px] text-gov-muted mt-0.5">
                    Sub-zero thermal contraction pressure drop warning.
                  </span>
                </button>

                {/* Section 2: Protocols & Audits */}
                <div className="mt-2 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gov-navy-primary bg-gov-bg rounded mb-1 border-t border-gov-border pt-1.5 flex items-center gap-1.5">
                  <ShieldCheck className="h-3 w-3 text-gov-navy-primary" />
                  <span>Compliance & Analytics Protocols</span>
                </div>
                <button
                  onClick={() => {
                    if (onOpenMadrid) onOpenMadrid();
                    setShowComplianceMenu(false);
                  }}
                  className="flex w-full items-start gap-2.5 rounded p-2 text-left hover:bg-emerald-50 transition-colors"
                >
                  <Leaf className="mt-0.5 h-4 w-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-gov-text">Madrid Protocol (1991)</p>
                    <p className="text-[10px] text-gov-muted">Incinerator flue & greywater environmental compliance.</p>
                  </div>
                </button>
                <button
                  onClick={() => {
                    if (onOpenAudit) onOpenAudit();
                    setShowComplianceMenu(false);
                  }}
                  className="flex w-full items-start gap-2.5 rounded p-2 text-left hover:bg-gov-bg transition-colors"
                >
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-indigo-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-gov-text">Security Audit Log</p>
                    <p className="text-[10px] text-gov-muted">Tamper-evident SHA-256 cryptographic command ledger.</p>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setShowBandwidthWidget(true);
                    setShowComplianceMenu(false);
                  }}
                  className="flex w-full items-start gap-2.5 rounded p-2 text-left hover:bg-amber-50 transition-colors"
                >
                  <Gauge className="mt-0.5 h-4 w-4 text-amber-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-gov-text">Bandwidth Optimization</p>
                    <p className="text-[10px] text-gov-muted">Protobuf telemetry engine with 85% bandwidth reduction.</p>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Dedicated High-Priority Time & Notification Container */}
          <div className="flex shrink-0 items-center gap-2 pl-2 border-l border-white/20">
            {/* Time & UTC Clock Block - Always visible, never squished */}
            <div className="flex shrink-0 flex-col items-end justify-center rounded border border-white/25 bg-white/10 px-2.5 py-0.5 text-right shadow-sm">
              <div className="flex items-center gap-1.5 font-mono text-xs font-bold tabular-nums text-white">
                <Clock className="h-3.5 w-3.5 text-gov-saffron shrink-0" />
                <span className="whitespace-nowrap">{utcTime} UTC</span>
              </div>
              <p className="font-mono text-[9px] text-white/70 tracking-tight leading-none mt-0.5 whitespace-nowrap">
                {active.coords}
              </p>
            </div>

            {/* Alert Center Popover - Always visible, prominent */}
            <div className="relative shrink-0" ref={popoverRef}>
              <button
                type="button"
                onClick={() => setOpen(!open)}
                className={`relative grid h-8 w-8 place-items-center rounded-sm border transition-colors ${
                  open ? "border-gov-saffron bg-white/20 text-gov-saffron" : "border-white/25 bg-white/10 hover:bg-white/20"
                }`}
                aria-label={`${alarms} active alerts`}
                title="Interactive Notification & Alert Center"
              >
                <Bell className="h-4 w-4 text-white" />
                {activeLogs.length > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full border border-white bg-gov-critical px-1 text-[9px] font-bold">
                    {activeLogs.length}
                  </span>
                )}
              </button>

            {open && (
              <div className="absolute right-0 top-10 z-50 w-80 sm:w-96 rounded-md border border-gov-border bg-white text-gov-text shadow-2xl">
                <div className="flex items-center justify-between border-b border-gov-border bg-gov-navy-header px-3.5 py-2 text-white">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-gov-saffron" />
                    <span className="text-xs font-bold uppercase tracking-wider">Alert Center</span>
                    <span className="rounded-full bg-white/15 px-2 py-0.5 font-mono text-[10px]">
                      {activeLogs.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {activeLogs.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAll}
                        className="flex items-center gap-1 rounded-sm bg-white/10 px-2 py-1 text-[10px] font-medium text-white/90 hover:bg-white/20 hover:text-white"
                      >
                        <Trash2 className="h-3 w-3" /> Clear
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="grid h-6 w-6 place-items-center rounded-sm text-white/70 hover:bg-white/10 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1 border-b border-gov-border bg-gov-bg p-2">
                  {(["ALL", "CRITICAL", "WARN", "INFO"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFilter(f)}
                      className={`rounded-sm border px-2 py-1 font-mono text-[10px] font-semibold transition-colors ${
                        filter === f
                          ? "border-gov-navy-primary bg-gov-navy-primary text-white"
                          : "border-gov-border bg-white text-gov-muted hover:text-gov-navy-primary"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-gov-border">
                  {filteredLogs.length === 0 ? (
                    <div className="p-6 text-center text-gov-muted">
                      <p className="text-xs font-semibold">No active notifications</p>
                      <p className="mt-1 font-mono text-[10px]">All station systems operating normally.</p>
                    </div>
                  ) : (
                    filteredLogs.map((l) => {
                      const style = LEVEL_STYLE[l.level];
                      const Icon = style.icon;
                      const loc =
                        resolveZoneInfo(l.source, l.message, l.zoneId) ||
                        (l.zoneId ? { id: l.zoneId, station: l.station || "maitri", view: l.view || "plan", name: l.source } : null);

                      return (
                        <div
                          key={l.id}
                          onClick={() => {
                            if (loc && onSelectZone) {
                              onSelectZone(loc.id, loc.station, loc.view, l);
                              setOpen(false);
                            }
                          }}
                          className={`group flex items-start gap-2.5 p-3 transition-colors hover:bg-gov-bg ${
                            loc ? "cursor-pointer" : ""
                          }`}
                        >
                          <div className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border ${style.badge}`}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="truncate text-xs font-bold text-gov-text">{l.source}</span>
                              <span className="shrink-0 font-mono text-[9px] text-gov-muted">{l.time}</span>
                            </div>
                            <p className="mt-0.5 text-xs text-gov-text/80">{l.message}</p>
                            {loc && (
                              <div className="mt-1 flex items-center justify-between gap-2">
                                <span className="rounded-[2px] bg-gov-bg px-1.5 py-0.5 font-mono text-[9px] font-medium text-gov-muted border border-gov-border">
                                  {loc.station === "maitri" ? "Maitri · 2D Plan" : loc.view === "section" ? "Bharati · Cross-Section" : "Bharati · Floor Plan"}
                                </span>
                                <span className="flex items-center gap-1 font-mono text-[10px] font-bold text-gov-navy-primary group-hover:underline">
                                  Inspect Zone <ExternalLink className="h-3 w-3" />
                                </span>
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleDismiss(l.id, e)}
                            className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-sm text-gov-disabled hover:bg-gov-border hover:text-gov-text"
                            title="Dismiss notification"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

      {showBandwidthWidget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md">
            <BandwidthStatsWidget onClose={() => setShowBandwidthWidget(false)} />
          </div>
        </div>
      )}
    </header>
  );
}
