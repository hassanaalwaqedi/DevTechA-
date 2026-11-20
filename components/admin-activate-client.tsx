"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { ArrowUpRight, CheckCircle2, ShieldCheck } from "lucide-react";

interface InviteSummary {
  fullName: string;
  email: string;
  department: string;
  roleLabel: string;
  expiresAt: string;
}

export function AdminActivateClient() {
  const searchParams = useSearchParams();
  const token = (searchParams.get("token") || "").trim();

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<InviteSummary | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setError(
        "Missing invitation token. Please use the exact activation link provided by your administrator."
      );
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/admin/activate?token=${encodeURIComponent(token)}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.employee) {
          setError(data.error || "Invalid or expired invitation link.");
        } else {
          setInvite(data.employee as InviteSummary);
        }
      } catch {
        if (!cancelled) setError("Unable to verify invitation link.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 12) {
      setError(
        "Password must be at least 12 characters with uppercase, lowercase, and a number."
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to activate your account.");
        return;
      }
      setSuccessMessage(
        data.message || "Your HIRZEXA Intelligence account is now active."
      );
    } catch {
      setError("Network error while activating your account.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="hz-auth-card" style={{ width: "min(480px, 100%)" }}>
      <span className="hz-badge hz-badge-blue">
        <ShieldCheck size={12} /> Account Activation
      </span>

      <h1>Activate Workspace Account</h1>

      {loading ? (
        <p style={{ color: "var(--hz-text-secondary)", fontSize: 13 }}>
          Validating single-use invitation token…
        </p>
      ) : successMessage ? (
        <div style={{ marginTop: 14 }}>
          <div
            className="hz-alert-success"
            style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
          >
            <CheckCircle2 size={17} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{successMessage}</span>
          </div>
          <Link href="/admin/login" className="hz-btn hz-btn-primary" style={{ width: "100%", height: 38 }}>
            Proceed to Workspace Login <ArrowUpRight size={15} />
          </Link>
        </div>
      ) : invite ? (
        <>
          <p style={{ margin: "0 0 18px", color: "var(--hz-text-secondary)", fontSize: 13, lineHeight: 1.6 }}>
            Welcome, <strong style={{ color: "var(--hz-text-strong)" }}>{invite.fullName}</strong>. Set
            a personal password to activate your{" "}
            <strong style={{ color: "#93C5FD" }}>{invite.roleLabel}</strong> account for{" "}
            <code>{invite.email}</code> ({invite.department}).
          </p>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
            <div className="field">
              <label htmlFor="activate-pw">
                New Password (min 12 chars, uppercase, lowercase, number)
              </label>
              <input
                id="activate-pw"
                type="password"
                required
                minLength={12}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <div className="field">
              <label htmlFor="activate-pw-confirm">Confirm Password</label>
              <input
                id="activate-pw-confirm"
                type="password"
                required
                minLength={12}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            {error ? <p className="hz-alert-error" style={{ margin: 0 }}>{error}</p> : null}

            <button
              type="submit"
              disabled={submitting}
              className="hz-btn hz-btn-primary"
              style={{ width: "100%", height: 38 }}
            >
              {submitting ? "Activating Account…" : "Activate Account"}
              <ArrowUpRight size={15} />
            </button>
          </form>
        </>
      ) : (
        <div style={{ marginTop: 12 }}>
          <p className="hz-alert-error">{error || "This invitation link is no longer valid."}</p>
          <Link href="/admin/login" className="hz-btn hz-btn-secondary">
            Return to Login
          </Link>
        </div>
      )}
    </div>
  );
}
