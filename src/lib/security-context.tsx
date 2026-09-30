import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export type UserRole = "OBSERVER" | "GOA_OPERATOR" | "STATION_COMMANDER";

export interface RoleConfig {
  id: UserRole;
  name: string;
  shortLabel: string;
  description: string;
  canExecuteTelecommand: boolean;
  canSignPrimary: boolean;
  canAuthorizeSecondary: boolean;
  badgeClass: string;
}

export const ROLES: Record<UserRole, RoleConfig> = {
  OBSERVER: {
    id: "OBSERVER",
    name: "Observer / Scientist",
    shortLabel: "Scientist (Read-Only)",
    description: "Read-only access to station telemetry, CAD blueprints, and environmental metrics. Telecommands disabled.",
    canExecuteTelecommand: false,
    canSignPrimary: false,
    canAuthorizeSecondary: false,
    badgeClass: "border-sky-500/50 bg-sky-500/10 text-sky-400",
  },
  GOA_OPERATOR: {
    id: "GOA_OPERATOR",
    name: "Goa Mission Operator",
    shortLabel: "Goa Operator",
    description: "NCPOR Headquarters Goa mission operations console. Authorized to initiate telecommands.",
    canExecuteTelecommand: true,
    canSignPrimary: true,
    canAuthorizeSecondary: false,
    badgeClass: "border-amber-500/50 bg-amber-500/10 text-amber-300",
  },
  STATION_COMMANDER: {
    id: "STATION_COMMANDER",
    name: "Station Commander (Antarctica)",
    shortLabel: "Station Commander",
    description: "Chief Station Authority. Authorized to approve, cryptographically sign, and execute two-man rule telecommands.",
    canExecuteTelecommand: true,
    canSignPrimary: true,
    canAuthorizeSecondary: true,
    badgeClass: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  },
};

export interface TelecommandAuditRecord {
  id: string;
  timestamp: string;
  operatorName: string;
  operatorRole: string;
  officerPin: string;
  station: string;
  targetDevice: string;
  action: string;
  status: "SUCCESS" | "FAILED" | "REJECTED";
  cryptoHash: string;
  hmacSignature: string;
}

const INITIAL_AUDIT_LOGS: TelecommandAuditRecord[] = [
  {
    id: "CMD-AUD-8821",
    timestamp: "12:15:30 UTC",
    operatorName: "Eng. R. Verma",
    operatorRole: "Goa Mission Operator",
    officerPin: "NCPOR-SEC-2026 (Verified)",
    station: "BHARATI",
    targetDevice: "CHP Genset 1 Trace Heating",
    action: "START_TRACE_HEATING_BUS_A",
    status: "SUCCESS",
    cryptoHash: "SHA256: 4f8b91a27e3d64c0e92f1b8a34d567890123456789abcdef0123456789abcdef",
    hmacSignature: "HMAC-SHA256-TOKEN: a89c02df1e457b98",
  },
  {
    id: "CMD-AUD-8819",
    timestamp: "09:40:12 UTC",
    operatorName: "Dr. A. Sharma",
    operatorRole: "Station Commander",
    officerPin: "NCPOR-SEC-2026 (Verified)",
    station: "BHARATI",
    targetDevice: "Incinerator Secondary Damper",
    action: "CALIBRATE_FLUE_DAMPER_99_PCT",
    status: "SUCCESS",
    cryptoHash: "SHA256: 9e2c140a87b6d5f4e3c2b1a09876543210fedcba9876543210fedcba98765432",
    hmacSignature: "HMAC-SHA256-TOKEN: c4128f09b57a1d32",
  },
  {
    id: "CMD-AUD-8804",
    timestamp: "06:05:44 UTC",
    operatorName: "Eng. R. Verma",
    operatorRole: "Goa Mission Operator",
    officerPin: "NCPOR-SEC-2026 (Verified)",
    station: "MAITRI",
    targetDevice: "Priyadarshini Lake Pump House",
    action: "CYCLE_DE-ICING_CIRCULATOR",
    status: "SUCCESS",
    cryptoHash: "SHA256: 1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    hmacSignature: "HMAC-SHA256-TOKEN: 77b91e4a3c02d8f9",
  },
];

interface SecurityContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  roleConfig: RoleConfig;
  auditLogs: TelecommandAuditRecord[];
  logTelecommand: (record: Omit<TelecommandAuditRecord, "id" | "timestamp">) => TelecommandAuditRecord;
  clearAuditLogs: () => void;
  exportAuditCsv: () => void;
}

const SecurityContext = createContext<SecurityContextType | null>(null);

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>(() => {
    try {
      const saved = localStorage.getItem("polartwin_user_role");
      if (saved && (saved === "OBSERVER" || saved === "GOA_OPERATOR" || saved === "STATION_COMMANDER")) {
        return saved as UserRole;
      }
    } catch {}
    return "GOA_OPERATOR"; // Default mission operator
  });

  const [auditLogs, setAuditLogs] = useState<TelecommandAuditRecord[]>(() => {
    try {
      const saved = localStorage.getItem("polartwin_security_audit");
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_AUDIT_LOGS;
  });

  const setRole = useCallback((newRole: UserRole) => {
    setRoleState(newRole);
    try {
      localStorage.setItem("polartwin_user_role", newRole);
    } catch {}
  }, []);

  const logTelecommand = useCallback((record: Omit<TelecommandAuditRecord, "id" | "timestamp">) => {
    const utcTime = new Date().toISOString().slice(11, 19) + " UTC";
    const newRecord: TelecommandAuditRecord = {
      ...record,
      id: `CMD-AUD-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: utcTime,
    };

    setAuditLogs((prev) => {
      const updated = [newRecord, ...prev];
      try {
        localStorage.setItem("polartwin_security_audit", JSON.stringify(updated.slice(0, 100)));
      } catch {}
      return updated;
    });

    return newRecord;
  }, []);

  const clearAuditLogs = useCallback(() => {
    setAuditLogs([]);
    try {
      localStorage.removeItem("polartwin_security_audit");
    } catch {}
  }, []);

  const exportAuditCsv = useCallback(() => {
    const headers = ["ID", "Timestamp (UTC)", "Operator", "Role", "PIN Verified", "Station", "Device", "Action", "Status", "Crypto Hash", "HMAC Signature"];
    const rows = auditLogs.map((l) => [
      l.id,
      l.timestamp,
      `"${l.operatorName}"`,
      `"${l.operatorRole}"`,
      `"${l.officerPin}"`,
      l.station,
      `"${l.targetDevice}"`,
      `"${l.action}"`,
      l.status,
      `"${l.cryptoHash}"`,
      `"${l.hmacSignature}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `MoES_PolarTwin_Security_Audit_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [auditLogs]);

  return (
    <SecurityContext.Provider
      value={{
        role,
        setRole,
        roleConfig: ROLES[role],
        auditLogs,
        logTelecommand,
        clearAuditLogs,
        exportAuditCsv,
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  const ctx = useContext(SecurityContext);
  if (!ctx) {
    throw new Error("useSecurity must be used within a SecurityProvider");
  }
  return ctx;
}
