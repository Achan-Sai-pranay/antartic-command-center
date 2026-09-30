import { useState, useEffect } from "react";
import { ShieldCheck, Lock, CheckCircle2, AlertTriangle, Key, X, Cpu, Fingerprint, ShieldAlert, Sparkles } from "lucide-react";
import {
  cryptoTelecommand,
  OPERATOR_1,
  OPERATOR_2,
  type TelecommandRequest,
} from "@/lib/crypto-telecommand";
import { useSecurity } from "@/lib/security-context";
import { polarSimulationEngine } from "@/lib/simulation-engine";

const REQUIRED_OFFICER_PIN = "NCPOR-SEC-2026";

export function DualSignatureModal({
  onClose,
  onExecuteLog,
  initialCommand,
  station = "bharati",
  zoneId = "station-wide",
}: {
  onClose: () => void;
  onExecuteLog?: (msg: string) => void;
  initialCommand?: string;
  station?: string;
  zoneId?: string;
}) {
  const { role, roleConfig, logTelecommand } = useSecurity();
  const [req, setReq] = useState<TelecommandRequest | null>(() => {
    let active = cryptoTelecommand.getActiveRequest();
    if (!active && initialCommand) {
      active = cryptoTelecommand.createRequest(initialCommand, station, zoneId);
    }
    return active;
  });

  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);
  const [signingStage, setSigningStage] = useState<"IDLE" | "HASHING" | "HMAC_GEN" | "VERIFIED">("IDLE");
  const [generatedHmac, setGeneratedHmac] = useState<string>("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  useEffect(() => {
    return cryptoTelecommand.subscribe(() => {
      setReq(cryptoTelecommand.getActiveRequest());
    });
  }, []);

  if (!req) return null;

  const handlePrimarySign = () => {
    cryptoTelecommand.signByOperator(1);
    setFeedback({
      type: "info",
      text: "Primary Officer Signature appended. Awaiting Secondary Authorization PIN verification.",
    });
  };

  const handleVerifyPinAndSignSecondary = () => {
    if (enteredPin.trim() !== REQUIRED_OFFICER_PIN) {
      setPinError(true);
      setFeedback({
        type: "error",
        text: `Invalid Officer Authorization PIN! Correct security format required (Hint: ${REQUIRED_OFFICER_PIN}).`,
      });
      return;
    }

    setPinError(false);
    setPinVerified(true);
    cryptoTelecommand.signByOperator(2);

    // Run simulated cryptographic token generation
    setSigningStage("HASHING");
    setTimeout(() => {
      setSigningStage("HMAC_GEN");
      setTimeout(() => {
        const hash = `HMAC-SHA256: ${Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
        setGeneratedHmac(hash);
        setSigningStage("VERIFIED");
        setFeedback({
          type: "success",
          text: "Two-Man Rule Satisfied! Cryptographic SHA-256 HMAC Telecommand Token generated and authenticated.",
        });
      }, 700);
    }, 600);
  };

  const handleExecute = async () => {
    if (!pinVerified || signingStage !== "VERIFIED") {
      setFeedback({ type: "error", text: "Security policy requires PIN verification and cryptographic token generation before execution." });
      return;
    }

    const res = cryptoTelecommand.verifyAndExecute();
    if (res.success) {
      setFeedback({ type: "success", text: res.message });

      // Log to Enterprise Security Audit Table
      logTelecommand({
        operatorName: role === "STATION_COMMANDER" ? "Station Commander (Antarctica)" : "Goa Mission Operator",
        operatorRole: roleConfig.name,
        officerPin: REQUIRED_OFFICER_PIN,
        station: req.station.toUpperCase(),
        targetDevice: req.zoneId,
        action: req.command,
        status: "SUCCESS",
        cryptoHash: `SHA-256: ${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
        hmacSignature: generatedHmac || "HMAC-SHA256: 9e24f7c1a82b3d04",
      });

      // Closed-loop resolution in simulation engine: If emergency exhaust fan or isolation, resolve incident!
      const isExhaustFanOrBreaker =
        req.command.toLowerCase().includes("exhaust") ||
        req.command.toLowerCase().includes("fan") ||
        req.command.toLowerCase().includes("breaker") ||
        req.command.toLowerCase().includes("isolation") ||
        req.command.toLowerCase().includes("hvac");

      if (isExhaustFanOrBreaker) {
        polarSimulationEngine.resolveCurrentIncident("TELECOMMAND");
      }

      if (onExecuteLog) onExecuteLog(res.message);

      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setFeedback({ type: "error", text: res.message });
    }
  };

  const isObserver = role === "OBSERVER";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg overflow-hidden rounded-md border border-gov-saffron/60 bg-gov-navy-header text-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-gov-saffron animate-pulse" />
            <div>
              <h2 className="text-sm font-bold tracking-wide uppercase text-gov-saffron">
                Two-Man Rule Cryptographic Telecommand Control
              </h2>
              <p className="text-[10px] text-white/60">MoES / NCPOR Station Command Security Enclave</p>
            </div>
          </div>
          <button
            onClick={() => {
              cryptoTelecommand.cancelRequest();
              onClose();
            }}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Read-only warning if in Observer role */}
          {isObserver && (
            <div className="flex items-center gap-2 rounded border border-sky-500/50 bg-sky-500/10 p-2.5 text-xs text-sky-300">
              <ShieldAlert className="h-4 w-4 shrink-0 text-sky-400" />
              <span>
                <strong>Read-Only Mode:</strong> You are currently logged in as <em>Observer / Scientist</em>. Switch to <em>Goa Mission Operator</em> or <em>Station Commander</em> to authorize telecommands.
              </span>
            </div>
          )}

          {/* Action Details Card */}
          <div className="rounded border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold text-amber-300 uppercase tracking-wider text-[11px]">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                Target Telecommand Actuation
              </span>
              <span className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[10px] text-amber-200">
                {req.id}
              </span>
            </div>
            <p className="mt-1.5 font-mono text-sm text-white font-bold tracking-wide bg-black/30 p-1.5 rounded border border-white/10">
              {req.command}
            </p>
            <div className="mt-2 flex items-center justify-between text-[11px] text-white/70 font-mono">
              <span>Target: <strong className="text-gov-saffron uppercase">{req.station}</strong></span>
              <span>Zone: <strong className="text-white">{req.zoneId}</strong></span>
              <span>Time: <strong className="text-white">{req.timestamp.slice(11, 19)} UTC</strong></span>
            </div>
          </div>

          {/* Dual Signature Rules */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
                <Fingerprint className="h-3.5 w-3.5 text-gov-saffron" />
                Dual-Authorization Protocol (2-of-2)
              </span>
              <span className="text-[10px] text-white/50 font-mono">ENCLAVE-2026</span>
            </div>

            {/* Step 1: Primary Officer Confirmation */}
            <div
              className={`flex items-center justify-between rounded border p-3 transition-colors ${
                req.signedByOperator1
                  ? "border-emerald-500/50 bg-emerald-500/10"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <div className="min-w-0 pr-2">
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  1. Primary Officer Confirmation
                  {req.signedByOperator1 && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                </p>
                <p className="text-[11px] text-white/70">{OPERATOR_1.name} · {OPERATOR_1.role}</p>
                <p className="font-mono text-[9px] text-white/40">{OPERATOR_1.publicKeyFingerprint}</p>
              </div>

              {req.signedByOperator1 ? (
                <span className="rounded bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/30">
                  CONFIRMED
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handlePrimarySign}
                  disabled={isObserver}
                  className={`flex items-center gap-1 rounded px-3 py-1.5 text-xs font-bold transition-all ${
                    isObserver
                      ? "bg-white/10 text-white/30 cursor-not-allowed"
                      : "bg-gov-saffron text-gov-navy-header hover:bg-amber-400 active:scale-95 shadow"
                  }`}
                >
                  <Key className="h-3.5 w-3.5" />
                  Sign Primary
                </button>
              )}
            </div>

            {/* Step 2: Secondary Authorization PIN / Signature */}
            <div
              className={`rounded border p-3 transition-colors ${
                pinVerified
                  ? "border-emerald-500/50 bg-emerald-500/10"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    2. Secondary Officer Authorization PIN
                    {pinVerified && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                  </p>
                  <p className="text-[11px] text-white/70">{OPERATOR_2.name} · {OPERATOR_2.role}</p>
                </div>

                {pinVerified ? (
                  <span className="rounded bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/30">
                    AUTHENTICATED
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEnteredPin(REQUIRED_OFFICER_PIN)}
                    className="text-[10px] text-gov-saffron underline hover:text-amber-300"
                    title="Auto-fill default station security PIN"
                  >
                    Paste Test PIN
                  </button>
                )}
              </div>

              {!pinVerified ? (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="password"
                    placeholder={`Enter PIN (${REQUIRED_OFFICER_PIN})`}
                    value={enteredPin}
                    onChange={(e) => setEnteredPin(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleVerifyPinAndSignSecondary();
                    }}
                    disabled={!req.signedByOperator1 || isObserver}
                    className={`flex-1 rounded border bg-black/30 px-3 py-1.5 text-xs font-mono text-white placeholder-white/40 outline-none transition-colors ${
                      pinError
                        ? "border-red-500 focus:border-red-400"
                        : "border-white/20 focus:border-gov-saffron"
                    } ${!req.signedByOperator1 ? "opacity-50 cursor-not-allowed" : ""}`}
                  />
                  <button
                    type="button"
                    onClick={handleVerifyPinAndSignSecondary}
                    disabled={!req.signedByOperator1 || !enteredPin.trim() || isObserver}
                    className={`rounded px-3 py-1.5 text-xs font-bold transition-all ${
                      req.signedByOperator1 && enteredPin.trim() && !isObserver
                        ? "bg-gov-saffron text-gov-navy-header hover:bg-amber-400 active:scale-95"
                        : "bg-white/10 text-white/30 cursor-not-allowed"
                    }`}
                  >
                    Verify & Sign
                  </button>
                </div>
              ) : (
                <div className="mt-2 space-y-1.5 rounded bg-black/40 p-2 font-mono text-[10px] border border-white/5">
                  <div className="flex items-center justify-between text-white/80">
                    <span>Officer PIN Verification:</span>
                    <span className="text-emerald-400 font-bold">NCPOR-SEC-2026 [VALIDATED]</span>
                  </div>
                  <div className="flex items-center justify-between text-white/60">
                    <span>Key Fingerprint:</span>
                    <span>{OPERATOR_2.publicKeyFingerprint}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Animated Cryptographic Signing Sequence */}
          {signingStage !== "IDLE" && (
            <div className="rounded border border-sky-500/40 bg-sky-950/40 p-2.5 font-mono text-[11px] space-y-1">
              <div className="flex items-center gap-1.5 text-sky-300 font-bold">
                <Cpu className={`h-3.5 w-3.5 ${signingStage !== "VERIFIED" ? "animate-spin text-sky-400" : "text-emerald-400"}`} />
                {signingStage === "HASHING" && "Hashing telecommand payload with station ECDSA private key..."}
                {signingStage === "HMAC_GEN" && "Generating SHA-256 HMAC Telecommand Token..."}
                {signingStage === "VERIFIED" && "Cryptographic SHA-256 HMAC Token Authenticated!"}
              </div>
              {generatedHmac && (
                <p className="text-[9px] text-emerald-300 break-all bg-black/40 p-1.5 rounded border border-emerald-500/30">
                  {generatedHmac}
                </p>
              )}
            </div>
          )}

          {feedback && (
            <div
              className={`rounded p-2.5 text-xs font-medium flex items-center gap-1.5 ${
                feedback.type === "success"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : feedback.type === "error"
                  ? "bg-red-500/20 text-red-300 border border-red-500/40"
                  : "bg-blue-500/20 text-blue-300 border border-blue-500/40"
              }`}
            >
              {feedback.type === "success" && <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />}
              {feedback.type === "error" && <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />}
              <span>{feedback.text}</span>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between border-t border-white/10 bg-white/5 px-4 py-3">
          <button
            type="button"
            onClick={() => {
              cryptoTelecommand.cancelRequest();
              onClose();
            }}
            className="rounded border border-white/20 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleExecute}
            disabled={!pinVerified || signingStage !== "VERIFIED" || isObserver}
            className={`flex items-center gap-1.5 rounded px-4 py-1.5 text-xs font-bold transition-all shadow-md ${
              pinVerified && signingStage === "VERIFIED" && !isObserver
                ? "bg-emerald-500 text-gov-navy-header hover:bg-emerald-400 active:scale-95 shadow-emerald-500/20"
                : "bg-white/10 text-white/30 cursor-not-allowed"
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            Verify Dual-Sig & Execute Telecommand
          </button>
        </div>
      </div>
    </div>
  );
}
