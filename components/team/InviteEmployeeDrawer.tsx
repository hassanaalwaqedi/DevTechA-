"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  KeyRound,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { SlideOver, StatusBadge } from "@/components/admin-ui/primitives";
import {
  ACTION_LABELS,
  MODULE_LABELS,
  SCOPE_METADATA,
  type CreatedInvite,
} from "@/components/team/types";
import type {
  EmployeeInvitationSummary,
  EmployeeRecord,
} from "@/lib/intelligence/types";
import {
  ACCESS_SCOPES,
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  type AccessScope,
  type ModulePermissionMap,
  type PermissionAction,
  type PermissionModule,
  type RoleKey,
  type RoleTemplate,
} from "@/lib/rbac";

export function InviteEmployeeDrawer({
  open,
  roles,
  isSuperAdmin,
  emailDeliveryReady,
  emailConfigWarning,
  onClose,
  onCreated,
}: {
  open: boolean;
  roles: RoleTemplate[];
  isSuperAdmin: boolean;
  emailDeliveryReady: boolean;
  emailConfigWarning: string | null;
  onClose: () => void;
  onCreated: (
    employee: EmployeeRecord,
    invite: CreatedInvite | null,
    summary?: EmployeeInvitationSummary | null
  ) => void;
}) {
  const selectableRoles = useMemo(
    () => (isSuperAdmin ? roles : roles.filter((r) => r.key !== "super_admin")),
    [isSuperAdmin, roles]
  );

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("Sales");
  const [roleKey, setRoleKey] = useState<RoleKey>("sales_rep");
  const [scopeOverride, setScopeOverride] = useState<string>("");
  const [overridesOpen, setOverridesOpen] = useState(false);
  const [overrides, setOverrides] = useState<ModulePermissionMap>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedInvite | null>(null);
  const [copied, setCopied] = useState(false);

  const template = useMemo(
    () => roles.find((r) => r.key === roleKey) || roles[0],
    [roles, roleKey]
  );

  const effectiveScope: AccessScope =
    (scopeOverride as AccessScope) || template.defaultScope;

  function toggleOverrideAction(mod: PermissionModule, act: PermissionAction) {
    setOverrides((prev) => {
      const baseActs = prev[mod] ?? template.permissions[mod] ?? [];
      const exists = baseActs.includes(act);
      const nextActs = exists ? baseActs.filter((a) => a !== act) : [...baseActs, act];
      return { ...prev, [mod]: nextActs };
    });
  }

  function resetForm() {
    setFullName("");
    setEmail("");
    setJobTitle("");
    setDepartment("Sales");
    setRoleKey("sales_rep");
    setScopeOverride("");
    setOverrides({});
    setOverridesOpen(false);
    setError("");
    setCreated(null);
    setCopied(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const cleanedOverrides: ModulePermissionMap = {};
      for (const mod of PERMISSION_MODULES) {
        if (overrides[mod]) {
          cleanedOverrides[mod] = overrides[mod];
        }
      }

      const response = await fetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          jobTitle: jobTitle.trim(),
          department: department.trim() || "Operations",
          roleKey,
          scopeOverride: scopeOverride ? (scopeOverride as AccessScope) : null,
          permissionOverrides:
            Object.keys(cleanedOverrides).length > 0 ? cleanedOverrides : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Unable to create employee invitation.");
        return;
      }

      const invitePayload: CreatedInvite | null = data.invitation?.activationUrl
        ? {
            employeeName: data.employee.fullName,
            employeeEmail: data.employee.email,
            roleLabel: template.label,
            activationUrl: data.invitation.activationUrl,
            expiresAt: data.invitation.expiresAt,
            deliveryStatus: data.invitation.deliveryStatus || "created",
            emailProvider: data.invitation.emailProvider || null,
            providerMessageId: data.invitation.providerMessageId || null,
            deliveryError: data.invitation.deliveryError || null,
            sentAt: data.invitation.sentAt || null,
          }
        : null;

      setCreated(invitePayload);
      if (data.employee) {
        onCreated(
          data.employee as EmployeeRecord,
          invitePayload,
          (data.invitationSummary as EmployeeInvitationSummary) || null
        );
      }
    } catch {
      setError("Network error while creating employee invitation.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.activationUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <SlideOver
      open={open}
      onClose={() => {
        resetForm();
        onClose();
      }}
      width={560}
      title="Invite Employee"
      subtitle="Provision a zero-trust account with scoped role permissions and a 48-hour activation link."
    >
      {created ? (
        <div className="hz-iam-invite-done">
          <div className="hz-iam-invite-done-head">
            <StatusBadge
              tone={
                created.deliveryStatus === "accepted_by_provider" ||
                created.deliveryStatus === "delivered"
                  ? "blue"
                  : "rose"
              }
              dot
            >
              {created.deliveryStatus === "accepted_by_provider"
                ? "Accepted by Resend"
                : created.deliveryStatus === "delivered"
                ? "Delivered to Inbox"
                : "Email Delivery Failed"}
            </StatusBadge>
            <h3>
              {created.deliveryStatus === "accepted_by_provider"
                ? `Invitation email accepted for ${created.employeeName}`
                : `Invitation token created, but email failed for ${created.employeeName}`}
            </h3>
            {created.deliveryStatus === "accepted_by_provider" ? (
              <p>
                Resend accepted the invitation email to{" "}
                <strong>{created.employeeEmail}</strong>
                {created.providerMessageId ? (
                  <>
                    {" "}
                    (Message ID: <code>{created.providerMessageId}</code>)
                  </>
                ) : null}
                . Final mailbox delivery will update automatically via webhook.
              </p>
            ) : (
              <p className="hz-alert-error" style={{ marginTop: 8 }}>
                {created.deliveryError ||
                  "The email provider could not dispatch this invitation. You can retry via Resend once configured, or copy the single-use link below."}
              </p>
            )}
          </div>

          <div className="hz-iam-link-box">
            <label htmlFor="hz-created-invite-url">
              Single-Use Activation URL (48h TTL — Secure Backup Handoff)
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                id="hz-created-invite-url"
                readOnly
                value={created.activationUrl}
                onFocus={(e) => e.currentTarget.select()}
              />
              <button
                type="button"
                className="hz-btn hz-btn-primary hz-btn-sm"
                onClick={() => void handleCopy()}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <small>
              Role: <strong>{created.roleLabel}</strong> · Expires{" "}
              <strong>{new Date(created.expiresAt).toLocaleString()}</strong> · Token is SHA-256
              hashed at rest and cannot be replayed after activation.
            </small>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <button
              type="button"
              className="hz-btn hz-btn-secondary"
              onClick={resetForm}
            >
              Invite Another
            </button>
            <button
              type="button"
              className="hz-btn hz-btn-primary"
              onClick={() => {
                resetForm();
                onClose();
              }}
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="hz-iam-drawer-form">
          {error ? <p className="hz-alert-error" style={{ margin: 0 }}>{error}</p> : null}
          {!emailDeliveryReady && emailConfigWarning ? (
            <p className="hz-alert-warning" style={{ margin: 0 }}>
              {emailConfigWarning}
            </p>
          ) : null}

          {/* Section 1: Employee Information */}
          <div className="hz-iam-form-section">
            <span className="hz-iam-section-kicker">1. Employee Information</span>
            <div className="field-grid">
              <div className="field">
                <label htmlFor="inv-name">Full Name *</label>
                <input
                  id="inv-name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Sara Al-Mansoor"
                />
              </div>
              <div className="field">
                <label htmlFor="inv-email">Work Email *</label>
                <input
                  id="inv-email"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sara@hirzexa.com"
                />
              </div>
              <div className="field">
                <label htmlFor="inv-title">Job Title</label>
                <input
                  id="inv-title"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Account Executive"
                />
              </div>
              <div className="field">
                <label htmlFor="inv-dept">Department</label>
                <input
                  id="inv-dept"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Sales, Engineering, HR, Marketing"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Access Configuration */}
          <div className="hz-iam-form-section">
            <span className="hz-iam-section-kicker">2. Access Configuration</span>

            <div className="field-grid">
              <div className="field">
                <label htmlFor="inv-role">Assigned Role Template *</label>
                <select
                  id="inv-role"
                  value={roleKey}
                  onChange={(e) => {
                    setRoleKey(e.target.value as RoleKey);
                    setOverrides({});
                  }}
                >
                  {selectableRoles.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="inv-scope">Record Access Scope</label>
                <select
                  id="inv-scope"
                  value={scopeOverride}
                  onChange={(e) => setScopeOverride(e.target.value)}
                >
                  <option value="">
                    Use role default ({SCOPE_METADATA[template.defaultScope].short})
                  </option>
                  {ACCESS_SCOPES.map((s) => (
                    <option key={s} value={s}>
                      {SCOPE_METADATA[s].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="hz-iam-preview-box">
              <div className="hz-iam-preview-head">
                <strong>{template.label}</strong>
                <StatusBadge tone="blue">{SCOPE_METADATA[effectiveScope].label}</StatusBadge>
              </div>
              <p>{template.description}</p>
              <p className="hz-iam-scope-explain">
                <strong>Scope behavior:</strong> {SCOPE_METADATA[effectiveScope].description}
              </p>
              <div className="hz-iam-mod-chips">
                {PERMISSION_MODULES.map((mod) => {
                  const acts = overrides[mod] ?? template.permissions[mod];
                  if (!acts || acts.length === 0) return null;
                  return (
                    <StatusBadge key={mod} tone={overrides[mod] ? "violet" : "neutral"}>
                      {MODULE_LABELS[mod]}: {acts.includes("manage") ? "Full" : acts.join(", ")}
                    </StatusBadge>
                  );
                })}
              </div>
            </div>

            {/* Optional Permission Overrides Accordion */}
            <div className="hz-ag-tech-accordion" style={{ marginTop: 0 }}>
              <button
                type="button"
                className="hz-ag-tech-toggle"
                onClick={() => setOverridesOpen((v) => !v)}
                aria-expanded={overridesOpen}
              >
                <span>
                  Optional Per-Employee Permission Overrides
                  {Object.keys(overrides).length > 0
                    ? ` (${Object.keys(overrides).length} modified)`
                    : ""}
                </span>
                {overridesOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>

              {overridesOpen ? (
                <div className="hz-iam-override-grid">
                  {PERMISSION_MODULES.filter((mod) =>
                    isSuperAdmin ? true : mod !== "team" && mod !== "audit"
                  ).map((mod) => {
                    const effective = overrides[mod] ?? template.permissions[mod] ?? [];
                    return (
                      <div key={mod} className="hz-iam-override-row">
                        <span className="hz-iam-override-mod">{MODULE_LABELS[mod]}</span>
                        <div className="hz-iam-override-acts">
                          {PERMISSION_ACTIONS.filter((act) =>
                            isSuperAdmin ? true : act !== "manage"
                          ).map((act) => {
                            const checked = effective.includes(act);
                            return (
                              <label key={act} className="hz-iam-mini-check">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleOverrideAction(mod, act)}
                                />
                                <span>{ACTION_LABELS[act]}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>

          {/* Section 3: Zero-Trust Security Information */}
          <div className="hz-iam-security-box">
            <div className="hz-iam-security-head">
              <ShieldCheck size={16} color="#60A5FA" />
              <strong>Zero-Trust Provisioning Policy</strong>
            </div>
            <ul>
              <li>Generates a single-use, SHA-256 hashed activation link (no plaintext passwords).</li>
              <li>Expires automatically after <strong>48 hours</strong> per backend security policy.</li>
              <li>The employee sets their own password securely via <code>/admin/activate</code>.</li>
              <li>Access is strictly enforced server-side via RBAC and PostgreSQL RLS.</li>
            </ul>
          </div>

          <div className="hz-iam-drawer-foot">
            <button
              type="button"
              className="hz-btn hz-btn-secondary"
              onClick={() => {
                resetForm();
                onClose();
              }}
            >
              Cancel
            </button>
            <button type="submit" className="hz-crm-new-btn" disabled={saving}>
              {saving ? (
                <>
                  <KeyRound size={14} /> Creating…
                </>
              ) : (
                <>
                  <UserPlus size={14} /> Create Invitation
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </SlideOver>
  );
}
