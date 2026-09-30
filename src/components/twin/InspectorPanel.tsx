import {
  Activity,
  BellOff,
  Fan,
  Flame,
  Gauge,
  Lock,
  Thermometer,
  Unlock,
  Users,
  Zap,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Reading } from "@/lib/telemetry";
import { BHARATI_ROOMS, MAITRI_ROOMS, SECTION_ZONES, type Status } from "@/lib/twin-data";
import { useSecurity } from "@/lib/security-context";

const ALL = [...BHARATI_ROOMS, ...MAITRI_ROOMS, ...SECTION_ZONES];

const STATUS_TEXT: Record<Status, string> = {
  normal: "text-gov-normal",
  warning: "text-gov-warning",
  critical: "text-gov-critical",
};

export function InspectorPanel({
  selected,
  reading,
  onUpdate,
  onLog,
  onEmergencyOverride,
}: {
  selected: string | null;
  reading: Reading | undefined;
  onUpdate: (id: string, patch: Partial<Reading>) => void;
  onLog: (level: "INFO" | "WARN" | "CRITICAL" | "SUCCESS", source: string, message: string) => void;
  onEmergencyOverride?: (command: string) => void;
}) {
  const { role } = useSecurity();
  const isObserver = role === "OBSERVER";
  const zone = ALL.find((z) => z.id === selected);
  const activeReading =
    reading ||
    (zone
      ? {
          temp: zone.baseTemp,
          humidity: 44,
          airflow: 250,
          ppm: zone.status === "critical" ? 1250 : zone.status === "warning" ? 890 : 440,
          power: zone.basePower,
          occupancy: zone.baseOccupancy,
          status: zone.status,
          target: Math.round(zone.baseTemp),
          fan: zone.subsystems.includes("hvac"),
          locked: false,
          alarmSilenced: false,
          crew: [],
          history: Array.from({ length: 24 }, (_, i) => ({
            t: `${String(i).padStart(2, "0")}:00`,
            temp: zone.baseTemp + Math.sin((i / 24) * Math.PI * 2) * 1.2,
            power: zone.basePower,
          })),
        }
      : undefined);

  if (!zone || !activeReading) {
    return (
      <aside className="hidden w-[320px] shrink-0 flex-col border-l border-gov-border bg-gov-card xl:flex">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
          <Gauge className="h-9 w-9 text-gov-disabled" strokeWidth={1.2} />
          <p className="text-sm font-semibold text-gov-text">No zone selected</p>
          <p className="text-xs text-gov-muted">
            Select any highlighted zone on the blueprint to stream its live telemetry.
          </p>
        </div>
      </aside>
    );
  }

  const act = (msg: string, level: "INFO" | "SUCCESS" | "WARN" = "INFO") => onLog(level, zone.name, `${zone.name}: ${msg}`);

  return (
    <aside className="flex w-full shrink-0 flex-col border-l border-gov-border bg-gov-card xl:w-[320px]">
      <div className="border-b border-gov-border bg-gov-navy-header px-3 py-2.5 text-white">
        <p className="truncate text-sm font-bold uppercase tracking-wide">{zone.name}</p>
        <p className="font-mono text-[10px] text-white/70">
          {zone.grid} · Level {zone.level}
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
        <div className="flex items-center justify-between rounded-sm border border-gov-border bg-gov-bg px-2.5 py-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gov-muted">Zone Status</span>
          <span className={`font-mono text-xs font-bold ${STATUS_TEXT[activeReading.status]}`}>
            ● {activeReading.status.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Metric icon={Thermometer} label="Temperature" value={`${activeReading.temp.toFixed(1)}°C`} />
          <Metric icon={Fan} label="Airflow" value={`${activeReading.airflow.toFixed(0)} CFM`} />
          <Metric
            icon={Flame}
            label="Smoke / CO₂"
            value={`${activeReading.ppm.toFixed(0)} PPM`}
            danger={activeReading.ppm > 1100}
          />
          <Metric icon={Zap} label="Power Draw" value={`${activeReading.power.toFixed(2)} kW`} />
        </div>

        <div className="rounded-sm border border-gov-border p-2.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gov-muted">
              Target Threshold
            </span>
            <span className="font-mono text-xs font-bold text-gov-navy-primary">{activeReading.target}°C</span>
          </div>
          <input
            type="range"
            min={-20}
            max={40}
            value={activeReading.target}
            aria-label="Temperature target threshold"
            onChange={(e) => onUpdate(zone.id, { target: Number(e.target.value) })}
            className="w-full accent-[var(--gov-navy-primary)]"
          />
        </div>

        <div className="rounded-sm border border-gov-border p-2.5">
          <div className="mb-1.5 flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-gov-muted" />
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gov-muted">
              Occupancy · {activeReading.occupancy}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {activeReading.crew.length === 0 && <span className="text-[11px] text-gov-disabled">Unoccupied zone</span>}
            {activeReading.crew.map((c) => (
              <span
                key={c}
                className="rounded-sm border border-gov-border bg-gov-bg px-1.5 py-0.5 font-mono text-[10px] text-gov-text"
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        <Chart title="24H Temperature (°C)" data={activeReading.history} dataKey="temp" color="#0284c7" area />
        <Chart title="24H Energy Consumption (kW)" data={activeReading.history} dataKey="power" color="#d97706" />

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gov-muted">Remote Control</p>
            {isObserver && (
              <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold text-sky-800 border border-sky-300">
                READ-ONLY
              </span>
            )}
          </div>

          {isObserver && (
            <p className="rounded border border-sky-500/30 bg-sky-500/10 p-2 text-[10px] text-sky-700 leading-snug">
              Telecommands disabled in Observer/Scientist role. Switch to Goa Operator or Station Commander to execute overrides.
            </p>
          )}

          {activeReading.status === "critical" && (
            <button
              onClick={() => {
                if (onEmergencyOverride) {
                  onEmergencyOverride(`EMERGENCY_FAN_START_AND_BREAKER_ISOLATION_${zone.id.toUpperCase()}`);
                }
              }}
              disabled={isObserver}
              className={`w-full flex items-center justify-center gap-1.5 rounded border p-2 text-xs font-bold transition-all ${
                isObserver
                  ? "bg-white/10 border-gov-border text-gov-disabled cursor-not-allowed"
                  : "border-rose-500 bg-rose-600 text-white hover:bg-rose-700 shadow-md animate-pulse"
              }`}
            >
              <Flame className="h-4 w-4" />
              <span>Emergency Fan Start & Breaker Trip</span>
            </button>
          )}

          <ControlBtn
            icon={Thermometer}
            label="Override Heating (+1°C)"
            disabled={isObserver}
            onClick={() => {
              if (isObserver) return;
              onUpdate(zone.id, { target: activeReading.target + 1 });
              act(`heating setpoint overridden to ${activeReading.target + 1}°C.`, "SUCCESS");
            }}
          />
          <ControlBtn
            icon={Fan}
            label={activeReading.fan ? "Toggle Exhaust Fan — ON" : "Toggle Exhaust Fan — OFF"}
            active={activeReading.fan}
            disabled={isObserver}
            onClick={() => {
              if (isObserver) return;
              onUpdate(zone.id, { fan: !activeReading.fan });
              act(`exhaust fan ${activeReading.fan ? "stopped" : "started"}.`);
            }}
          />
          <ControlBtn
            icon={activeReading.locked ? Lock : Unlock}
            label={activeReading.locked ? "Unlock Door" : "Lock Door"}
            active={activeReading.locked}
            disabled={isObserver}
            onClick={() => {
              if (isObserver) return;
              onUpdate(zone.id, { locked: !activeReading.locked });
              act(`door ${activeReading.locked ? "unlocked" : "locked"} by remote operator.`, "WARN");
            }}
          />
          <ControlBtn
            icon={BellOff}
            label={activeReading.alarmSilenced ? "Alarm Silenced" : "Silence Alarm"}
            active={activeReading.alarmSilenced}
            disabled={isObserver}
            onClick={() => {
              if (isObserver) return;
              onUpdate(zone.id, { alarmSilenced: !activeReading.alarmSilenced });
              act(`local alarm ${activeReading.alarmSilenced ? "re-armed" : "silenced"}.`, "WARN");
            }}
          />
          <button
            onClick={() => {
              if (onEmergencyOverride) {
                onEmergencyOverride(`TRIGGER_EMERGENCY_ISOLATION_${zone.id.toUpperCase()}`);
              }
            }}
            disabled={isObserver}
            className={`w-full flex items-center justify-center gap-1.5 rounded border py-1.5 px-2 text-xs font-bold transition-all mt-2 ${
              isObserver
                ? "border-gov-border bg-gov-bg text-gov-disabled cursor-not-allowed"
                : "border-amber-500/60 bg-amber-500/15 text-amber-700 hover:bg-amber-500/30"
            }`}
          >
            <Lock className="h-3.5 w-3.5 text-gov-saffron" />
            <span>Dual-Sig Emergency Override</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  danger,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-sm border p-2.5 transition-colors ${
        danger ? "border-gov-critical bg-gov-critical/5" : "border-gov-border bg-white"
      }`}
    >
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className={`h-3.5 w-3.5 ${danger ? "text-gov-critical" : "text-gov-muted"}`} />
        <span className="truncate text-[9px] font-bold uppercase tracking-[0.12em] text-gov-muted">{label}</span>
      </div>
      <p className={`font-mono text-base font-bold tabular-nums ${danger ? "text-gov-critical" : "text-gov-text"}`}>
        {value}
      </p>
    </div>
  );
}

function Chart({
  title,
  data,
  dataKey,
  color,
  area,
}: {
  title: string;
  data: { t: string; temp: number; power: number }[];
  dataKey: "temp" | "power";
  color: string;
  area?: boolean;
}) {
  return (
    <div className="rounded-sm border border-gov-border p-2.5">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-gov-muted">{title}</p>
      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          {area ? (
            <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
              <CartesianGrid stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="t" tick={{ fontSize: 9, fill: "#94a3b8" }} interval={5} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={38} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 2, borderColor: "#e2e8f0" }} />
              <Area type="monotone" dataKey={dataKey} stroke={color} fill={color} fillOpacity={0.15} strokeWidth={1.6} />
            </AreaChart>
          ) : (
            <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
              <CartesianGrid stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="t" tick={{ fontSize: 9, fill: "#94a3b8" }} interval={5} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={38} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 2, borderColor: "#e2e8f0" }} />
              <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.6} dot={false} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ControlBtn({
  icon: Icon,
  label,
  onClick,
  active,
  disabled,
}: {
  icon: typeof Activity;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2 rounded-sm border px-2.5 py-2 text-left text-xs font-medium transition-all ${
        disabled
          ? "border-gov-border bg-gov-bg/60 text-gov-disabled cursor-not-allowed"
          : active
          ? "border-gov-navy-primary bg-gov-navy-primary/10 text-gov-navy-primary active:scale-[0.98]"
          : "border-gov-border bg-white text-gov-text hover:border-gov-navy-primary hover:bg-gov-bg active:scale-[0.98]"
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}
