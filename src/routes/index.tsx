import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TopHeader } from "@/components/twin/TopHeader";
import { LeftSidebar, type ViewMode } from "@/components/twin/LeftSidebar";
import { BlueprintCanvas, type CanvasBg } from "@/components/twin/BlueprintCanvas";
import { InspectorPanel } from "@/components/twin/InspectorPanel";
import { MatrixView } from "@/components/twin/MatrixView";
import { EventLog } from "@/components/twin/EventLog";
import { resolveZoneInfo, MAITRI_ROOMS, SECTION_ZONES, type Subsystem } from "@/lib/twin-data";
import { cryptoTelecommand } from "@/lib/crypto-telecommand";
import { DualSignatureModal } from "@/components/twin/DualSignatureModal";
import { SecurityProvider } from "@/lib/security-context";
import { usePolarSimulation } from "@/lib/simulation-engine";
import { PolarisAICopilot } from "@/components/twin/PolarisAICopilot";
import { OperationsDrawer } from "@/components/twin/OperationsDrawer";
import { MadridProtocolModal } from "@/components/twin/MadridProtocolModal";
import { SecurityAuditModal } from "@/components/twin/SecurityAuditModal";
import { Bot, Sparkles, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Antarctic Digital Twin — MoES Station Command (PolarTwin)" },
      {
        name: "description",
        content:
          "End-to-end interactive Digital Twin and Remote Management Platform for India's Bharati and Maitri Antarctic research stations under MoES / NCPOR.",
      },
      { property: "og:title", content: "Antarctic Digital Twin — MoES Station Command (PolarTwin)" },
      {
        property: "og:description",
        content:
          "Real-time telemetry, 2-of-2 two-man rule cryptographic telecommands, CAD blueprints, and Polaris AI Copilot.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardWrapper,
});

function DashboardWrapper() {
  return (
    <SecurityProvider>
      <Dashboard />
    </SecurityProvider>
  );
}

function Dashboard() {
  const { readings, log, pushLog, update, alarms, activeIncident } = usePolarSimulation();
  const [station, setStation] = useState("maitri");
  const [collapsed, setCollapsed] = useState(false);
  const [view, setView] = useState<ViewMode>("plan");
  const [bg, setBg] = useState<CanvasBg>("plan");
  const [level, setLevel] = useState(2);
  const [selected, setSelected] = useState<string | null>("meteorology-lab");
  const [activeAlert, setActiveAlert] = useState<any | null>(null);

  // Modals & Drawers State
  const [showDualSigModal, setShowDualSigModal] = useState(false);
  const [pendingCommand, setPendingCommand] = useState<string>("");
  const [showCopilot, setShowCopilot] = useState(false);
  const [showOperations, setShowOperations] = useState(false);
  const [showMadrid, setShowMadrid] = useState(false);
  const [showAudit, setShowAudit] = useState(false);

  const [filters, setFilters] = useState<Record<Subsystem, boolean>>({
    power: true,
    hvac: true,
    fire: true,
    crew: true,
    water: true,
  });

  // When an incident triggers, auto-navigate to its target zone and highlight it
  useEffect(() => {
    if (activeIncident && activeIncident.status === "ACTIVE") {
      const loc = resolveZoneInfo("", "", activeIncident.targetZoneId);
      if (loc) {
        if (loc.station !== station) {
          setStation(loc.station);
        }
        if (loc.view === "section" || loc.view === "transverse") {
          setView("section");
          setBg(loc.view as CanvasBg);
        } else {
          setView("plan");
          setBg("plan");
        }
        setSelected(activeIncident.targetZoneId);
        setActiveAlert({
          id: 9999,
          time: activeIncident.timestamp,
          level: "CRITICAL",
          source: activeIncident.targetZoneName,
          message: activeIncident.description,
          zoneId: activeIncident.targetZoneId,
        });
      }
    }
  }, [activeIncident]);

  const setViewMode = (v: ViewMode) => {
    setView(v);
    setSelected(null);
    setActiveAlert(null);
    if (v === "plan") {
      setBg("plan");
    }
    if (v === "section") {
      setBg("section");
      if (station === "maitri") {
        setStation("bharati");
      }
    }
  };

  const handleSelectZone = (
    id: string,
    targetStation?: "maitri" | "bharati" | "maitri-2",
    targetView?: "plan" | "section" | "transverse",
    alert?: any | null
  ) => {
    const loc = resolveZoneInfo("", "", id);
    const destStation =
      targetStation || loc?.station || (MAITRI_ROOMS.some((r) => r.id === id) ? (station === "maitri-2" ? "maitri-2" : "maitri") : "bharati");
    const destView =
      targetView || loc?.view || (SECTION_ZONES.some((r) => r.id === id) ? "section" : "plan");

    if (station !== destStation) {
      setStation(destStation);
      pushLog("INFO", "Station Auto-Switch", `Navigated to ${destStation.toUpperCase()} Station for inspection.`);
    }

    if (destView === "section" || destView === "transverse") {
      setView("section");
      setBg(destView as CanvasBg);
    } else {
      setView("plan");
      setBg("plan");
    }

    setSelected(id);
    setActiveAlert(alert ?? null);
  };

  const handleEmergencyOverride = (command: string) => {
    setPendingCommand(command);
    cryptoTelecommand.createRequest(command, station, selected || "station-wide");
    setShowDualSigModal(true);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gov-bg text-gov-text relative">
      {/* Top Header */}
      <TopHeader
        station={station}
        onStation={(s) => {
          setStation(s);
          setSelected(null);
          setActiveAlert(null);
          pushLog("INFO", "Station Switch", `Operator switched telemetry context to ${s.toUpperCase()} station.`);
        }}
        alarms={alarms}
        log={log}
        onSelectZone={handleSelectZone}
        onOpenCopilot={() => setShowCopilot(true)}
        onOpenOperations={() => setShowOperations(true)}
        onOpenMadrid={() => setShowMadrid(true)}
        onOpenAudit={() => setShowAudit(true)}
      />

      {/* Main Content Layout */}
      <div className="flex min-h-0 flex-1">
        <div className="hidden md:flex">
          <LeftSidebar
            collapsed={collapsed}
            onCollapse={setCollapsed}
            view={view}
            onView={setViewMode}
            level={level}
            onLevel={setLevel}
            filters={filters}
            onFilter={(s) => setFilters((f) => ({ ...f, [s]: !f[s] }))}
          />
        </div>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
            {view === "matrix" ? (
              <MatrixView
                station={station}
                readings={readings as any}
                filters={filters}
                selected={selected}
                onSelect={(id) => handleSelectZone(id, undefined, undefined, null)}
              />
            ) : (
              <BlueprintCanvas
                station={station}
                bg={bg}
                onBg={(b) => {
                  setBg(b);
                  setSelected(null);
                  setActiveAlert(null);
                  setView(b === "plan" ? "plan" : "section");
                }}
                readings={readings as any}
                selected={selected}
                onSelect={(id) => handleSelectZone(id, undefined, undefined, null)}
                filters={filters}
                activeAlert={activeAlert}
                onDismissAlert={() => setActiveAlert(null)}
              />
            )}
            <InspectorPanel
              selected={selected}
              reading={selected ? (readings[selected] as any) : undefined}
              onUpdate={update as any}
              onLog={pushLog}
              onEmergencyOverride={handleEmergencyOverride}
            />
          </div>
          <EventLog log={log} onSelectZone={handleSelectZone} />
        </main>
      </div>

      {/* Floating Action Button for Polaris AI Copilot (Commercial Light Theme) */}
      {!showCopilot && (
        <div className="fixed bottom-14 right-5 z-40">
          <button
            onClick={() => setShowCopilot(true)}
            title="Launch Polaris AI Copilot (Gemini 3.7 Flash)"
            className="group relative flex items-center gap-3 rounded-full bg-white pl-2.5 pr-4 py-2 shadow-[0_10px_35px_rgba(0,0,0,0.14)] border border-slate-200/90 hover:border-blue-400 hover:shadow-[0_14px_40px_rgba(37,99,235,0.2)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
          >
            <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 text-white shadow-sm">
              <Bot className="h-4 w-4 group-hover:rotate-12 transition-transform duration-200" />
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 tracking-tight">Polaris AI</span>
                <span className="rounded-full bg-blue-50 px-1.5 py-0.2 text-[9px] font-semibold text-blue-700 border border-blue-200">
                  Online
                </span>
              </div>
              <p className="text-[10px] font-medium text-slate-500 -mt-0.5">Ask questions & SOPs</p>
            </div>
            <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse ml-0.5" />
          </button>
        </div>
      )}

      {/* Two-Man Rule Cryptographic Telecommand Modal */}
      {showDualSigModal && (
        <DualSignatureModal
          onClose={() => setShowDualSigModal(false)}
          onExecuteLog={(msg) => pushLog("SUCCESS", "CRYPTOGRAPHIC TELECOMMAND", msg)}
          initialCommand={pendingCommand}
          station={station}
          zoneId={selected || "station-wide"}
        />
      )}

      {/* Polaris AI Copilot Modal */}
      <PolarisAICopilot
        isOpen={showCopilot}
        onClose={() => setShowCopilot(false)}
        station={station}
      />

      {/* Operations & SOPs Drawer */}
      <OperationsDrawer
        isOpen={showOperations}
        onClose={() => setShowOperations(false)}
        station={station}
        onTriggerTelecommand={(cmd) => {
          setPendingCommand(cmd);
          cryptoTelecommand.createRequest(cmd, station, selected || "station-wide");
          setShowOperations(false);
          setShowDualSigModal(true);
        }}
      />

      {/* Madrid Protocol Environmental Modal */}
      {showMadrid && (
        <MadridProtocolModal
          onClose={() => setShowMadrid(false)}
          station={station}
        />
      )}

      {/* Security Audit Log Modal */}
      {showAudit && (
        <SecurityAuditModal
          onClose={() => setShowAudit(false)}
        />
      )}
    </div>
  );
}
