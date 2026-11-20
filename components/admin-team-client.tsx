"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  Shield,
  Sparkles,
  UserPlus,
  X,
} from "lucide-react";
import { StatusBadge } from "@/components/admin-ui/primitives";
import { EmployeeDetailDrawer } from "@/components/team/EmployeeDetailDrawer";
import { EmployeeDirectory } from "@/components/team/EmployeeDirectory";
import { InviteEmployeeDrawer } from "@/components/team/InviteEmployeeDrawer";
import { RoleMatrixModal } from "@/components/team/RoleMatrixModal";
import { TeamOverviewMetrics } from "@/components/team/TeamOverviewMetrics";
import type { CreatedInvite } from "@/components/team/types";
import type {
  AuditLogEntry,
  EmployeeInvitationSummary,
  EmployeeRecord,
} from "@/lib/intelligence/types";
import type {
  AccessScope,
  ModulePermissionMap,
  RoleKey,
  RoleTemplate,
} from "@/lib/rbac";

const PAGE_SIZE = 10;

export function AdminTeamClient({
  initialEmployees,
  initialInvitations,
  initialAuditLogs,
  roles,
  currentActorId,
  isSuperAdmin,
  canCreate,
  canEdit,
  canUseAgent,
  canViewAudit,
  emailDeliveryReady,
  emailConfigWarning,
}: {
  initialEmployees: EmployeeRecord[];
  initialInvitations: Record<string, EmployeeInvitationSummary>;
  initialAuditLogs: AuditLogEntry[];
  roles: RoleTemplate[];
  currentActorId: string;
  isSuperAdmin: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canUseAgent: boolean;
  canViewAudit: boolean;
  emailDeliveryReady: boolean;
  emailConfigWarning: string | null;
}) {
  const [employees, setEmployees] = useState<EmployeeRecord[]>(initialEmployees);
  const [invitationsByEmployee, setInvitationsByEmployee] =
    useState<Record<string, EmployeeInvitationSummary>>(initialInvitations);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(initialAuditLogs);

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<
    "fullName" | "department" | "roleKey" | "status" | "lastActiveAt"
  >("fullName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<EmployeeRecord | null>(null);
  const [detailTab, setDetailTab] = useState<
    "overview" | "permissions" | "security" | "activity"
  >("overview");

  const [saving, setSaving] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [createdInviteBanner, setCreatedInviteBanner] = useState<CreatedInvite | null>(null);
  const [copiedBanner, setCopiedBanner] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim().toLowerCase());
    }, 180);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, departmentFilter, roleFilter, statusFilter]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    for (const emp of employees) {
      if (emp.department?.trim()) set.add(emp.department.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees
      .filter((emp) => {
        if (departmentFilter !== "all" && emp.department !== departmentFilter) return false;
        if (roleFilter !== "all" && emp.roleKey !== roleFilter) return false;
        if (statusFilter !== "all" && emp.status !== statusFilter) return false;
        if (debouncedSearch) {
          const hay = `${emp.fullName} ${emp.email} ${emp.department} ${emp.jobTitle}`.toLowerCase();
          if (!hay.includes(debouncedSearch)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const factor = sortDir === "asc" ? 1 : -1;
        if (sortBy === "department") {
          return a.department.localeCompare(b.department) * factor;
        }
        if (sortBy === "roleKey") {
          return a.roleKey.localeCompare(b.roleKey) * factor;
        }
        if (sortBy === "status") {
          return a.status.localeCompare(b.status) * factor;
        }
        if (sortBy === "lastActiveAt") {
          const ta = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
          const tb = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
          return (ta - tb) * factor;
        }
        return a.fullName.localeCompare(b.fullName) * factor;
      });
  }, [employees, departmentFilter, roleFilter, statusFilter, debouncedSearch, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / PAGE_SIZE));
  const paginatedEmployees = filteredEmployees.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const activeCount = employees.filter((e) => e.status === "active").length;
  const invitedCount = employees.filter((e) => e.status === "invited").length;
  const suspendedCount = employees.filter((e) => e.status === "suspended").length;
  const activeSuperAdminCount = employees.filter(
    (e) => e.roleKey === "super_admin" && e.status === "active"
  ).length;

  function toggleSort(col: "fullName" | "department" | "roleKey" | "status" | "lastActiveAt") {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
  }

  async function refreshAuditLogs() {
    if (!canViewAudit) return;
    try {
      const res = await fetch("/api/admin/audit-logs?limit=80", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.logs)) {
        setAuditLogs(data.logs as AuditLogEntry[]);
      }
    } catch {}
  }

  async function patchEmployee(
    employee: EmployeeRecord,
    patch: {
      roleKey?: RoleKey;
      scopeOverride?: AccessScope | null;
      permissionOverrides?: ModulePermissionMap;
      status?: "invited" | "active" | "suspended";
      revokeSessions?: boolean;
    }
  ) {
    if (!canEdit) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/team/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Unable to update employee account.");
        return;
      }
      const updated = data.employee as EmployeeRecord;
      setEmployees((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      if (selectedEmp?.id === updated.id) setSelectedEmp(updated);
      if (patch.revokeSessions) {
        setNotice(
          `Revoked active sessions for ${updated.email} (session v${updated.sessionVersion}).`
        );
      } else if (patch.status === "suspended") {
        setNotice(
          `Suspended ${updated.fullName}. Access will be blocked on their next server check.`
        );
      } else if (patch.status === "active") {
        setNotice(`Reactivated ${updated.fullName}.`);
      } else {
        setNotice(`Updated access permissions for ${updated.fullName}.`);
      }
      void refreshAuditLogs();
    } catch {
      setError("Network error while updating employee account.");
    } finally {
      setSaving(false);
    }
  }

  async function handleResendInvite(employee: EmployeeRecord) {
    if (!canEdit || resendingId) return;
    setResendingId(employee.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/team/${employee.id}/resend`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Unable to resend invitation.");
        return;
      }

      if (data.invitationSummary) {
        setInvitationsByEmployee((prev) => ({
          ...prev,
          [employee.id]: data.invitationSummary as EmployeeInvitationSummary,
        }));
      }

      const roleLabel = roles.find((r) => r.key === employee.roleKey)?.label || employee.roleKey;
      if (data.invitation?.activationUrl) {
        setCreatedInviteBanner({
          employeeName: employee.fullName,
          employeeEmail: employee.email,
          roleLabel,
          activationUrl: data.invitation.activationUrl,
          expiresAt: data.invitation.expiresAt,
          deliveryStatus: data.invitation.deliveryStatus || "delivery_failed",
          emailProvider: data.invitation.emailProvider || "resend",
          providerMessageId: data.invitation.providerMessageId || null,
          deliveryError: data.invitation.deliveryError || null,
          sentAt: data.invitation.sentAt || null,
        });
      }

      if (data.invitation?.deliveryStatus === "accepted_by_provider") {
        setNotice(
          `Previous link revoked. New invitation accepted by Resend for ${employee.email} (ID: ${data.invitation.providerMessageId}).`
        );
      } else {
        setError(
          `Previous link revoked and new 48h token generated, but email delivery failed: ${
            data.invitation?.deliveryError || "Provider error"
          }`
        );
      }
      void refreshAuditLogs();
    } catch {
      setError("Network error while resending invitation.");
    } finally {
      setResendingId(null);
    }
  }

  function askAgentTeam(prompt: string, emp?: EmployeeRecord) {
    window.dispatchEvent(
      new CustomEvent("hirzexa:ask-agent", {
        detail: {
          prompt,
          pageContext: emp
            ? {
                route: "/admin/team",
                entityType: "employee",
                entityId: emp.id,
                entityLabel: emp.fullName,
              }
            : { route: "/admin/team", entityType: "dashboard" },
        },
      })
    );
  }

  async function copyBannerUrl() {
    if (!createdInviteBanner) return;
    try {
      await navigator.clipboard.writeText(createdInviteBanner.activationUrl);
      setCopiedBanner(true);
      window.setTimeout(() => setCopiedBanner(false), 2000);
    } catch {}
  }

  return (
    <div className="hz-iam-root">
      {/* Unified Cosmic Horizon Backdrop */}
      <div className="hz-cc-atmosphere" aria-hidden="true">
        <div className="hz-cc-arc-glow" />
      </div>

      {/* ROW 1: Compact Executive Header */}
      <header className="hz-cc-header">
        <div className="hz-cc-header-left">
          <div className="hz-cc-eyebrow">
            <span className="hz-cc-eyebrow-brand">HIRZEXA</span>
            <span>INTELLIGENCE · ZERO-TRUST IAM</span>
            <span className="hz-cc-eyebrow-line" aria-hidden="true" />
          </div>
          <h1>Team &amp; Access</h1>
          <p>Manage your people, roles, and organizational security.</p>
        </div>

        <div className="hz-iam-header-actions">
          {canUseAgent ? (
            <button
              type="button"
              className="hz-btn hz-btn-secondary"
              onClick={() =>
                askAgentTeam(
                  "Summarize the current HIRZEXA team structure, active roles, and any pending invitations or suspended accounts."
                )
              }
            >
              <Sparkles size={14} color="#818CF8" /> Ask HIRZEXA
            </button>
          ) : null}

          <button
            type="button"
            className="hz-btn hz-btn-secondary"
            onClick={() => setMatrixOpen(true)}
          >
            <Shield size={14} /> Manage Roles
          </button>

          {canCreate ? (
            <button
              type="button"
              className="hz-crm-new-btn"
              onClick={() => {
                setError("");
                setInviteOpen(true);
              }}
            >
              <UserPlus size={14} /> Invite Employee
            </button>
          ) : null}
        </div>
      </header>

      {/* ROW 2: 4 Compact Data-Backed Overview Cards */}
      <TeamOverviewMetrics
        activeCount={activeCount}
        invitedCount={invitedCount}
        suspendedCount={suspendedCount}
        roleCount={roles.length}
        activeStatusFilter={statusFilter}
        onFilterStatus={setStatusFilter}
        onOpenRoles={() => setMatrixOpen(true)}
      />

      {!emailDeliveryReady && emailConfigWarning ? (
        <p className="hz-alert-warning" style={{ margin: 0 }}>
          <strong>Email Delivery Configuration Required:</strong> {emailConfigWarning}
        </p>
      ) : null}

      {error ? <p className="hz-alert-error" style={{ margin: 0 }}>{error}</p> : null}
      {notice ? <p className="hz-alert-success" style={{ margin: 0 }}>{notice}</p> : null}

      {/* Dismissible Single-Use Activation Link & Delivery Status Banner */}
      {createdInviteBanner ? (
        <section className="hz-iam-invite-banner" aria-label="Invitation delivery status">
          <div className="hz-iam-invite-banner-top">
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <StatusBadge
                tone={
                  createdInviteBanner.deliveryStatus === "accepted_by_provider" ||
                  createdInviteBanner.deliveryStatus === "delivered"
                    ? "blue"
                    : "rose"
                }
                dot
              >
                {createdInviteBanner.deliveryStatus === "accepted_by_provider"
                  ? "Accepted by Resend"
                  : createdInviteBanner.deliveryStatus === "delivered"
                  ? "Delivered"
                  : "Email Delivery Failed"}
              </StatusBadge>
              <strong style={{ fontSize: 13, color: "#F8FAFC" }}>
                {createdInviteBanner.employeeName} ({createdInviteBanner.employeeEmail})
              </strong>
              {createdInviteBanner.providerMessageId ? (
                <code style={{ fontSize: 11, color: "#93C5FD" }}>
                  ID: {createdInviteBanner.providerMessageId}
                </code>
              ) : null}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                type="button"
                className="hz-btn hz-btn-primary hz-btn-sm"
                onClick={() => void copyBannerUrl()}
              >
                {copiedBanner ? <Check size={12} /> : <Copy size={12} />}
                {copiedBanner ? "Copied" : "Copy Backup Link"}
              </button>
              <button
                type="button"
                className="hz-icon-btn"
                style={{ width: 28, height: 28 }}
                onClick={() => setCreatedInviteBanner(null)}
                aria-label="Dismiss invitation banner"
              >
                <X size={13} />
              </button>
            </div>
          </div>
          {createdInviteBanner.deliveryError ? (
            <div style={{ fontSize: 12, color: "#FDA4AF" }}>
              {createdInviteBanner.deliveryError}
            </div>
          ) : null}
          <input
            readOnly
            value={createdInviteBanner.activationUrl}
            aria-label="Generated activation URL"
            onFocus={(e) => e.currentTarget.select()}
          />
          <small>
            Single-use SHA-256 link expires{" "}
            <strong>{new Date(createdInviteBanner.expiresAt).toLocaleString()}</strong>. It cannot be
            displayed again after leaving this page.
          </small>
        </section>
      ) : null}

      {/* ROW 3: PRIMARY CONTENT — Enterprise Employee Directory */}
      <EmployeeDirectory
        employees={paginatedEmployees}
        invitationsByEmployee={invitationsByEmployee}
        resendingId={resendingId}
        totalFiltered={filteredEmployees.length}
        totalAll={employees.length}
        roles={roles}
        departments={departments}
        currentActorId={currentActorId}
        selectedId={selectedEmp?.id || null}
        search={searchInput}
        departmentFilter={departmentFilter}
        roleFilter={roleFilter}
        statusFilter={statusFilter}
        page={page}
        totalPages={totalPages}
        pageSize={PAGE_SIZE}
        canCreate={canCreate}
        canEdit={canEdit}
        isSuperAdmin={isSuperAdmin}
        onSearchChange={setSearchInput}
        onDepartmentChange={setDepartmentFilter}
        onRoleChange={setRoleFilter}
        onStatusChange={setStatusFilter}
        onToggleSort={toggleSort}
        onPageChange={setPage}
        onSelectEmployee={(emp) => {
          setDetailTab("overview");
          setSelectedEmp(emp);
        }}
        onOpenPermissions={(emp) => {
          setDetailTab("permissions");
          setSelectedEmp(emp);
        }}
        onOpenSecurity={(emp) => {
          setDetailTab("security");
          setSelectedEmp(emp);
        }}
        onResendInvite={(emp) => void handleResendInvite(emp)}
        onOpenInvite={() => setInviteOpen(true)}
      />

      {/* Right-Side Invite Employee Drawer */}
      <InviteEmployeeDrawer
        open={inviteOpen}
        roles={roles}
        isSuperAdmin={isSuperAdmin}
        emailDeliveryReady={emailDeliveryReady}
        emailConfigWarning={emailConfigWarning}
        onClose={() => setInviteOpen(false)}
        onCreated={(emp, invite, summary) => {
          setEmployees((prev) => [emp, ...prev.filter((e) => e.id !== emp.id)]);
          if (summary) {
            setInvitationsByEmployee((prev) => ({ ...prev, [emp.id]: summary }));
          }
          if (invite) setCreatedInviteBanner(invite);
          setNotice(
            invite?.deliveryStatus === "accepted_by_provider"
              ? `Invitation accepted by Resend for ${emp.email} (ID: ${invite.providerMessageId}).`
              : `Invitation created for ${emp.fullName}. Check delivery status above.`
          );
          void refreshAuditLogs();
        }}
      />

      {/* Full-Height 4-Tab Employee Detail Drawer */}
      <EmployeeDetailDrawer
        employee={selectedEmp}
        latestInvitation={selectedEmp ? invitationsByEmployee[selectedEmp.id] : null}
        initialTab={detailTab}
        roles={roles}
        auditLogs={auditLogs}
        currentActorId={currentActorId}
        activeSuperAdminCount={activeSuperAdminCount}
        isSuperAdmin={isSuperAdmin}
        canEdit={canEdit}
        canUseAgent={canUseAgent}
        canViewAudit={canViewAudit}
        saving={saving}
        resending={Boolean(selectedEmp && resendingId === selectedEmp.id)}
        onClose={() => setSelectedEmp(null)}
        onPatchEmployee={patchEmployee}
        onResendInvite={handleResendInvite}
        onAskAgent={(emp, prompt) => askAgentTeam(prompt, emp)}
      />

      {/* Dedicated 9-Role Permissions & Scope Matrix Workspace */}
      <RoleMatrixModal
        open={matrixOpen}
        roles={roles}
        onClose={() => setMatrixOpen(false)}
      />
    </div>
  );
}
