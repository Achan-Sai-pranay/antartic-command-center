// Realistic Physics Simulation Engine & Closed-Loop Resolution for PolarTwin
import { useState, useEffect, useCallback } from "react";
import { BHARATI_ROOMS, MAITRI_ROOMS, SECTION_ZONES, type Room, type Status } from "./twin-data";
import { edgeStoreForward } from "./edge-store-forward";
import { protobufMonitor } from "./protobuf-bandwidth";

export type IncidentType = "INCIDENT_A_HVAC_FIRE" | "INCIDENT_B_GENSET_VIBE" | "INCIDENT_C_PIPELINE_DROP";

export interface ActiveIncident {
  type: IncidentType;
  id: string;
  title: string;
  description: string;
  station: "bharati" | "maitri";
  targetZoneId: string;
  targetZoneName: string;
  timestamp: string;
  status: "ACTIVE" | "RESOLVING" | "RESOLVED";
  metrics: {
    smokePPM: number;
    tempC: number;
    airflowCFM: number;
    vibrationDriftPct?: number;
    pipelinePressureBar?: number;
  };
}

export interface GeneratorTelemetry {
  id: string;
  name: string;
  runHours: number;
  loadKw: number;
  rpm: number;
  oilTempC: number;
  vibrationMmS: number;
  status: "NORMAL" | "WARNING" | "CRITICAL" | "STANDBY";
  autoRotateScheduledHours: number;
}

export interface EnvironmentalTelemetry {
  incineratorTempC: number;
  incineratorFilterEfficiencyPct: number;
  flueGasOpacityPct: number;
  greywaterRecoveryPct: number;
  greywaterUvActive: boolean;
  greywaterBodMgL: number;
  pipelinePressureBar: number;
  pipelineLeakIndex: "NOMINAL" | "WARNING" | "CRITICAL";
  cathodicProtectionV: number;
  madridCompliancePct: number;
}

export interface PolarTwinReading {
  temp: number;
  humidity: number;
  airflow: number;
  ppm: number;
  power: number;
  occupancy: number;
  status: Status;
  target: number;
  fan: boolean;
  locked: boolean;
  alarmSilenced: boolean;
  crew: string[];
  history: { t: string; temp: number; power: number }[];
}

export type LogLevel = "INFO" | "WARN" | "CRITICAL" | "SUCCESS";
export interface PolarLogEntry {
  id: number;
  time: string;
  level: LogLevel;
  source: string;
  message: string;
  zoneId?: string;
  station?: "maitri" | "bharati";
  view?: "plan" | "section" | "transverse";
}

const ALL_ROOMS = [...BHARATI_ROOMS, ...MAITRI_ROOMS, ...SECTION_ZONES];

const rnd = (n: number) => (Math.random() - 0.5) * n;
const round = (n: number, d = 1) => Number(n.toFixed(d));
const utc = (d = new Date()) => d.toISOString().slice(11, 19) + " UTC";

function seedHistory(baseTemp: number, basePower: number) {
  const now = Date.now();
  return Array.from({ length: 24 }, (_, i) => {
    const hour = new Date(now - (23 - i) * 3600_000);
    const wave = Math.sin((i / 24) * Math.PI * 2);
    return {
      t: `${String(hour.getUTCHours()).padStart(2, "0")}:00`,
      temp: round(baseTemp + wave * 0.8 + rnd(0.3)),
      power: round(Math.max(0, basePower * (1 + wave * 0.1) + rnd(basePower * 0.05)), 2),
    };
  });
}

class PolarPhysicsSimulationEngine {
  private readings: Record<string, PolarTwinReading> = {};
  private activeIncident: ActiveIncident | null = null;
  private log: PolarLogEntry[] = [
    {
      id: 3,
      time: utc(),
      level: "SUCCESS",
      source: "VSAT-1",
      message: "Telemetry link established with NCPOR Goa Server.",
    },
    {
      id: 2,
      time: utc(new Date(Date.now() - 120_000)),
      level: "INFO",
      source: "Station Twin Baseline",
      message: "Nominal operational baseline initialized (95% within safe envelope).",
    },
    {
      id: 1,
      time: utc(new Date(Date.now() - 240_000)),
      level: "SUCCESS",
      source: "Madrid Protocol",
      message: "Environmental compliance self-check passed: 100% compliant.",
    },
  ];
  private logIdCounter = 4;
  private listeners: (() => void)[] = [];

  // Generators state
  private generators: GeneratorTelemetry[] = [
    {
      id: "genset-1",
      name: "CHP Genset 1 (Caterpillar 3512B)",
      runHours: 4820,
      loadKw: 220,
      rpm: 1500,
      oilTempC: 84.2,
      vibrationMmS: 2.1,
      status: "NORMAL",
      autoRotateScheduledHours: 500,
    },
    {
      id: "genset-2",
      name: "CHP Genset 2 (Caterpillar 3512B)",
      runHours: 4950,
      loadKw: 215,
      rpm: 1502,
      oilTempC: 85.1,
      vibrationMmS: 2.3,
      status: "NORMAL",
      autoRotateScheduledHours: 500,
    },
    {
      id: "genset-3",
      name: "CHP Genset 3 (Cold Standby / Cummins QSK)",
      runHours: 3210,
      loadKw: 0,
      rpm: 0,
      oilTempC: 38.0,
      vibrationMmS: 0.1,
      status: "STANDBY",
      autoRotateScheduledHours: 500,
    },
  ];

  // Madrid Protocol Environmental state
  private environmental: EnvironmentalTelemetry = {
    incineratorTempC: 850,
    incineratorFilterEfficiencyPct: 99.4,
    flueGasOpacityPct: 1.8,
    greywaterRecoveryPct: 91,
    greywaterUvActive: true,
    greywaterBodMgL: 4.2,
    pipelinePressureBar: 4.2,
    pipelineLeakIndex: "NOMINAL",
    cathodicProtectionV: -1.15,
    madridCompliancePct: 100,
  };

  constructor() {
    this.initNominalBaseline();
    this.startPhysicsLoop();
  }

  private initNominalBaseline() {
    const out: Record<string, PolarTwinReading> = {};
    for (const r of ALL_ROOMS) {
      // 95% of the time, rooms operate smoothly in a NORMAL (Green) state
      // Indoor Temperature: 20.8°C – 21.5°C
      // Airflow: 500 – 550 CFM
      // CO₂ / Smoke: 380 – 420 PPM (Normal fresh air)
      const nominalTemp = round(20.8 + Math.random() * 0.7);
      const nominalAirflow = round(500 + Math.random() * 50);
      const nominalPpm = round(380 + Math.random() * 40);

      out[r.id] = {
        temp: nominalTemp,
        humidity: round(35 + Math.random() * 8),
        airflow: nominalAirflow,
        ppm: nominalPpm,
        power: round(r.basePower, 2),
        occupancy: r.baseOccupancy,
        status: "normal", // GREEN
        target: 21,
        fan: true,
        locked: false,
        alarmSilenced: false,
        crew: [],
        history: seedHistory(nominalTemp, r.basePower),
      };
    }
    this.readings = out;
  }

  private startPhysicsLoop() {
    setInterval(() => {
      // Fluctuate naturally within safe physical limits
      for (const r of ALL_ROOMS) {
        const cur = this.readings[r.id];
        if (!cur) continue;

        // If this room is currently in an active incident, don't revert to baseline naturally
        if (this.activeIncident && this.activeIncident.targetZoneId === r.id && this.activeIncident.status === "ACTIVE") {
          continue;
        }

        // Safe nominal physical fluctuation
        const targetTemp = 21.0;
        const drift = (targetTemp - cur.temp) * 0.1 + rnd(0.2);
        const temp = round(Math.min(21.5, Math.max(20.8, cur.temp + drift)));
        const airflow = round(Math.min(550, Math.max(500, cur.airflow + rnd(8))));
        const ppm = round(Math.min(420, Math.max(380, cur.ppm + rnd(6))));
        const power = round(Math.max(0.1, cur.power + rnd(0.04)), 2);

        this.readings[r.id] = {
          ...cur,
          temp,
          airflow,
          ppm,
          power,
          status: cur.status === "critical" && !this.activeIncident ? "normal" : cur.status,
          history: [...cur.history.slice(1), { t: "now", temp, power }],
        };

        // Telemetry edge sync
        const isMaitri = MAITRI_ROOMS.some((st) => st.id === r.id);
        const st = isMaitri ? "maitri" : "bharati";
        edgeStoreForward.addTelemetry(st, r.id, { temp, power, ppm, status: this.readings[r.id].status });
        protobufMonitor.recordTransmission({
          station: st,
          zoneId: r.id,
          temp,
          humidity: cur.humidity,
          power,
          ppm,
          status: this.readings[r.id].status,
          timestamp: new Date().toISOString(),
        });
      }

      // Fluctuate generators within nominal range: 420 - 450 kW total load
      if (this.generators[0] && this.generators[1]) {
        this.generators[0].loadKw = round(210 + Math.random() * 15, 1);
        this.generators[1].loadKw = round(210 + Math.random() * 15, 1);
        if (this.activeIncident?.type !== "INCIDENT_B_GENSET_VIBE") {
          this.generators[1].vibrationMmS = round(2.2 + Math.random() * 0.2, 2);
          this.generators[1].status = "NORMAL";
        }
      }

      // Fluctuate environmental pipeline pressure: 4.1 - 4.3 Bar
      if (this.activeIncident?.type !== "INCIDENT_C_PIPELINE_DROP") {
        this.environmental.pipelinePressureBar = round(4.1 + Math.random() * 0.2, 2);
        this.environmental.pipelineLeakIndex = "NOMINAL";
      }

      this.notify();
    }, 3000);
  }

  // --- FAILURE INJECTION ENGINE (Occasional Realistic Incidents) ---
  public triggerIncident(type: IncidentType = "INCIDENT_A_HVAC_FIRE") {
    if (this.activeIncident && this.activeIncident.status === "ACTIVE") {
      return this.activeIncident; // Already an active incident
    }

    if (type === "INCIDENT_A_HVAC_FIRE") {
      // Incident A: Level 2 Electrical / HVAC Room (Bharati)
      // Cause: Electrical short-circuit in heating coil.
      // Telemetry Shift: Smoke/CO2 spikes to 1372 PPM, Temp rises to 31.8°C, Airflow drops to 281 CFM.
      const targetId = "conference";
      const room = ALL_ROOMS.find((r) => r.id === targetId) || ALL_ROOMS[0];

      this.activeIncident = {
        type: "INCIDENT_A_HVAC_FIRE",
        id: `INC-${Date.now().toString().slice(-4)}`,
        title: "Level 2 HVAC Room: Smoke & Thermal Alert",
        description: "Electrical short-circuit in heating coil detected. Smoke/CO₂ threshold breached (>1000 PPM).",
        station: "bharati",
        targetZoneId: targetId,
        targetZoneName: room.name,
        timestamp: utc(),
        status: "ACTIVE",
        metrics: {
          smokePPM: 1372,
          tempC: 31.8,
          airflowCFM: 281,
        },
      };

      // Mutate room reading to CRITICAL (RED)
      if (this.readings[targetId]) {
        this.readings[targetId] = {
          ...this.readings[targetId],
          status: "critical", // RED
          ppm: 1372,
          temp: 31.8,
          airflow: 281,
          fan: false,
          alarmSilenced: false,
        };
      }

      this.pushLog(
        "CRITICAL",
        `Level 2 ${room.name}`,
        `[CRITICAL] Smoke particulate level spiked to 1372 PPM (>1000 PPM threshold)! Heating coil short-circuit detected.`,
        { zoneId: targetId, station: "bharati", view: "plan" }
      );
    } else if (type === "INCIDENT_B_GENSET_VIBE") {
      // Incident B: Level 1 Power House - Genset 2
      this.activeIncident = {
        type: "INCIDENT_B_GENSET_VIBE",
        id: `INC-${Date.now().toString().slice(-4)}`,
        title: "CHP Genset 2 Bearing Vibration Warning",
        description: "Bearing lubrication degradation. Vibration drifted +3.8% beyond safety envelope (4.8 mm/s).",
        station: "bharati",
        targetZoneId: "s-power-l1",
        targetZoneName: "Level 1 Power House (CHP Genset 2)",
        timestamp: utc(),
        status: "ACTIVE",
        metrics: {
          smokePPM: 410,
          tempC: 88.5,
          airflowCFM: 520,
          vibrationDriftPct: 3.8,
        },
      };

      if (this.generators[1]) {
        this.generators[1].status = "WARNING"; // AMBER
        this.generators[1].vibrationMmS = 4.8;
        this.generators[1].oilTempC = 89.2;
      }

      if (this.readings["s-power-l1"]) {
        this.readings["s-power-l1"].status = "warning";
      }

      this.pushLog(
        "WARN",
        "Primary Power House CHP-2",
        `[WARNING] Genset 2 bearing vibration +3.8% drift detected (4.8 mm/s). Requires lube purge and load balance.`,
        { zoneId: "s-power-l1", station: "bharati", view: "section" }
      );
    } else if (type === "INCIDENT_C_PIPELINE_DROP") {
      // Incident C: Sub-surface Fuel Pipeline
      this.activeIncident = {
        type: "INCIDENT_C_PIPELINE_DROP",
        id: `INC-${Date.now().toString().slice(-4)}`,
        title: "Sub-Surface Fuel Pipeline Pressure Drop",
        description: "Sub-zero thermal contraction event. Line pressure dropped to 2.1 Bar. Trace heating required.",
        station: "maitri",
        targetZoneId: "m-priyadarshini-pump",
        targetZoneName: "Sub-surface ATF Pipeline (Priyadarshini Line)",
        timestamp: utc(),
        status: "ACTIVE",
        metrics: {
          smokePPM: 390,
          tempC: -28.4,
          airflowCFM: 510,
          pipelinePressureBar: 2.1,
        },
      };

      this.environmental.pipelinePressureBar = 2.1;
      this.environmental.pipelineLeakIndex = "WARNING";

      this.pushLog(
        "WARN",
        "Madrid Protocol Pipeline Monitor",
        `[WARNING] Fuel pipeline pressure dropped to 2.1 Bar (threshold: 3.5 Bar). Activating trace heating.`,
        { zoneId: "m-priyadarshini-pump", station: "maitri", view: "plan" }
      );
    }

    this.notify();
    return this.activeIncident;
  }

  // --- CLOSED-LOOP RESOLUTION (Turning RED back to GREEN) ---
  public resolveCurrentIncident(method: "TELECOMMAND" | "SOP_CHECKLIST" = "TELECOMMAND"): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.activeIncident) {
        resolve(false);
        return;
      }

      this.activeIncident.status = "RESOLVING";
      const incident = this.activeIncident;
      const targetId = incident.targetZoneId;

      this.pushLog(
        "INFO",
        "Telecommand Closed-Loop Actuator",
        `[INITIATED] Corrective telecommand dispatched via ${method}. Commencing automated physics decay sequence...`
      );

      // Phase 1: Immediate actuation (t = 0ms)
      if (this.readings[targetId]) {
        this.readings[targetId].fan = true;
      }

      // Step 1 Decay (t = 1000ms): Airflow ramps to 620 CFM, Smoke drops to 840 PPM, Temp cools to 26.5°C
      setTimeout(() => {
        if (this.readings[targetId]) {
          this.readings[targetId] = {
            ...this.readings[targetId],
            airflow: 620,
            ppm: 840,
            temp: 26.5,
            status: "warning", // Transition from RED to AMBER
          };
          this.notify();
        }
      }, 1000);

      // Step 2 Decay (t = 2200ms): Airflow ramps to 850 CFM, Smoke drops to 520 PPM, Temp cools to 23.0°C
      setTimeout(() => {
        if (this.readings[targetId]) {
          this.readings[targetId] = {
            ...this.readings[targetId],
            airflow: 850,
            ppm: 520,
            temp: 23.0,
          };
          this.notify();
        }
      }, 2200);

      // Step 3 Full Resolution (t = 3400ms):
      // Airflow 850 CFM, Smoke normalizes to 380 PPM, Temp to 21.1°C
      // Canvas mutation: Mutates CSS fill/border back to GREEN (normal)
      setTimeout(() => {
        if (this.readings[targetId]) {
          this.readings[targetId] = {
            ...this.readings[targetId],
            airflow: 850,
            ppm: 380,
            temp: 21.1,
            status: "normal", // GREEN
          };
        }

        if (incident.type === "INCIDENT_B_GENSET_VIBE" && this.generators[1]) {
          this.generators[1].status = "NORMAL";
          this.generators[1].vibrationMmS = 2.2;
          this.generators[1].oilTempC = 84.5;
        }

        if (incident.type === "INCIDENT_C_PIPELINE_DROP") {
          this.environmental.pipelinePressureBar = 4.2;
          this.environmental.pipelineLeakIndex = "NOMINAL";
        }

        this.pushLog(
          "SUCCESS",
          "Station Closed-Loop Engine",
          `[SUCCESS] Telecommand executed. Airflow 850 CFM achieved. Smoke diluted to 380 PPM. Room state restored to NORMAL.`
        );

        this.activeIncident = null;
        this.notify();
        resolve(true);
      }, 3400);
    });
  }

  // Auto-rotate gensets
  public rotateGenerators() {
    const g1 = this.generators[0];
    const g3 = this.generators[2];

    if (g1.status === "NORMAL") {
      g1.status = "STANDBY";
      g1.loadKw = 0;
      g1.rpm = 0;
      g3.status = "NORMAL";
      g3.loadKw = 220;
      g3.rpm = 1500;
      this.pushLog("SUCCESS", "Generator Auto-Rotation", "Rotated primary load from Genset 1 to Genset 3 (Cold Standby Spun Up). Engine wear balanced.");
    } else {
      g3.status = "STANDBY";
      g3.loadKw = 0;
      g3.rpm = 0;
      g1.status = "NORMAL";
      g1.loadKw = 220;
      g1.rpm = 1500;
      this.pushLog("SUCCESS", "Generator Auto-Rotation", "Rotated primary load back to Genset 1. Balancing engine duty-cycle.");
    }
    this.notify();
  }

  public pushLog(
    level: LogLevel,
    source: string,
    message: string,
    meta?: { zoneId?: string; station?: "maitri" | "bharati"; view?: "plan" | "section" | "transverse" }
  ) {
    this.log = [
      {
        id: this.logIdCounter++,
        time: utc(),
        level,
        source,
        message,
        zoneId: meta?.zoneId,
        station: meta?.station,
        view: meta?.view,
      },
      ...this.log,
    ].slice(0, 150);
    this.notify();
  }

  public updateReading(id: string, patch: Partial<PolarTwinReading>) {
    if (this.readings[id]) {
      this.readings[id] = { ...this.readings[id], ...patch };
      this.notify();
    }
  }

  public getSnapshot() {
    return {
      readings: this.readings,
      log: this.log,
      activeIncident: this.activeIncident,
      generators: this.generators,
      environmental: this.environmental,
      alarms: Object.values(this.readings).filter((r) => r.status === "critical" && !r.alarmSilenced).length,
    };
  }

  public subscribe(fn: () => void) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }
}

export const polarSimulationEngine = new PolarPhysicsSimulationEngine();

export function usePolarSimulation() {
  const [snapshot, setSnapshot] = useState(() => polarSimulationEngine.getSnapshot());

  useEffect(() => {
    return polarSimulationEngine.subscribe(() => {
      setSnapshot(polarSimulationEngine.getSnapshot());
    });
  }, []);

  const triggerIncident = useCallback((type?: IncidentType) => {
    return polarSimulationEngine.triggerIncident(type);
  }, []);

  const resolveIncident = useCallback((method?: "TELECOMMAND" | "SOP_CHECKLIST") => {
    return polarSimulationEngine.resolveCurrentIncident(method);
  }, []);

  const rotateGensets = useCallback(() => {
    polarSimulationEngine.rotateGenerators();
  }, []);

  const update = useCallback((id: string, patch: Partial<PolarTwinReading>) => {
    polarSimulationEngine.updateReading(id, patch);
  }, []);

  const pushLog = useCallback(
    (
      level: LogLevel,
      source: string,
      message: string,
      meta?: { zoneId?: string; station?: "maitri" | "bharati"; view?: "plan" | "section" | "transverse" }
    ) => {
      polarSimulationEngine.pushLog(level, source, message, meta);
    },
    []
  );

  return {
    ...snapshot,
    triggerIncident,
    resolveIncident,
    rotateGensets,
    update,
    pushLog,
  };
}
