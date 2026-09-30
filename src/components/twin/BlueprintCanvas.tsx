import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Crosshair, Maximize2, Minus, Plus, X } from "lucide-react";
import floorplanAsset from "@/assets/floorplan-level2.png.asset.json";
import sectionAsset from "@/assets/section-longitudinal.png.asset.json";
import transverseAsset from "@/assets/section-transverse.png.asset.json";
import type { LogEntry, Reading } from "@/lib/telemetry";
import { BHARATI_ROOMS, MAITRI_ROOMS, SECTION_ZONES, type Room, type Status, type Subsystem } from "@/lib/twin-data";

const STATUS_FILL: Record<Status, string> = {
  normal: "var(--gov-fill-normal)",
  warning: "var(--gov-fill-warning)",
  critical: "var(--gov-fill-critical)",
};
const STATUS_STROKE: Record<Status, string> = {
  normal: "var(--gov-status-normal)",
  warning: "var(--gov-status-warning)",
  critical: "var(--gov-status-critical)",
};

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 6;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export type CanvasBg = "plan" | "section" | "transverse";

export function BlueprintCanvas({
  station = "maitri",
  bg,
  onBg,
  readings,
  selected,
  onSelect,
  filters,
  activeAlert,
  onDismissAlert,
}: {
  station?: string;
  bg: CanvasBg;
  onBg: (b: CanvasBg) => void;
  readings: Record<string, Reading>;
  selected: string | null;
  onSelect: (id: string) => void;
  filters: Record<Subsystem, boolean>;
  activeAlert?: LogEntry | null;
  onDismissAlert?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const stateRef = useRef({ zoom, offset });
  stateRef.current = { zoom, offset };

  const isMaitriVariant = station === "maitri" || station === "maitri-2";

  const zones: Room[] =
    isMaitriVariant
      ? MAITRI_ROOMS
      : bg === "plan"
      ? BHARATI_ROOMS
      : (SECTION_ZONES.map((z) => ({ ...z })) as unknown as Room[]);
  const visible = zones.filter((z) => z.id === selected || z.subsystems.some((s) => filters[s]));
  const img =
    isMaitriVariant
      ? "/assets/maitri-blueprint.png"
      : bg === "plan"
      ? floorplanAsset.url
      : bg === "section"
      ? sectionAsset.url
      : transverseAsset.url;
  const ratio =
    isMaitriVariant
      ? 1024 / 571
      : bg === "plan"
      ? 1545 / 1018
      : bg === "section"
      ? 1600 / 617
      : 1600 / 813;

  const wheelRef = useRef<(e: WheelEvent) => void>(() => {});
  wheelRef.current = (e: WheelEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    // 1. Laptop Touchpad Pinch-to-zoom OR Ctrl + Mouse Wheel
    if (e.ctrlKey) {
      const { zoom: z, offset: o } = stateRef.current;
      // High-sensitivity factor for trackpad pinch
      const factor = Math.exp(-e.deltaY * 0.015);
      const next = clamp(z * factor, MIN_ZOOM, MAX_ZOOM);
      const k = next / z;
      setZoom(next);
      setOffset({ x: px - (px - o.x) * k, y: py - (py - o.y) * k });
      return;
    }

    // 2. Shift + Wheel = horizontal pan
    if (e.shiftKey) {
      setOffset((prev) => ({ x: prev.x - e.deltaY, y: prev.y }));
      return;
    }

    // 3. Two-finger trackpad swipe or mouse pan
    // If deltaX has substantial value or deltaMode === 0 with small deltaY, it's a trackpad two-finger pan
    if (Math.abs(e.deltaX) > 1 || (e.deltaMode === 0 && Math.abs(e.deltaY) < 30 && Math.abs(e.deltaX) > 0.1)) {
      setOffset((prev) => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
      return;
    }

    // 4. Standard discrete mouse wheel: zoom centered at cursor
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
    const { zoom: z, offset: o } = stateRef.current;
    const next = clamp(z * Math.exp(-dy * 0.002), MIN_ZOOM, MAX_ZOOM);
    const k = next / z;
    setZoom(next);
    setOffset({ x: px - (px - o.x) * k, y: py - (py - o.y) * k });
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      // PREVENT BROWSER FROM ZOOMING ENTIRE WEBPAGE
      e.preventDefault();
      e.stopPropagation();
      wheelRef.current(e);
    };

    // Attach to canvas container element
    el.addEventListener("wheel", onWheel, { passive: false });

    // Catch window-level wheel when pointer is within canvas to prevent browser native page zoom
    const onWindowWheel = (e: WheelEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const isInside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      if (isInside) {
        e.preventDefault();
        wheelRef.current(e);
      }
    };
    window.addEventListener("wheel", onWindowWheel, { passive: false });

    // Prevent Safari / Mac gesture pinch zoom
    const onGesture = (e: Event) => {
      e.preventDefault();
    };
    window.addEventListener("gesturestart", onGesture, { passive: false });
    window.addEventListener("gesturechange", onGesture, { passive: false });

    return () => {
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("wheel", onWindowWheel);
      window.removeEventListener("gesturestart", onGesture);
      window.removeEventListener("gesturechange", onGesture);
    };
  }, []);

  const zoomBy = useCallback((factor: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = rect.width / 2;
    const py = rect.height / 2;
    const { zoom: z, offset: o } = stateRef.current;
    const next = clamp(z * factor, MIN_ZOOM, MAX_ZOOM);
    const k = next / z;
    setZoom(next);
    setOffset({ x: px - (px - o.x) * k, y: py - (py - o.y) * k });
  }, []);

  const reset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const prevStation = useRef(station);
  const prevBg = useRef(bg);
  const lastTargetZoneRef = useRef<string | null>(null);

  // When station or bg view is changed manually, reset to centered full overview (zoom 1.0)
  useEffect(() => {
    const stationChanged = prevStation.current !== station;
    const bgChanged = prevBg.current !== bg;
    prevStation.current = station;
    prevBg.current = bg;

    if (stationChanged || bgChanged) {
      lastTargetZoneRef.current = null;
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    }
  }, [station, bg]);

  // Smoothly pan & zoom in to 1.45x on selected target area ONLY ONCE upon new selection
  useEffect(() => {
    if (!selected) {
      lastTargetZoneRef.current = null;
      return;
    }

    // Only auto-zoom once when a new zone is selected, allowing user to freely zoom out / pan afterwards
    if (lastTargetZoneRef.current === selected) return;
    lastTargetZoneRef.current = selected;

    const selZone = visible.find((z) => z.id === selected);
    if (!selZone) return;

    const timer = setTimeout(() => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const targetZoom = 1.45;
      const cx = selZone.x + selZone.w / 2;
      const cy = selZone.y + selZone.h / 2;

      const vx = (cx / 100 - 0.5) * rect.width;
      const vy = (cy / 100 - 0.5) * rect.height;

      setZoom(targetZoom);
      setOffset({
        x: -vx * targetZoom,
        y: -vy * targetZoom,
      });
    }, 40);

    return () => clearTimeout(timer);
  }, [selected, visible]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-gov-bg">
      {/* Prominent Banner across canvas for Maitri-II Next-Gen */}
      {station === "maitri-2" && (
        <div className="flex items-center justify-between border-b border-sky-400/50 bg-gradient-to-r from-sky-950 via-slate-900 to-sky-950 px-4 py-2 text-white shadow-sm shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-2.5 w-2.5 rounded-full bg-sky-400 animate-pulse shrink-0" />
            <span className="font-mono text-xs font-bold tracking-wide text-sky-200 truncate">
              Maitri-II Next-Gen Replacement Station · Digital Twin Architectural Baseline (MoES Horizon 2029)
            </span>
          </div>
          <span className="rounded bg-sky-500/25 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-300 border border-sky-400/40 shrink-0">
            Phase 1 CAD Baseline
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gov-border bg-gov-card px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="rounded-sm bg-gov-navy-header px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-white">
            {station === "maitri-2"
              ? "Maitri-II (Next-Gen) · Modular Architecture Baseline"
              : station === "maitri"
              ? "Maitri Station · 2D Blueprint Model"
              : bg === "plan"
              ? "Bharati Station · Level 2 Plan"
              : bg === "section"
              ? "Bharati Station · Section D–D′"
              : "Bharati Station · Section A–A′"}
          </span>
          <span className="truncate text-[11px] text-gov-muted">
            {visible.length} zones instrumented · live 3s polling
          </span>
        </div>
        {station === "bharati" && (
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                ["plan", "Floor Plan"],
                ["section", "Longitudinal"],
                ["transverse", "Transverse"],
              ] as [CanvasBg, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => onBg(id)}
                className={`rounded-sm border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  bg === id
                    ? "border-gov-navy-primary bg-gov-navy-primary text-white"
                    : "border-gov-border bg-white text-gov-muted hover:border-gov-navy-primary hover:text-gov-navy-primary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 touch-none overflow-hidden"
        style={{
          touchAction: "none",
          overscrollBehavior: "none",
          userSelect: "none",
          backgroundImage:
            "linear-gradient(var(--gov-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--gov-grid-line) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          cursor: drag.current ? "grabbing" : "grab",
        }}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
          (e.target as Element).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          setOffset({
            x: drag.current.ox + (e.clientX - drag.current.x),
            y: drag.current.oy + (e.clientY - drag.current.y),
          });
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerLeave={() => {
          drag.current = null;
          setHover(null);
        }}
      >
        {/* INCIDENT ALERT HUD BANNER (Dynamically sized, shows full alert message without truncation) */}
        {activeAlert && (
          <div className="pointer-events-auto absolute top-4 left-1/2 -translate-x-1/2 z-30 flex w-auto max-w-[92%] sm:max-w-2xl lg:max-w-3xl items-center justify-between gap-4 rounded-md border border-gov-critical/60 bg-white/98 px-4 py-3 shadow-[0_8px_30px_rgba(220,38,38,0.25)] backdrop-blur-md animate-in fade-in slide-in-from-top-3 duration-300">
            <div className="flex items-start gap-3 min-w-0">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border mt-0.5 ${
                activeAlert.level === "CRITICAL"
                  ? "border-gov-critical bg-gov-critical/15 text-gov-critical"
                  : "border-gov-warning bg-gov-warning/15 text-gov-warning"
              }`}>
                <AlertTriangle className="h-5 w-5 gov-pulse-fast" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`font-mono text-xs font-bold uppercase tracking-wider ${
                    activeAlert.level === "CRITICAL" ? "text-gov-critical" : "text-gov-warning"
                  }`}>
                    {activeAlert.level} ALERT · {activeAlert.source}
                  </span>
                  <span className="font-mono text-[10px] text-gov-muted bg-gov-bg px-1.5 py-0.5 rounded border border-gov-border">
                    {activeAlert.time}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-gov-text leading-snug mt-1 break-words">
                  {activeAlert.message}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onDismissAlert}
              className="flex items-center gap-1.5 rounded-sm border border-gov-border bg-gov-bg px-3 py-1.5 font-mono text-xs font-bold text-gov-text hover:bg-gov-border hover:text-gov-navy-primary transition-colors shrink-0 shadow-sm"
              title="Dismiss alert banner"
            >
              <span>Acknowledge</span>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div
          className="absolute inset-0 flex items-center justify-center p-4"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            transformOrigin: "center center",
            transition: drag.current ? "none" : "transform 120ms ease-out",
          }}
        >
          <div
            className="relative overflow-hidden rounded-sm border border-gov-border bg-white shadow-[0_10px_40px_-24px_rgba(0,42,84,0.6)]"
            style={{ aspectRatio: String(ratio), height: "100%", width: "auto", maxWidth: "100%" }}
          >
            <img
              src={img}
              alt={bg === "plan" ? "Level 2 floor plan blueprint" : "Building cross-section blueprint"}
              className="absolute inset-0 h-full w-full object-fill"
              draggable={false}
            />
            <div className="pointer-events-none absolute inset-0 bg-[var(--gov-blueprint-mask)]" />

            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
              {visible.map((z) => {
                const r = readings[z.id];
                const status = r?.status ?? z.status;
                const isSel = selected === z.id;
                const isAlert = isSel && Boolean(activeAlert);
                return (
                  <rect
                    key={z.id}
                    x={z.x}
                    y={z.y}
                    width={z.w}
                    height={z.h}
                    rx={0.4}
                    className={`cursor-pointer transition-[fill] duration-300 ${
                      isAlert
                        ? "gov-selected-blink"
                        : isSel
                        ? ""
                        : status === "critical"
                        ? "gov-pulse-fast"
                        : status === "warning"
                        ? "gov-pulse-slow"
                        : ""
                    }`}
                    fill={
                      isAlert
                        ? "rgba(239, 68, 68, 0.45)"
                        : isSel
                        ? "rgba(217, 119, 6, 0.25)"
                        : status === "critical"
                        ? "rgba(220, 38, 38, 0.35)"
                        : STATUS_FILL[status]
                    }
                    stroke={
                      isAlert
                        ? "#ef4444"
                        : isSel
                        ? "#ff9933"
                        : status === "critical"
                        ? "#dc2626"
                        : STATUS_STROKE[status]
                    }
                    strokeWidth={isSel ? 0.65 : status === "critical" ? 0.55 : 0.2}
                    vectorEffect="non-scaling-stroke"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(z.id);
                    }}
                    onPointerMove={(e) => {
                      const rect = containerRef.current?.getBoundingClientRect();
                      if (!rect) return;
                      setHover({ id: z.id, x: e.clientX - rect.left, y: e.clientY - rect.top });
                    }}
                    onPointerLeave={() => setHover(null)}
                  />
                );
              })}

              {/* TARGET OVERLAY FOR SELECTED ROOM */}
              {visible
                .filter((z) => selected === z.id)
                .map((z) => {
                  const cx = z.x + z.w / 2;
                  const cy = z.y + z.h / 2;
                  const isAlert = Boolean(activeAlert);
                  const strokeColor = isAlert
                    ? activeAlert?.level === "CRITICAL"
                      ? "#ef4444"
                      : "#ff9933"
                    : "#ff9933";

                  return (
                    <g key={`selected-overlay-${z.id}`} className="pointer-events-none">
                      {/* Subtle single alert ping ring ONLY if triggered from an alert */}
                      {isAlert && (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={Math.max(z.w, z.h) * 0.7}
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth="0.4"
                          className="animate-ping origin-center opacity-75"
                          style={{ transformOrigin: `${cx}% ${cy}%` }}
                        />
                      )}

                      {/* Corner target bracket markers */}
                      <path
                        d={`M ${z.x - 0.6} ${z.y + 1.8} L ${z.x - 0.6} ${z.y - 0.6} L ${z.x + 1.8} ${z.y - 0.6}`}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="0.5"
                      />
                      <path
                        d={`M ${z.x + z.w - 1.8} ${z.y - 0.6} L ${z.x + z.w + 0.6} ${z.y - 0.6} L ${z.x + z.w + 0.6} ${z.y + 1.8}`}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="0.5"
                      />
                      <path
                        d={`M ${z.x - 0.6} ${z.y + z.h - 1.8} L ${z.x - 0.6} ${z.y + z.h + 0.6} L ${z.x + 1.8} ${z.y + z.h + 0.6}`}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="0.5"
                      />
                      <path
                        d={`M ${z.x + z.w - 1.8} ${z.y + z.h + 0.6} L ${z.x + z.w + 0.6} ${z.y + z.h + 0.6} L ${z.x + z.w + 0.6} ${z.y + z.h - 1.8}`}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="0.5"
                      />

                      {/* Center Glowing Beacon Marker (Alert only) */}
                      {isAlert && (
                        <>
                          <circle cx={cx} cy={cy} r={1.0} fill={strokeColor} className="gov-pulse-fast" />
                          <circle cx={cx} cy={cy} r={0.35} fill="#ffffff" />
                        </>
                      )}

                      {/* Floating Target Zone badge above room */}
                      <g transform={`translate(${cx}, ${Math.max(2.2, z.y - 2.5)})`}>
                        <rect
                          x={isAlert ? "-10" : "-8.5"}
                          y="-2.4"
                          width={isAlert ? "20" : "17"}
                          height="3.0"
                          rx="0.5"
                          fill="#002a54"
                          stroke={strokeColor}
                          strokeWidth="0.25"
                        />
                        <text
                          x="0"
                          y="-0.4"
                          textAnchor="middle"
                          fill={strokeColor}
                          fontSize="1.6"
                          fontFamily="monospace"
                          fontWeight="bold"
                          letterSpacing="0.1"
                        >
                          {isAlert ? "INCIDENT TARGET" : "TARGET ZONE"}
                        </text>
                      </g>
                    </g>
                  );
                })}
            </svg>
          </div>
        </div>

        {(() => {
          const hoverZone = hover ? zones.find((z) => z.id === hover.id) : null;
          const hoverReading = hover
            ? readings[hover.id] ||
              (hoverZone
                ? {
                    temp: hoverZone.baseTemp,
                    humidity: 45,
                    occupancy: hoverZone.baseOccupancy,
                    power: hoverZone.basePower,
                    status: hoverZone.status,
                  }
                : null)
            : null;
          if (!hover || !hoverZone || !hoverReading) return null;

          const containerW = containerRef.current?.clientWidth ?? 800;
          const containerH = containerRef.current?.clientHeight ?? 600;
          const tooltipW = 230;
          const tooltipH = 140;

          // Flip tooltip to the left if hovering near the right side of the canvas
          const showOnLeft = hover.x + tooltipW + 20 > containerW;
          const leftPos = showOnLeft
            ? Math.max(8, hover.x - tooltipW - 14)
            : Math.min(containerW - tooltipW - 8, hover.x + 14);

          const topPos = clamp(hover.y - 60, 8, containerH - tooltipH - 8);

          return (
            <div
              className="pointer-events-none absolute z-20 w-56 rounded-sm border border-gov-border bg-white/97 p-2.5 shadow-lg backdrop-blur transition-all duration-75"
              style={{
                left: leftPos,
                top: topPos,
              }}
            >
              <p className="truncate text-xs font-bold text-gov-text">{hoverZone.name}</p>
              <p className="mb-1.5 font-mono text-[10px] text-gov-muted">{hoverZone.grid}</p>
              <dl className="space-y-0.5 font-mono text-[10px] text-gov-muted">
                <Row label="TEMP" value={`${hoverReading.temp.toFixed(1)} °C`} />
                <Row label="HUMIDITY" value={`${hoverReading.humidity.toFixed(0)} %`} />
                <Row label="OCCUPANCY" value={`${hoverReading.occupancy} crew`} />
                <Row label="POWER" value={`${hoverReading.power.toFixed(1)} kW`} />
                <Row label="STATUS" value={hoverReading.status.toUpperCase()} />
              </dl>
            </div>
          );
        })()}

        <div className="absolute bottom-3 right-3 flex flex-col gap-1 rounded-sm border border-gov-border bg-white p-1 shadow-md">
          <CtrlBtn onClick={() => zoomBy(1.25)} label="Zoom in">
            <Plus className="h-4 w-4" />
          </CtrlBtn>
          <CtrlBtn onClick={() => zoomBy(0.8)} label="Zoom out">
            <Minus className="h-4 w-4" />
          </CtrlBtn>
          <CtrlBtn onClick={reset} label="Reset pan and zoom">
            <Maximize2 className="h-4 w-4" />
          </CtrlBtn>
        </div>

        <div className="absolute bottom-3 left-3 flex items-center gap-3 rounded-sm border border-gov-border bg-white/95 px-2.5 py-1.5 font-mono text-[10px] text-gov-muted shadow-sm">
          <span className="flex items-center gap-1.5">
            <Crosshair className="h-3 w-3" /> {(zoom * 100).toFixed(0)}%
          </span>
          {(["normal", "warning", "critical"] as Status[]).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: STATUS_STROKE[s] }} />
              {s.toUpperCase()}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt>{label}</dt>
      <dd className="font-semibold text-gov-text">{value}</dd>
    </div>
  );
}

function CtrlBtn({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid h-8 w-8 place-items-center rounded-sm text-gov-muted transition-colors hover:bg-gov-bg hover:text-gov-navy-primary active:scale-95"
    >
      {children}
    </button>
  );
}
