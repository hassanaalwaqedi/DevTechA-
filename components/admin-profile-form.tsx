"use client";

import { FormEvent, useState } from "react";

export function AdminProfileForm({
  initialFullName,
  initialJobTitle,
  initialDepartment,
  email,
  roleLabel,
  scope,
  mfaEnrolled,
  sessionVersion,
}: {
  initialFullName: string;
  initialJobTitle: string;
  initialDepartment: string;
  email: string;
  roleLabel: string;
  scope: string;
  mfaEnrolled: boolean;
  sessionVersion: number;
}) {
  const [fullName, setFullName] = useState(initialFullName);
  const [jobTitle, setJobTitle] = useState(initialJobTitle);
  const [department, setDepartment] = useState(initialDepartment);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
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
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Unable to update profile.");
        return;
      }
      setNotice("Profile updated and logged in audit trail.");
    } catch {
      setError("Network error while saving profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="admin-detail-grid" style={{ marginBottom: 16 }}>
        <div>
          <span>Assigned Role</span>
          <strong>{roleLabel}</strong>
        </div>
        <div>
          <span>Data Access Scope</span>
          <strong style={{ textTransform: "capitalize" }}>{scope}</strong>
        </div>
        <div>
          <span>MFA Status</span>
          <strong>
            {mfaEnrolled
              ? "Enrolled (TOTP Verified)"
              : "Not enrolled yet — recommended for Super Admin"}
          </strong>
        </div>
        <div>
          <span>Active Session Generation</span>
          <strong>v{sessionVersion}</strong>
        </div>
      </div>

      <div className="field-grid">
        <div className="field">
          <label htmlFor="profile-name">Full Name</label>
          <input
            id="profile-name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="profile-email">Work Email (Auth Identity)</label>
          <input id="profile-email" value={email} type="email" readOnly disabled />
        </div>
        <div className="field">
          <label htmlFor="profile-title">Job Title</label>
          <input
            id="profile-title"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="e.g. Founder & Principal Engineer"
          />
        </div>
        <div className="field">
          <label htmlFor="profile-dept">Department</label>
          <input
            id="profile-dept"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="Executive / Engineering / Operations"
          />
        </div>
      </div>

      {error ? (
        <p className="admin-error" style={{ marginTop: 12 }}>
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="admin-notice" style={{ marginTop: 12 }}>
          {notice}
        </p>
      ) : null}

      <div className="form-actions">
        <button className="button-dark" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save Profile Changes"}
        </button>
      </div>
    </form>
  );
}
