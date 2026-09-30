import React from "react";
import { Leaf, ShieldCheck, Flame, Droplets, Gauge, AlertTriangle, CheckCircle2, X, ExternalLink, Activity } from "lucide-react";
import { usePolarSimulation } from "@/lib/simulation-engine";

export function MadridProtocolModal({ onClose, station }: { onClose: () => void; station: string }) {
  const sim = usePolarSimulation();
  const env = sim.environmental;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-emerald-500/50 bg-gov-card text-gov-text shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gov-border bg-gov-navy-header px-6 py-3.5 text-white">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shadow-sm">
              <Leaf className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-emerald-300">
                  Madrid Protocol Environmental Telemetry Enclave
                </h2>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-300 border border-emerald-500/40">
                  100% COMPLIANT
                </span>
              </div>
              <p className="text-xs text-white/70">
                Protocol on Environmental Protection to the Antarctic Treaty · MoES / NCPOR Continuous SCADA Verification
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md border border-white/20 bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Compliance Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-500/40 bg-emerald-50/70 p-4 text-emerald-950 shadow-sm">
            <div className="flex items-center gap-3.5">
              <ShieldCheck className="h-9 w-9 text-emerald-600 shrink-0" />
              <div>
                <h3 className="font-bold text-sm sm:text-base text-emerald-900">
                  Antarctic Specially Managed Area (ASMA) Environmental Rating: A+
                </h3>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Real-time supervisory telemetry adheres strictly to Treaty Annex III (Waste Management) & Annex IV (Marine & Priyadarshini Lake Protection). Zero ice sheet or marine discharge.
                </p>
              </div>
            </div>
            <div className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-mono font-bold text-white shadow-md">
              ANNEX SCORE: 100 / 100
            </div>
          </div>

          {/* Environmental Telemetry Grid - Wide Boxes with Single-Line Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* System 1: High-Temp Waste Incinerator */}
            <div className="flex flex-col justify-between rounded-xl border border-gov-border bg-white p-5 shadow-sm transition-all hover:border-gov-muted hover:shadow-md">
              <div>
                <div className="flex items-center justify-between border-b border-gov-border pb-3 mb-4">
                  <span className="flex items-center gap-2 text-xs font-bold text-gov-navy-primary uppercase tracking-wide">
                    <Flame className="h-4 w-4 text-amber-500" /> Waste Incinerator (Dual-Chamber)
                  </span>
                  <span className="rounded bg-emerald-100 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-800 border border-emerald-200">
                    ANNEX III OK
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 border-b border-gov-border/60 pb-2 text-xs">
                    <span className="text-gov-muted whitespace-nowrap font-medium">Combustion Core Temp:</span>
                    <span className="font-mono text-xs font-bold text-gov-text whitespace-nowrap">{env.incineratorTempC}°C</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-b border-gov-border/60 pb-2 text-xs">
                    <span className="text-gov-muted whitespace-nowrap font-medium">HEPA/Catalytic Filtration:</span>
                    <span className="font-mono text-xs font-bold text-emerald-600 whitespace-nowrap">
                      {env.incineratorFilterEfficiencyPct}% Efficiency
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-b border-gov-border/60 pb-2 text-xs">
                    <span className="text-gov-muted whitespace-nowrap font-medium">Flue Gas Opacity:</span>
                    <span className="font-mono text-xs font-bold text-gov-text whitespace-nowrap">
                      {env.flueGasOpacityPct}% (Max Allowed: 5.0%)
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-lg bg-gov-bg p-2.5 text-[11px] text-gov-muted border border-gov-border leading-relaxed">
                Ash Residue: 100% hermetically sealed in steel canisters for mainland return on expedition vessel.
              </div>
            </div>

            {/* System 2: Greywater Bioreactor & Treatment */}
            <div className="flex flex-col justify-between rounded-xl border border-gov-border bg-white p-5 shadow-sm transition-all hover:border-gov-muted hover:shadow-md">
              <div>
                <div className="flex items-center justify-between border-b border-gov-border pb-3 mb-4">
                  <span className="flex items-center gap-2 text-xs font-bold text-gov-navy-primary uppercase tracking-wide">
                    <Droplets className="h-4 w-4 text-sky-500" /> Greywater Treatment Plant
                  </span>
                  <span className="rounded bg-sky-100 px-2.5 py-0.5 font-mono text-[10px] font-bold text-sky-800 border border-sky-200">
                    ANNEX IV OK
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 border-b border-gov-border/60 pb-2 text-xs">
                    <span className="text-gov-muted whitespace-nowrap font-medium">Closed-Loop Recovery Rate:</span>
                    <span className="font-mono text-xs font-bold text-sky-600 whitespace-nowrap">
                      {env.greywaterRecoveryPct}% Recycled
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-b border-gov-border/60 pb-2 text-xs">
                    <span className="text-gov-muted whitespace-nowrap font-medium">UV Sterilization:</span>
                    <span className="font-mono text-xs font-bold text-emerald-600 whitespace-nowrap">
                      ACTIVE (40 mJ/cm²)
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-b border-gov-border/60 pb-2 text-xs">
                    <span className="text-gov-muted whitespace-nowrap font-medium">BOD Effluent:</span>
                    <span className="font-mono text-xs font-bold text-gov-text whitespace-nowrap">
                      {env.greywaterBodMgL} mg/L (Polar Limit: &lt; 10 mg/L)
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-lg bg-gov-bg p-2.5 text-[11px] text-gov-muted border border-gov-border leading-relaxed">
                Purified permeate recycled continuously for heating loops, laundry, and boiler feed water.
              </div>
            </div>

            {/* System 3: Sub-surface Fuel Pipeline Acoustic Leak Monitor */}
            <div className={`flex flex-col justify-between rounded-xl border p-5 shadow-sm transition-all hover:shadow-md ${
              env.pipelineLeakIndex === "WARNING" ? "border-amber-500/60 bg-amber-50/30" : "border-gov-border bg-white"
            }`}>
              <div>
                <div className="flex items-center justify-between border-b border-gov-border pb-3 mb-4">
                  <span className="flex items-center gap-2 text-xs font-bold text-gov-navy-primary uppercase tracking-wide">
                    <Gauge className="h-4 w-4 text-gov-saffron" /> Sub-Surface Fuel Pipeline
                  </span>
                  <span className={`rounded px-2.5 py-0.5 font-mono text-[10px] font-bold border ${
                    env.pipelineLeakIndex === "WARNING"
                      ? "bg-amber-100 text-amber-800 border-amber-300 animate-pulse"
                      : "bg-emerald-100 text-emerald-800 border-emerald-200"
                  }`}>
                    ● {env.pipelineLeakIndex}
                  </span>
                </div>

                <div className="mb-3">
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-800 border border-emerald-200">
                    Multi-Sensor Kalman Mass-Balance: NOMINAL (Sub-Zero Wax Drift Suppressed)
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 border-b border-gov-border/60 pb-2 text-xs">
                    <span className="text-gov-muted whitespace-nowrap font-medium">Conduit Pressure:</span>
                    <span className={`font-mono text-xs font-bold whitespace-nowrap ${
                      env.pipelinePressureBar < 3.5 ? "text-amber-600 font-extrabold" : "text-gov-text"
                    }`}>
                      {env.pipelinePressureBar} Bar (Nominal: 4.2 Bar)
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-b border-gov-border/60 pb-2 text-xs">
                    <span className="text-gov-muted whitespace-nowrap font-medium">Acoustic Leak Pulse:</span>
                    <span className="font-mono text-xs font-bold text-emerald-600 whitespace-nowrap">
                      ZERO FREQUENCY SHIFT
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-b border-gov-border/60 pb-2 text-xs">
                    <span className="text-gov-muted whitespace-nowrap font-medium">Cathodic Potential:</span>
                    <span className="font-mono text-xs font-bold text-gov-text whitespace-nowrap">
                      {env.cathodicProtectionV} V (Anti-corrosion OK)
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-lg bg-gov-bg p-2.5 text-[11px] text-gov-muted border border-gov-border leading-relaxed">
                Acoustic fiber-optic wave sensors spaced every 10 meters along permafrost jacket.
              </div>
            </div>
          </div>

          {/* Madrid Protocol Articles Checklist */}
          <div className="rounded-xl border border-gov-border bg-white p-5 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gov-navy-primary mb-3.5 flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-600" />
              Antarctic Treaty Environmental Protocol Compliance Scorecard
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
              {[
                { title: "Annex I: Environmental Impact Assessment (EIA)", status: "Comprehensive EIA Approved by CEP/MoES (Zero Residual Footprint)", pass: true },
                { title: "Annex II: Conservation of Antarctic Fauna and Flora", status: "Protected Area Larsemann Hills & Schirmacher Oasis Buffer Active", pass: true },
                { title: "Annex III: Waste Disposal and Waste Management", status: "Zero Landfill. Thermal Combustion + Return-to-Mainland India", pass: true },
                { title: "Annex IV: Prevention of Marine & Priyadarshini Pollution", status: "Priyadarshini Lake Water Catchment Guarded at 100% Purity", pass: true },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3 rounded-lg border border-gov-border bg-gov-bg/60 p-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-gov-text">{item.title}</p>
                    <p className="text-[11px] text-gov-muted mt-0.5">{item.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gov-border bg-gov-bg px-6 py-3.5 text-xs text-gov-muted">
          <span>National Centre for Polar and Ocean Research · Environmental SCADA Management Section</span>
          <button
            onClick={onClose}
            className="rounded-lg border border-gov-border bg-white px-5 py-2 text-xs font-bold text-gov-text hover:bg-gov-bg transition-colors shadow-sm"
          >
            Close Environmental Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
