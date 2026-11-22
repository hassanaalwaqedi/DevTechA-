"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowUpRight, ShieldCheck } from "lucide-react";

export default function AdminLoginPage() {
  const [nextPath, setNextPath] = useState("/admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const requestedPath =
      new URLSearchParams(window.location.search).get("next") || "/admin";
    const safeNext =
      requestedPath.startsWith("/admin") &&
      !requestedPath.startsWith("//") &&
      !requestedPath.includes("\\")
        ? requestedPath
        : "/admin";
    setNextPath(safeNext);
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error || "Unable to sign in.");
        return;
      }
      if (body.mfaRequired || body.mfaEnrollmentRequired) {
        window.location.assign(`/admin/mfa?next=${encodeURIComponent(nextPath)}`);
        return;
      }
      window.location.assign(nextPath);
    } catch {
      setError("Network error while signing in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="hz-auth-screen">
      <div className="hz-auth-card">
        <span className="hz-badge hz-badge-blue">
          <ShieldCheck size={12} /> HIRZEXA Intelligence
        </span>

        <h1>Sign in to workspace</h1>
        <p style={{ margin: 0, color: "var(--hz-text-secondary)", fontSize: 13 }}>
          Access the Command Center, AI Agent, Sales CRM, Recruitment ATS, and role-scoped enterprise tools.
        </p>

        <form style={{ marginTop: 22, display: "grid", gap: 14 }} onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">Work email</label>
            <input
              autoFocus
              required
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@hirzexa.com"
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              required
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error ? <p className="hz-alert-error" style={{ margin: 0 }}>{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="hz-btn hz-btn-primary"
            style={{ width: "100%", height: 38 }}
          >
            {loading ? "Authenticating…" : "Enter HIRZEXA Intelligence"}
            <ArrowUpRight size={15} />
          </button>
        </form>
      </div>
    </main>
  );
}
