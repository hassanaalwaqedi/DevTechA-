"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Clock,
  KeyRound,
  Mail,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  UserX,
} from "lucide-react";
import {
  EmptyState,
  SlideOver,
  StatusBadge,
} from "@/components/admin-ui/primitives";
import {
  ACTION_LABELS,
  describeInvitationDelivery,
  formatLocalTimestamp,
  MODULE_LABELS,
  roleBadgeTone,
  SCOPE_METADATA,
} from "@/components/team/types";
import type {
  AuditLogEntry,
  EmployeeInvitationSummary,
  EmployeeRecord,
} from "@/lib/intelligence/types";
import {
  ACCESS_SCOPES,
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  resolveEffectivePermissions,
  type AccessScope,
  type ModulePermissionMap,
  type PermissionAction,
  type PermissionModule,
  type RoleKey,
  type RoleTemplate,
} from "@/lib/rbac";

export function EmployeeDetailDrawer({
  employee,
  latestInvitation,
  initialTab,
  roles,
  auditLogs,
  currentActorId,
  activeSuperAdminCount,
  isSuperAdmin,
  canEdit,
  canUseAgent,
  canViewAudit,
  saving,
  resending,
  onClose,
  onPatchEmployee,
  onResendInvite,
  onAskAgent,
}: {
  employee: EmployeeRecord | null;
  latestInvitation?: EmployeeInvitationSummary | null;
  initialTab: "overview" | "permissions" | "security" | "activity";
  roles: RoleTemplate[];
  auditLogs: AuditLogEntry[];
  currentActorId: string;
  activeSuperAdminCount: number;
  isSuperAdmin: boolean;
  canEdit: boolean;
  canUseAgent: boolean;
  canViewAudit: boolean;
  saving: boolean;
  resending: boolean;
  onClose: () => void;
  onPatchEmployee: (
    employee: EmployeeRecord,
    patch: {
      roleKey?: RoleKey;
      scopeOverride?: AccessScope | null;
      permissionOverrides?: ModulePermissionMap;
      status?: "invited" | "active" | "suspended";
      revokeSessions?: boolean;
    }
  ) => Promise<void>;
  onResendInvite: (employee: EmployeeRecord) => Promise<void>;
  onAskAgent: (employee: EmployeeRecord, prompt: string) => void;
}) {
  const [tab, setTab] = useState<"overview" | "permissions" | "security" | "activity">(initialTab);
  const [trackedKey, setTrackedKey] = useState<string>("");

  const [draftRole, setDraftRole] = useState<RoleKey>("engineer");
  const [draftScope, setDraftScope] = useState<string>("");
  const [draftOverrides, setDraftOverrides] = useState<ModulePermissionMap>({});
  const [pendingActionConfirm, setPendingActionConfirm] = useState<
    null | "suspend" | "reactivate" | "revoke" | "access_change"
  >(null);

  const syncKey = employee ? `${employee.id}:${employee.updatedAt}:${initialTab}` : "";
  if (employee && trackedKey !== syncKey) {
    setTrackedKey(syncKey);
    setTab(initialTab);
    setDraftRole(employee.roleKey);
    setDraftScope(employee.scopeOverride || "");
    setDraftOverrides(employee.permissionOverrides || {});
    setPendingActionConfirm(null);
  }

  const selectableRoles = useMemo(
    () => (isSuperAdmin ? roles : roles.filter((r) => r.key !== "super_admin")),
    [isSuperAdmin, roles]
  );

  const employeeAudit = useMemo(() => {
    if (!employee) return [];
    return auditLogs.filter(
      (log) =>
        log.entityId === employee.id ||
        log.actorEmail.toLowerCase() === employee.email.toLowerCase()
    );
  }, [auditLogs, employee]);

  if (!employee) {
    return <SlideOver open={false} onClose={onClose} title="" width={680}>{null}</SlideOver>;
  }

  const isSelf = employee.id === currentActorId;
  const currentTemplate = roles.find((r) => r.key === employee.roleKey) || roles[0];
  const proposedTemplate = roles.find((r) => r.key === draftRole) || currentTemplate;
  const currentEffectiveScope: AccessScope =
    employee.scopeOverride || currentTemplate.defaultScope;
  const proposedEffectiveScope: AccessScope =
    (draftScope as AccessScope) || proposedTemplate.defaultScope;

  const isLastActiveSuperAdmin =
    employee.roleKey === "super_admin" &&
    employee.status === "active" &&
    activeSuperAdminCount <= 1;

  const canModifyTarget =
    canEdit && !isSelf && (isSuperAdmin || employee.roleKey !== "super_admin");

  const hasRoleOrScopeChange =
    draftRole !== employee.roleKey || (draftScope || null) !== (employee.scopeOverride || null);

  const hasOverrideChange =
    JSON.stringify(draftOverrides || {}) !== JSON.stringify(employee.permissionOverrides || {});

  const effectivePerms = resolveEffectivePermissions(draftRole, draftOverrides);

  function togglePerm(mod: PermissionModule, act: PermissionAction) {
    if (!canModifyTarget) return;
    setDraftOverrides((prev) => {
      const currentActs = prev[mod] ?? proposedTemplate.permissions[mod] ?? [];
      const has = currentActs.includes(act);
      const nextActs = has ? currentActs.filter((a) => a !== act) : [...currentActs, act];
      return { ...prev, [mod]: nextActs };
    });
  }

  return (
    <SlideOver
      open={Boolean(employee)}
      onClose={onClose}
      width={680}
      title={`${employee.fullName}${isSelf ? " (You)" : ""}`}
      subtitle={`${employee.email} · ${employee.jobTitle || currentTemplate.label} · ${employee.department}`}
      headerActions={
        canUseAgent ? (
          <button
            type="button"
            className="hz-btn hz-btn-primary hz-btn-sm"
            onClick={() =>
              onAskAgent(
                employee,
                `Explain ${employee.fullName}'s (${employee.email}) current role, access scope, and module permissions.`
              )
            }
          >
            <Sparkles size={12} /> Explain Access
          </button>
        ) : null
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Navigation Tabs */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div className="hz-tabs" role="tablist" aria-label="Employee detail tabs">
            {(
              [
                ["overview", "Overview"],
                ["permissions", "Permissions"],
                ["security", "Security"],
                ["activity", `Activity (${employeeAudit.length})`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className={`hz-tab ${tab === id ? "active" : ""}`}
                onClick={() => {
                  setTab(id);
                  setPendingActionConfirm(null);
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <StatusBadge
            dot
            tone={
              employee.status === "active"
                ? "emerald"
                : employee.status === "suspended"
                ? "rose"
                : "amber"
            }
          >
            {employee.status === "invited"
              ? "Pending Activation"
              : employee.status === "active"
              ? "Active"
              : "Suspended"}
          </StatusBadge>
        </div>

        {/* TAB 1: OVERVIEW */}
        {tab === "overview" ? (
          <>
            <div className="admin-detail-grid">
              <div>
                <span>Assigned Role</span>
                <StatusBadge tone={roleBadgeTone(employee.roleKey)}>
                  {currentTemplate.label}
                </StatusBadge>
              </div>
              <div>
                <span>Effective Access Scope</span>
                <strong>{SCOPE_METADATA[currentEffectiveScope].label}</strong>
              </div>
              <div>
                <span>Account Created</span>
                <strong>{formatLocalTimestamp(employee.createdAt)}</strong>
              </div>
              <div>
                <span>Last Activity</span>
                <strong>{formatLocalTimestamp(employee.lastActiveAt)}</strong>
              </div>
            </div>

            <div className="hz-iam-preview-box">
              <div className="hz-iam-preview-head">
                <strong>Scope Policy: {SCOPE_METADATA[currentEffectiveScope].label}</strong>
                {employee.scopeOverride ? (
                  <StatusBadge tone="violet">Custom Scope Override</StatusBadge>
                ) : (
                  <StatusBadge tone="neutral">Role Default</StatusBadge>
                )}
              </div>
              <p>{SCOPE_METADATA[currentEffectiveScope].description}</p>
            </div>

            {/* Role & Scope Governance Editor with Change Summary Confirmation */}
            <div className="hz-panel" style={{ marginBottom: 0 }}>
              <div className="hz-panel-head">
                <div>
                  <h2>Role &amp; Scope Assignment</h2>
                  <p>Changes are validated server-side, logged to audit history, and enforced by RLS.</p>
                </div>
              </div>

              <div className="field-grid">
                <div className="field">
                  <label htmlFor="emp-role-select">Role Template</label>
                  <select
                    id="emp-role-select"
                    disabled={!canModifyTarget || saving || isLastActiveSuperAdmin}
                    value={draftRole}
                    onChange={(e) => setDraftRole(e.target.value as RoleKey)}
                  >
                    {selectableRoles.map((r) => (
                      <option key={r.key} value={r.key}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="emp-scope-select">Record Access Scope</label>
                  <select
                    id="emp-scope-select"
                    disabled={!canModifyTarget || saving}
                    value={draftScope}
                    onChange={(e) => setDraftScope(e.target.value)}
                  >
                    <option value="">
                      Role default ({SCOPE_METADATA[proposedTemplate.defaultScope].short})
                    </option>
                    {ACCESS_SCOPES.map((s) => (
                      <option key={s} value={s}>
                        {SCOPE_METADATA[s].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {isLastActiveSuperAdmin ? (
                <p className="hz-iam-guard-note">
                  <ShieldAlert size={13} /> This is the only active Super Admin account. Assign
                  another active Super Admin before downgrading or suspending it.
                </p>
              ) : isSelf ? (
                <p className="hz-iam-guard-note">
                  Self-modification is disabled to prevent accidental lockout or self-escalation.
                </p>
              ) : null}

              {canModifyTarget && hasRoleOrScopeChange ? (
                <div className="hz-iam-diff-box">
                  <div className="hz-iam-diff-title">
                    <AlertTriangle size={14} color="#FBBF24" />
                    <strong>Confirm Access Change</strong>
                  </div>
                  <div className="hz-iam-diff-rows">
                    <div>
                      <span>Current:</span>{" "}
                      <strong>
                        {currentTemplate.label} — {SCOPE_METADATA[currentEffectiveScope].label}
                      </strong>
                    </div>
                    <div>
                      <span>Proposed:</span>{" "}
                      <strong style={{ color: "#93C5FD" }}>
                        {proposedTemplate.label} — {SCOPE_METADATA[proposedEffectiveScope].label}
                      </strong>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button
                      type="button"
                      className="hz-btn hz-btn-primary hz-btn-sm"
                      disabled={saving}
                      onClick={() =>
                        void onPatchEmployee(employee, {
                          roleKey: draftRole,
                          scopeOverride: draftScope ? (draftScope as AccessScope) : null,
                        })
                      }
                    >
                      <Check size={13} /> Apply Access Change
                    </button>
                    <button
                      type="button"
                      className="hz-btn hz-btn-secondary hz-btn-sm"
                      onClick={() => {
                        setDraftRole(employee.roleKey);
                        setDraftScope(employee.scopeOverride || "");
                      }}
                    >
                      Revert
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </>
        ) : null}

        {/* TAB 2: PERMISSIONS MATRIX (ROLE DEFAULTS vs CUSTOM OVERRIDES) */}
        {tab === "permissions" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="hz-iam-perm-legend">
              <span>
                <i className="is-default" /> Inherited from {currentTemplate.label}
              </span>
              <span>
                <i className="is-override" /> Custom per-employee override
              </span>
              <span>
                <i className="is-none" /> Not granted
              </span>
            </div>

            <div className="hz-table-wrap">
              <table className="hz-table">
                <thead>
                  <tr>
                    <th>Module</th>
                    {PERMISSION_ACTIONS.map((act) => (
                      <th key={act} style={{ textAlign: "center", padding: "8px 6px" }}>
                        {ACTION_LABELS[act]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERMISSION_MODULES.map((mod) => {
                    const baseActs = proposedTemplate.permissions[mod] || [];
                    const effActs = effectivePerms[mod] || [];
                    const isOverriddenMod = Array.isArray(draftOverrides[mod]);
                    const lockedMod =
                      !canModifyTarget ||
                      (!isSuperAdmin && (mod === "team" || mod === "audit"));

                    return (
                      <tr key={mod}>
                        <td>
                          <strong style={{ fontSize: 12.5 }}>{MODULE_LABELS[mod]}</strong>
                          {isOverriddenMod ? (
                            <span className="hz-iam-override-dot" style={{ marginInlineStart: 6 }}>
                              Custom
                            </span>
                          ) : null}
                        </td>
                        {PERMISSION_ACTIONS.map((act) => {
                          const enabled = effActs.includes(act);
                          const inBase = baseActs.includes(act);
                          const isCustomDiff = enabled !== inBase;
                          return (
                            <td key={act} style={{ textAlign: "center", padding: "8px 6px" }}>
                              <button
                                type="button"
                                disabled={lockedMod || saving}
                                className={`hz-iam-perm-cell ${
                                  enabled
                                    ? isCustomDiff
                                      ? "is-override"
                                      : "is-default"
                                    : isCustomDiff
                                    ? "is-denied-override"
                                    : "is-off"
                                }`}
                                onClick={() => togglePerm(mod, act)}
                                title={
                                  lockedMod
                                    ? "Read-only permission"
                                    : `Toggle ${ACTION_LABELS[act]} on ${MODULE_LABELS[mod]}`
                                }
                                aria-label={`${MODULE_LABELS[mod]} ${ACTION_LABELS[act]}: ${
                                  enabled ? "enabled" : "disabled"
                                }`}
                              >
                                {enabled ? <Check size={12} /> : "—"}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {canModifyTarget ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <button
                  type="button"
                  className="hz-btn hz-btn-ghost hz-btn-sm"
                  disabled={saving || Object.keys(draftOverrides).length === 0}
                  onClick={() => setDraftOverrides({})}
                >
                  <RotateCcw size={12} /> Reset to Role Defaults
                </button>

                {hasOverrideChange ? (
                  <button
                    type="button"
                    className="hz-btn hz-btn-primary hz-btn-sm"
                    disabled={saving}
                    onClick={() =>
                      void onPatchEmployee(employee, { permissionOverrides: draftOverrides })
                    }
                  >
                    <Check size={13} /> Save Permission Overrides
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* TAB 3: SECURITY & SESSION GOVERNANCE */}
        {tab === "security" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {employee.status === "invited" ? (() => {
              const delivery = describeInvitationDelivery(latestInvitation, employee.status);
              return (
                <div className="hz-panel" style={{ marginBottom: 0 }}>
                  <div className="hz-panel-head">
                    <div>
                      <h2>Invitation Email Delivery</h2>
                      <p>
                        Tracks transactional Resend dispatch and verified webhook delivery events.
                      </p>
                    </div>
                    <StatusBadge tone={delivery.tone} dot>
                      {delivery.label}
                    </StatusBadge>
                  </div>

                  <div className="admin-detail-grid" style={{ marginBottom: 12 }}>
                    <div>
                      <span>Email Provider</span>
                      <strong>{latestInvitation?.emailProvider || "Resend"}</strong>
                    </div>
                    <div>
                      <span>Provider Message ID</span>
                      <strong style={{ fontSize: 11.5, wordBreak: "break-all" }}>
                        {latestInvitation?.providerMessageId || "Not dispatched"}
                      </strong>
                    </div>
                    <div>
                      <span>Invitation Expires</span>
                      <strong>
                        {latestInvitation
                          ? formatLocalTimestamp(latestInvitation.expiresAt)
                          : "48h from issuance"}
                      </strong>
                    </div>
                    <div>
                      <span>Webhook Confirmation</span>
                      <strong>
                        {latestInvitation?.deliveredAt
                          ? formatLocalTimestamp(latestInvitation.deliveredAt)
                          : latestInvitation?.lastWebhookEvent || "Awaiting delivery event"}
                      </strong>
                    </div>
                  </div>

                  {latestInvitation?.deliveryError ? (
                    <p className="hz-alert-error" style={{ marginBottom: 12 }}>
                      {latestInvitation.deliveryError}
                    </p>
                  ) : null}

                  {canEdit ? (
                    <button
                      type="button"
                      className="hz-btn hz-btn-primary hz-btn-sm"
                      disabled={resending || saving}
                      onClick={() => void onResendInvite(employee)}
                    >
                      <Mail size={13} />
                      {resending
                        ? "Revoking & Resending…"
                        : "Resend Invitation (Revokes Previous Link)"}
                    </button>
                  ) : null}
                </div>
              );
            })() : null}

            <div className="admin-detail-grid">
              <div>
                <span>Activation State</span>
                <strong>
                  {employee.status === "invited"
                    ? "Awaiting activation"
                    : employee.authUserId
                    ? "Activated & Linked"
                    : "Provisioned"}
                </strong>
              </div>
              <div>
                <span>MFA Verification</span>
                <strong style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {employee.mfaEnrolled ? (
                    <>
                      <ShieldCheck size={14} color="#34D399" /> Verified TOTP
                    </>
                  ) : (
                    <>
                      <ShieldOff size={14} color="#94A3B8" /> Password Only
                    </>
                  )}
                </strong>
              </div>
              <div>
                <span>Session Version</span>
                <strong>v{employee.sessionVersion}</strong>
              </div>
              <div>
                <span>Last Authenticated Activity</span>
                <strong>{formatLocalTimestamp(employee.lastActiveAt)}</strong>
              </div>
            </div>

            {/* Session Revocation Card */}
            <div className="hz-panel" style={{ marginBottom: 0 }}>
              <div className="hz-panel-head">
                <div>
                  <h2>Session Revocation</h2>
                  <p>
                    Increments <code>session_version</code> (currently v{employee.sessionVersion}).
                    Existing browser sessions carrying an older version cookie are rejected on
                    their next authenticated server request.
                  </p>
                </div>
              </div>

              {pendingActionConfirm === "revoke" ? (
                <div className="hz-iam-diff-box">
                  <div className="hz-iam-diff-title">
                    <KeyRound size={14} color="#FBBF24" />
                    <strong>Confirm Session Revocation for {employee.email}</strong>
                  </div>
                  <p style={{ margin: "6px 0 10px", fontSize: 12, color: "#CBD5E1" }}>
                    The employee will be required to sign in again on their next server request.
                    This action is recorded in Audit Logs.
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="hz-btn hz-btn-primary hz-btn-sm"
                      disabled={saving}
                      onClick={() =>
                        void onPatchEmployee(employee, { revokeSessions: true }).then(() =>
                          setPendingActionConfirm(null)
                        )
                      }
                    >
                      Confirm Revocation
                    </button>
                    <button
                      type="button"
                      className="hz-btn hz-btn-secondary hz-btn-sm"
                      onClick={() => setPendingActionConfirm(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="hz-btn hz-btn-secondary"
                  disabled={!canModifyTarget || saving}
                  onClick={() => setPendingActionConfirm("revoke")}
                >
                  <KeyRound size={14} /> Revoke Active Sessions
                </button>
              )}
            </div>

            {/* Account Suspension / Reactivation Card */}
            <div className="hz-panel" style={{ marginBottom: 0 }}>
              <div className="hz-panel-head">
                <div>
                  <h2>
                    {employee.status === "suspended"
                      ? "Reactivate Employee Account"
                      : "Suspend Employee Account"}
                  </h2>
                  <p>
                    {employee.status === "suspended"
                      ? "Restores access according to this account's assigned role template and scope."
                      : "Suspending blocks access on the next server check, increments session_version, and prevents PostgreSQL RLS access."}
                  </p>
                </div>
              </div>

              {pendingActionConfirm === "suspend" || pendingActionConfirm === "reactivate" ? (
                <div className="hz-iam-diff-box is-danger">
                  <div className="hz-iam-diff-title">
                    <AlertTriangle size={14} color="#FB7185" />
                    <strong>
                      {pendingActionConfirm === "suspend"
                        ? "Suspending this employee will revoke access to HIRZEXA Intelligence."
                        : `Reactivate ${employee.fullName}'s workspace access?`}
                    </strong>
                  </div>
                  <p style={{ margin: "6px 0 10px", fontSize: 12, color: "#CBD5E1" }}>
                    {pendingActionConfirm === "suspend"
                      ? "Active sessions are invalidated on their next server check via status verification and session_version increment. Historical audit records are preserved."
                      : "The employee will regain access permitted by their role template upon signing in."}
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className={`hz-btn hz-btn-sm ${
                        pendingActionConfirm === "suspend" ? "hz-btn-danger" : "hz-btn-primary"
                      }`}
                      disabled={saving}
                      onClick={() =>
                        void onPatchEmployee(employee, {
                          status: pendingActionConfirm === "suspend" ? "suspended" : "active",
                        }).then(() => setPendingActionConfirm(null))
                      }
                    >
                      {pendingActionConfirm === "suspend"
                        ? "Confirm Suspension"
                        : "Confirm Reactivation"}
                    </button>
                    <button
                      type="button"
                      className="hz-btn hz-btn-secondary hz-btn-sm"
                      onClick={() => setPendingActionConfirm(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className={`hz-btn ${
                    employee.status === "suspended" ? "hz-btn-primary" : "hz-btn-danger"
                  }`}
                  disabled={!canModifyTarget || saving || isLastActiveSuperAdmin}
                  onClick={() =>
                    setPendingActionConfirm(
                      employee.status === "suspended" ? "reactivate" : "suspend"
                    )
                  }
                >
                  {employee.status === "suspended" ? (
                    <>
                      <ShieldCheck size={14} /> Reactivate Account
                    </>
                  ) : (
                    <>
                      <UserX size={14} /> Suspend Account
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        ) : null}

        {/* TAB 4: REAL AUDIT ACTIVITY TIMELINE */}
        {tab === "activity" ? (
          <div>
            {!canViewAudit ? (
              <EmptyState
                title="Audit log access restricted"
                description="Your current role does not include Audit Log read permissions."
              />
            ) : employeeAudit.length > 0 ? (
              <div className="hz-row-list">
                {employeeAudit.slice(0, 20).map((log) => (
                  <div key={log.id} className="hz-list-row" style={{ alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <strong>{log.summary}</strong>
                      <small style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <Clock size={11} />
                        {formatLocalTimestamp(log.createdAt)} · Actor: {log.actorEmail} ·{" "}
                        {log.module}/{log.action}
                      </small>
                    </div>
                    <StatusBadge
                      tone={
                        log.outcome === "denied"
                          ? "rose"
                          : log.outcome === "error"
                          ? "amber"
                          : "emerald"
                      }
                    >
                      {log.outcome}
                    </StatusBadge>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No recorded audit activity yet"
                description="Administrative role updates, session revocations, and authorized actions for this employee appear here automatically."
              />
            )}
          </div>
        ) : null}
      </div>
    </SlideOver>
  );
}
