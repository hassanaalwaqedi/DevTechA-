"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { ArrowUpRight, CheckCircle2, Copy, KeyRound, LogOut, ShieldCheck } from "lucide-react";

interface MfaFactorItem {
  id: string;
  friendlyName: string;
  status: string;
  createdAt: string;
}

interface MfaStatusResponse {
  ok: boolean;
  actor: {
    email: string;
    fullName: string;
    roleKey: string;
    roleLabel: string;
  };
  policy: {
    allowed: boolean;
    reason: string;
    enforcementMode: "enrolled_only" | "required";
    currentLevel: string | null;
    nextLevel: string | null;
    hasVerifiedFactor: boolean;
    requiresChallenge: boolean;
    requiresEnrollment: boolean;
  };
  mfaSatisfied: boolean;
  factors: MfaFactorItem[];
}

export function AdminMfaClient({ nextPath }: { nextPath: string }) {
  const [status, setStatus] = useState<MfaStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [enrollData, setEnrollData] = useState<{
    factorId: string;
    qrCode: string;
    secret: string;
  } | null>(null);
  const [selectedFactorId, setSelectedFactorId] = useState("");
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/mfa", { cache: "no-store" });
      if (res.status === 401) {
        window.location.assign("/admin/login");
        return;
      }
      const data = (await res.json()) as MfaStatusResponse;
      setStatus(data);
      const verified = data.factors.find((f) => f.status === "verified");
      if (verified) {
        setSelectedFactorId(verified.id);
      }
    } catch {
      setError("Unable to load MFA status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function startEnrollment() {
    setError("");
    setInfo("");
    setEnrolling(true);
    try {
      const res = await fetch("/api/admin/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendlyName: "HIRZEXA Authenticator" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to begin authenticator setup.");
        return;
      }
      setEnrollData({
        factorId: data.factorId,
        qrCode: data.qrCode,
        secret: data.secret,
      });
      setSelectedFactorId(data.factorId);
    } catch {
      setError("Network error initiating MFA setup.");
    } finally {
      setEnrolling(false);
    }
  }

  async function submitVerification(e: FormEvent) {
    e.preventDefault();
    const activeFactorId = enrollData?.factorId || selectedFactorId;
    if (!activeFactorId) {
      setError("No authenticator factor selected.");
      return;
    }
    setError("");
    setVerifying(true);
    try {
      const res = await fetch("/api/admin/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factorId: activeFactorId, code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Verification failed.");
        return;
      }
      setInfo("Session upgraded to AAL2. Redirecting to workspace…");
      window.location.assign(nextPath);
    } catch {
      setError("Network error while verifying code.");
    } finally {
      setVerifying(false);
    }
  }

  async function removeFactor(factorId: string) {
    setError("");
    try {
      const res = await fetch(`/api/admin/mfa?factorId=${encodeURIComponent(factorId)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to remove factor.");
        return;
      }
      setEnrollData(null);
      setCode("");
      setInfo("Authenticator factor removed.");
      await loadStatus();
    } catch {
      setError("Network error removing factor.");
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    window.location.assign("/admin/login");
  }

  const verifiedFactors = (status?.factors || []).filter((f) => f.status === "verified");
  const needsChallenge = Boolean(status?.policy.requiresChallenge && verifiedFactors.length > 0);
  const isAal2 = status?.policy.currentLevel === "aal2";

  return (
    <main className="hz-auth-screen">
      <div className="hz-auth-card" style={{ maxWidth: 460 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <span className="hz-badge hz-badge-blue">
            <ShieldCheck size={12} /> Multi-Factor Security (AAL2)
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="hz-btn hz-btn-ghost"
            style={{ fontSize: 12, padding: "4px 8px" }}
          >
            <LogOut size={12} /> Sign out
          </button>
        </div>

        <h1 style={{ marginTop: 14 }}>
          {needsChallenge
            ? "Verify your authenticator code"
            : isAal2
              ? "MFA protection is active"
              : "Enroll an authenticator app"}
        </h1>

        {loading ? (
          <p style={{ color: "var(--hz-text-secondary)", fontSize: 13 }}>
            Checking session assurance level…
          </p>
        ) : status ? (
          <>
            <p style={{ margin: "4px 0 18px", color: "var(--hz-text-secondary)", fontSize: 13, lineHeight: 1.55 }}>
              Signed in as <strong>{status.actor.fullName}</strong> ({status.actor.roleLabel}) · Assurance:{" "}
              <code style={{ fontSize: 12 }}>{status.policy.currentLevel || "aal1"}</code>
            </p>

            {isAal2 && !enrollData ? (
              <div style={{ display: "grid", gap: 14 }}>
                <div
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    background: "rgba(16, 185, 129, 0.08)",
                    border: "1px solid rgba(16, 185, 129, 0.28)",
                    fontSize: 13,
                    color: "#a7f3d0",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>Your administrative session is verified at AAL2.</span>
                </div>

                {verifiedFactors.length > 0 ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    {verifiedFactors.map((f) => (
                      <div
                        key={f.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 12px",
                          borderRadius: 8,
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          fontSize: 13,
                        }}
                      >
                        <span>
                          <KeyRound size={13} style={{ marginRight: 6, verticalAlign: "middle" }} />
                          {f.friendlyName}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFactor(f.id)}
                          className="hz-btn hz-btn-ghost"
                          style={{ fontSize: 12, color: "#fca5a5" }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}

                <a
                  href={nextPath}
                  className="hz-btn hz-btn-primary"
                  style={{ width: "100%", height: 38, justifyContent: "center" }}
                >
                  Continue to HIRZEXA Intelligence <ArrowUpRight size={15} />
                </a>
              </div>
            ) : needsChallenge ? (
              <form onSubmit={submitVerification} style={{ display: "grid", gap: 14 }}>
                <div className="field">
                  <label htmlFor="mfa-code">6-digit authenticator code</label>
                  <input
                    id="mfa-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="\d{6}"
                    maxLength={6}
                    required
                    autoFocus
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    style={{ letterSpacing: "0.28em", fontSize: 18, textAlign: "center" }}
                  />
                </div>

                {error ? <p className="hz-alert-error" style={{ margin: 0 }}>{error}</p> : null}
                {info ? <p style={{ margin: 0, fontSize: 13, color: "#6ee7b7" }}>{info}</p> : null}

                <button
                  type="submit"
                  disabled={verifying || code.length !== 6}
                  className="hz-btn hz-btn-primary"
                  style={{ width: "100%", height: 38 }}
                >
                  {verifying ? "Verifying…" : "Verify & Enter Workspace"}
                  <ArrowUpRight size={15} />
                </button>
              </form>
            ) : !enrollData ? (
              <div style={{ display: "grid", gap: 14 }}>
                <p style={{ margin: 0, fontSize: 13, color: "var(--hz-text-secondary)", lineHeight: 1.6 }}>
                  Protect administrative access with a TOTP authenticator app (Google Authenticator, 1Password, Authy, or Microsoft Authenticator).
                </p>

                {error ? <p className="hz-alert-error" style={{ margin: 0 }}>{error}</p> : null}

                <button
                  type="button"
                  onClick={startEnrollment}
                  disabled={enrolling}
                  className="hz-btn hz-btn-primary"
                  style={{ width: "100%", height: 38 }}
                >
                  {enrolling ? "Generating secret…" : "Set up Authenticator App (TOTP)"}
                </button>

                {status.mfaSatisfied ? (
                  <a
                    href={nextPath}
                    className="hz-btn hz-btn-ghost"
                    style={{ width: "100%", justifyContent: "center", fontSize: 13 }}
                  >
                    Return to workspace
                  </a>
                ) : null}
              </div>
            ) : (
              <form onSubmit={submitVerification} style={{ display: "grid", gap: 14 }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 10,
                    padding: 14,
                    borderRadius: 10,
                    background: "#ffffff",
                  }}
                >
                  {/* Safe data-URI image rendering (never dangerouslySetInnerHTML) */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={enrollData.qrCode}
                    alt="Scan QR code with your authenticator app"
                    width={180}
                    height={180}
                  />
                </div>

                <div
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    fontSize: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <code style={{ wordBreak: "break-all" }}>{enrollData.secret}</code>
                  <button
                    type="button"
                    className="hz-btn hz-btn-ghost"
                    style={{ padding: "4px 8px", fontSize: 11, flexShrink: 0 }}
                    onClick={() => {
                      navigator.clipboard?.writeText(enrollData.secret);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    <Copy size={12} /> {copied ? "Copied" : "Copy"}
                  </button>
                </div>

                <div className="field">
                  <label htmlFor="enroll-code">Enter 6-digit code from app to activate</label>
                  <input
                    id="enroll-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="\d{6}"
                    maxLength={6}
                    required
                    autoFocus
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    style={{ letterSpacing: "0.28em", fontSize: 18, textAlign: "center" }}
                  />
                </div>

                {error ? <p className="hz-alert-error" style={{ margin: 0 }}>{error}</p> : null}
                {info ? <p style={{ margin: 0, fontSize: 13, color: "#6ee7b7" }}>{info}</p> : null}

                <button
                  type="submit"
                  disabled={verifying || code.length !== 6}
                  className="hz-btn hz-btn-primary"
                  style={{ width: "100%", height: 38 }}
                >
                  {verifying ? "Activating MFA…" : "Confirm & Activate MFA"}
                  <ArrowUpRight size={15} />
                </button>
              </form>
            )}

            <p
              style={{
                marginTop: 18,
                paddingTop: 14,
                borderTop: "1px solid rgba(255,255,255,0.08)",
                fontSize: 11.5,
                color: "var(--hz-text-secondary)",
                lineHeight: 1.55,
              }}
            >
              <strong>Lost device recovery:</strong> Contact a HIRZEXA Super Admin to verify your identity out-of-band and reset your MFA factor via Supabase Auth Admin recovery. You will be prompted to re-enroll immediately upon next sign-in.
            </p>
          </>
        ) : (
          <p className="hz-alert-error">{error || "Session unavailable."}</p>
        )}
      </div>
    </main>
  );
}
