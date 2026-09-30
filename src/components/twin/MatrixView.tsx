import type { Reading } from "@/lib/telemetry";
import { BHARATI_ROOMS, MAITRI_ROOMS, SECTION_ZONES, SUBSYSTEM_LABELS, type Status, type Subsystem } from "@/lib/twin-data";

const DOT: Record<Status, string> = {
  normal: "bg-gov-normal",
  warning: "bg-gov-warning",
  critical: "bg-gov-critical",
};

export function MatrixView({
  station = "maitri",
  readings,
  filters,
  selected,
  onSelect,
}: {
  station?: string;
  readings: Record<string, Reading>;
  filters: Record<Subsystem, boolean>;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const isMaitri = station === "maitri" || station === "maitri-2";
  const ALL = isMaitri ? MAITRI_ROOMS : [...BHARATI_ROOMS, ...SECTION_ZONES];
  const zones = ALL.filter((z) => z.subsystems.some((s) => filters[s]));

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-gov-bg p-3">
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(Object.keys(SUBSYSTEM_LABELS) as Subsystem[]).slice(0, 4).map((s) => {
          const list = zones.filter((z) => z.subsystems.includes(s));
          const crit = list.filter((z) => readings[z.id]?.status !== "normal").length;
          return (
            <div key={s} className="rounded-sm border border-gov-border bg-white p-3">
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-gov-muted">
                {SUBSYSTEM_LABELS[s]}
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-gov-text">{list.length}</p>
              <p className="font-mono text-[10px] text-gov-muted">{crit} zones flagged</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-2">
        {zones.map((z) => {
          const r = readings[z.id];
          const status = r?.status ?? z.status;
          return (
            <button
              key={z.id}
              type="button"
              onClick={() => onSelect(z.id)}
              className={`rounded-sm border bg-white p-2.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
                selected === z.id ? "border-gov-active ring-1 ring-gov-active" : "border-gov-border"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${DOT[status]} ${
                    status !== "normal" ? "gov-pulse-fast" : ""
                  }`}
                />
                <span className="min-w-0 truncate text-xs font-semibold text-gov-text">{z.name}</span>
              </div>
              <p className="mt-0.5 font-mono text-[10px] text-gov-muted">{z.grid}</p>
              <div className="mt-2 grid grid-cols-3 gap-1 font-mono text-[10px]">
                <Cell label="°C" value={r ? r.temp.toFixed(1) : "--"} />
                <Cell label="kW" value={r ? r.power.toFixed(1) : "--"} />
                <Cell label="CREW" value={r ? String(r.occupancy) : "--"} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[2px] bg-gov-bg px-1.5 py-1">
      <p className="text-[8px] font-bold tracking-wider text-gov-disabled">{label}</p>
      <p className="font-bold text-gov-text">{value}</p>
    </div>
  );
}
