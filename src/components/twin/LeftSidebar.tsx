import {
  Flame,
  Grid3x3,
  Layers,
  LayoutPanelTop,
  PanelLeftClose,
  PanelLeftOpen,
  Power,
  SplitSquareVertical,
  Thermometer,
  Users,
  Droplets,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SUBSYSTEM_LABELS, type Subsystem } from "@/lib/twin-data";

export type ViewMode = "plan" | "section" | "matrix";

const VIEWS: { id: ViewMode; label: string; icon: LucideIcon }[] = [
  { id: "plan", label: "Floor Plan (Top-Down)", icon: LayoutPanelTop },
  { id: "section", label: "Vertical Cross-Section", icon: SplitSquareVertical },
  { id: "matrix", label: "Subsystem Grid Matrix", icon: Grid3x3 },
];

const LEVELS = [
  { id: 3, label: "Level 3", sub: "Terrace & Observatory" },
  { id: 2, label: "Level 2", sub: "Living & Command Zone" },
  { id: 1, label: "Level 1", sub: "Technical & Utility Zone" },
] as const;

const SUB_ICONS: Record<Subsystem, LucideIcon> = {
  power: Power,
  hvac: Thermometer,
  fire: Flame,
  crew: Users,
  water: Droplets,
};

export function LeftSidebar({
  collapsed,
  onCollapse,
  view,
  onView,
  level,
  onLevel,
  filters,
  onFilter,
}: {
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
  view: ViewMode;
  onView: (v: ViewMode) => void;
  level: number;
  onLevel: (l: number) => void;
  filters: Record<Subsystem, boolean>;
  onFilter: (s: Subsystem) => void;
}) {
  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-gov-border bg-gov-card transition-[width] duration-300 ${
        collapsed ? "w-[60px]" : "w-[250px]"
      }`}
    >
      <div className="flex items-center justify-between border-b border-gov-border px-3 py-2.5">
        {!collapsed && (
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gov-muted">
            Control Navigation
          </span>
        )}
        <button
          type="button"
          onClick={() => onCollapse(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-sm text-gov-muted transition-colors hover:bg-gov-bg hover:text-gov-navy-primary"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-2 py-3">
        <Section title="View Mode" collapsed={collapsed}>
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => onView(v.id)}
              title={v.label}
              className={`flex w-full items-center gap-2.5 rounded-sm border px-2.5 py-2 text-left text-xs font-medium transition-all ${
                view === v.id
                  ? "border-gov-navy-primary bg-gov-navy-primary text-white shadow-sm"
                  : "border-transparent text-gov-text hover:border-gov-border hover:bg-gov-bg"
              }`}
            >
              <v.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{v.label}</span>}
            </button>
          ))}
        </Section>



        <Section title="Subsystem Filters" collapsed={collapsed}>
          {(Object.keys(SUBSYSTEM_LABELS) as Subsystem[]).map((s) => {
            const Icon = SUB_ICONS[s];
            const on = filters[s];
            return (
              <button
                key={s}
                type="button"
                onClick={() => onFilter(s)}
                title={SUBSYSTEM_LABELS[s]}
                className={`flex w-full items-center gap-2.5 rounded-sm border px-2.5 py-2 text-left text-xs transition-all ${
                  on ? "border-gov-border bg-gov-bg text-gov-text" : "border-transparent text-gov-disabled"
                }`}
              >
                <span
                  className={`grid h-4 w-4 shrink-0 place-items-center rounded-[3px] border text-[9px] font-bold ${
                    on
                      ? "border-gov-navy-primary bg-gov-navy-primary text-white"
                      : "border-gov-border bg-white text-transparent"
                  }`}
                >
                  ×
                </span>
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {!collapsed && <span className="truncate">{SUBSYSTEM_LABELS[s]}</span>}
              </button>
            );
          })}
        </Section>
      </div>

      {!collapsed && (
        <div className="border-t border-gov-border px-3 py-2.5">
          <p className="font-mono text-[10px] leading-relaxed text-gov-muted">
            BUILD 4.2.1 · TWIN-CORE
            <br />
            Sync: NCPOR Goa · Vasco
          </p>
        </div>
      )}
    </aside>
  );
}

function Section({
  title,
  collapsed,
  children,
}: {
  title: string;
  collapsed: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      {!collapsed && (
        <p className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-gov-disabled">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}
