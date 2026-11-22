"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Save } from "lucide-react";

export function AdminProfileForm({
  initialFullName,
  initialJobTitle,
  initialDepartment,
  email,
  isLegacyAuth = false,
}: {
  initialFullName: string;
  initialJobTitle: string;
  initialDepartment: string;
  email: string;
  isLegacyAuth?: boolean;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialFullName);
  const [jobTitle, setJobTitle] = useState(initialJobTitle);
  const [department, setDepartment] = useState(initialDepartment);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const isDirty =
    fullName.trim() !== initialFullName.trim() ||
    jobTitle.trim() !== initialJobTitle.trim() ||
    department.trim() !== initialDepartment.trim();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (fullName.trim().length < 2) {
      setError("Full name must be at least 2 characters.");
      return;
    }
    setSaving(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          jobTitle: jobTitle.trim(),
          department: department.trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Unable to update profile.");
        return;
      }
      setNotice("Profile saved and recorded in the audit log.");
      router.refresh();
    } catch {
      setError("Network error while saving profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="hz-set-form-grid">
        <div className="hz-int-field">
          <label htmlFor="profile-name">Display Name</label>
          <input
            id="profile-name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
          />
        </div>
        <div className="hz-int-field">
          <label htmlFor="profile-email">
            Auth Account Email {isLegacyAuth ? "(Legacy Login ID)" : "(Read-only)"}
          </label>
          <input id="profile-email" value={email} type="email" readOnly disabled />
        </div>
        <div className="hz-int-field">
          <label htmlFor="profile-title">Job Title</label>
          <input
            id="profile-title"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="e.g., Founder & Principal Engineer"
          />
        </div>
        <div className="hz-int-field">
          <label htmlFor="profile-dept">Department</label>
          <input
            id="profile-dept"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="Executive / Engineering / Operations"
          />
        </div>
      </div>

      {error ? <div className="hz-int-banner is-error">{error}</div> : null}
      {notice ? (
        <div className="hz-int-banner is-success">
          <CheckCircle2 size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{notice}</span>
        </div>
      ) : null}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span style={{ fontSize: 12, color: "var(--hz-text-muted)" }}>
          Changes update your workspace profile and append an immutable audit record.
        </span>
        <button
          className="hz-btn hz-btn-primary hz-btn-sm"
          type="submit"
          disabled={saving || !isDirty}
        >
          <Save size={13} />
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
