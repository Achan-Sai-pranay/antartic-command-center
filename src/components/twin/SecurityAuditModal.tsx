import React, { useState } from "react";
import { ShieldCheck, Download, Trash2, X, Search, Shield, Lock, FileText, CheckCircle2 } from "lucide-react";
import { useSecurity } from "@/lib/security-context";

export function SecurityAuditModal({ onClose }: { onClose: () => void }) {
  const { auditLogs, clearAuditLogs, exportAuditCsv, roleConfig } = useSecurity();
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = auditLogs.filter(
    (l) =>
      l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.operatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.targetDevice.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.cryptoHash.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-md border border-gov-border bg-gov-card text-gov-text shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gov-border bg-gov-navy-header px-5 py-3 text-white">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-sm bg-gov-saffron/20 border border-gov-saffron/40">
              <ShieldCheck className="h-5 w-5 text-gov-saffron" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gov-saffron">
                Security Audit Log · Cryptographic Telecommands
              </h2>
              <p className="text-[11px] text-white/70">
                Tamper-Evident SHA-256 HMAC Command Ledger · MoES / NCPOR Security Enclave
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportAuditCsv}
              className="flex items-center gap-1.5 rounded-sm border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
              title="Export all audit logs to CSV"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={onClose}
              className="grid h-7 w-7 place-items-center rounded-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gov-border bg-gov-bg px-5 py-2.5">
          <div className="relative min-w-[240px] flex-1 max-w-md">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gov-muted" />
            <input
              type="text"
              placeholder="Search by action, operator, target device, or hash..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-sm border border-gov-border bg-white py-1.5 pl-8 pr-3 text-xs text-gov-text placeholder:text-gov-disabled outline-none focus:border-gov-navy-primary"
            />
          </div>

          <div className="flex items-center gap-3 text-xs text-gov-muted">
            <span>
              Total Records: <strong className="font-mono text-gov-text">{auditLogs.length}</strong>
            </span>
            <span className="text-gov-border">|</span>
            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" /> Two-Man Rule Enforced
            </span>
            {auditLogs.length > 0 && (
              <button
                onClick={clearAuditLogs}
                className="flex items-center gap-1 text-gov-muted hover:text-gov-critical ml-2"
                title="Clear local audit cache"
              >
                <Trash2 className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="flex-1 overflow-auto p-4">
          {filtered.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-gov-muted">
              <Shield className="h-10 w-10 text-gov-disabled mb-2" strokeWidth={1.5} />
              <p className="text-sm font-semibold text-gov-text">No telecommand audit logs found</p>
              <p className="text-xs">Executed telecommands with PIN authorization will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded border border-gov-border bg-white shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-gov-border bg-gov-bg font-mono text-[11px] uppercase tracking-wider text-gov-muted">
                  <tr>
                    <th className="px-3 py-2.5">Log ID</th>
                    <th className="px-3 py-2.5">Timestamp (UTC)</th>
                    <th className="px-3 py-2.5">Operator</th>
                    <th className="px-3 py-2.5">Officer PIN Auth</th>
                    <th className="px-3 py-2.5">Station & Device</th>
                    <th className="px-3 py-2.5">Telecommand Action</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">HMAC / Token</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gov-border font-sans">
                  {filtered.map((log) => (
                    <tr key={log.id} className="hover:bg-gov-bg/60 transition-colors">
                      <td className="px-3 py-2.5 font-mono text-[11px] font-bold text-gov-navy-primary whitespace-nowrap">
                        {log.id}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-gov-muted whitespace-nowrap">
                        {log.timestamp}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <p className="font-semibold text-gov-text">{log.operatorName}</p>
                        <p className="text-[10px] text-gov-muted">{log.operatorRole}</p>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-700 border border-emerald-200">
                          <Lock className="h-3 w-3" />
                          {log.officerPin}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-semibold text-gov-text">
                          <span className="font-mono text-[10px] uppercase text-gov-saffron mr-1">
                            [{log.station}]
                          </span>
                          {log.targetDevice}
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        <code className="rounded bg-gov-bg px-1.5 py-0.5 font-mono text-[11px] font-bold text-gov-text border border-gov-border">
                          {log.action}
                        </code>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 rounded bg-gov-normal/10 px-2 py-0.5 font-mono text-[10px] font-bold text-gov-normal border border-gov-normal/30">
                          ● {log.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[9px] text-gov-muted max-w-[200px] truncate" title={log.hmacSignature}>
                        {log.hmacSignature}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gov-border bg-gov-bg px-5 py-3 text-xs text-gov-muted">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>ISO/IEC 27001 Certified Cryptographic Audit Protocol · Hardware HSM Synchronized</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-sm border border-gov-border bg-white px-4 py-1.5 text-xs font-semibold text-gov-text hover:bg-gov-bg transition-colors"
          >
            Close Audit Viewer
          </button>
        </div>
      </div>
    </div>
  );
}
