"use client";

import {
  ArrowUpDown,
  Clock,
  Globe,
  KeyRound,
  Mail,
  Search,
  ShieldCheck,
  ShieldOff,
  SlidersHorizontal,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { EmptyState, StatusBadge } from "@/components/admin-ui/primitives";
import {
  describeInvitationDelivery,
  formatLocalTimestamp,
  getInitials,
  roleBadgeTone,
  SCOPE_METADATA,
} from "@/components/team/types";
import type {
  EmployeeInvitationSummary,
  EmployeeRecord,
} from "@/lib/intelligence/types";
import type { RoleTemplate } from "@/lib/rbac";

export function EmployeeDirectory({
  employees,
  invitationsByEmployee,
  resendingId,
  totalFiltered,
  totalAll,
  roles,
  departments,
  currentActorId,
  selectedId,
  search,
  departmentFilter,
  roleFilter,
  statusFilter,
  page,
  totalPages,
  pageSize,
  canCreate,
  canEdit,
  isSuperAdmin,
  onSearchChange,
  onDepartmentChange,
  onRoleChange,
  onStatusChange,
  onToggleSort,
  onPageChange,
  onSelectEmployee,
  onOpenPermissions,
  onOpenSecurity,
  onResendInvite,
  onOpenInvite,
}: {
  employees: EmployeeRecord[];
  invitationsByEmployee: Record<string, EmployeeInvitationSummary>;
  resendingId: string | null;
  totalFiltered: number;
  totalAll: number;
  roles: RoleTemplate[];
  departments: string[];
  currentActorId: string;
  selectedId: string | null;
  search: string;
  departmentFilter: string;
  roleFilter: string;
  statusFilter: string;
  page: number;
  totalPages: number;
  pageSize: number;
  canCreate: boolean;
  canEdit: boolean;
  isSuperAdmin: boolean;
  onSearchChange: (val: string) => void;
  onDepartmentChange: (val: string) => void;
  onRoleChange: (val: string) => void;
  onStatusChange: (val: string) => void;
  onToggleSort: (col: "fullName" | "department" | "roleKey" | "status" | "lastActiveAt") => void;
  onPageChange: (p: number) => void;
  onSelectEmployee: (emp: EmployeeRecord) => void;
  onOpenPermissions: (emp: EmployeeRecord) => void;
  onOpenSecurity: (emp: EmployeeRecord) => void;
  onResendInvite: (emp: EmployeeRecord) => void;
  onOpenInvite: () => void;
}) {
  return (
    <section className="hz-crm-table-card" aria-label="Employee Directory">
      <div className="hz-crm-card-head">
        <div className="hz-crm-card-title-group">
          <span className="hz-crm-card-emblem" aria-hidden="true">
            <Users size={17} color="#60A5FA" />
          </span>
          <div>
            <h2>Employee Directory</h2>
            <p>
              {totalAll} account{totalAll === 1 ? "" : "s"} · Manage identity, role templates,
              access scopes, and session security.
            </p>
          </div>
        </div>

        <div className="hz-iam-dir-controls">
          <div className="hz-crm-search-box" style={{ maxWidth: 260 }}>
            <Search size={13} color="#7C8BB0" />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search name, email, or title…"
              aria-label="Search employees"
            />
            {search ? (
              <button
                type="button"
                className="hz-crm-clear-x"
                onClick={() => onSearchChange("")}
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            ) : null}
          </div>

          <select
            className="hz-iam-filter-select"
            value={departmentFilter}
            onChange={(e) => onDepartmentChange(e.target.value)}
            aria-label="Filter by department"
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          <select
            className="hz-iam-filter-select"
            value={roleFilter}
            onChange={(e) => onRoleChange(e.target.value)}
            aria-label="Filter by role"
          >
            <option value="all">All Roles</option>
            {roles.map((role) => (
              <option key={role.key} value={role.key}>
                {role.label}
              </option>
            ))}
          </select>

          <select
            className="hz-iam-filter-select"
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            aria-label="Filter by account status"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="invited">Pending Activation</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      <div className="hz-crm-table-scroll">
        <table className="hz-crm-table">
          <thead>
            <tr>
              <th>
                <button
                  type="button"
                  className="hz-sort-btn"
                  onClick={() => onToggleSort("fullName")}
                >
                  Employee <ArrowUpDown size={11} />
                </button>
              </th>
              <th>
                <button
                  type="button"
                  className="hz-sort-btn"
                  onClick={() => onToggleSort("department")}
                >
                  Job Title / Department <ArrowUpDown size={11} />
                </button>
              </th>
              <th>
                <button
                  type="button"
                  className="hz-sort-btn"
                  onClick={() => onToggleSort("roleKey")}
                >
                  Assigned Role <ArrowUpDown size={11} />
                </button>
              </th>
              <th>Access Scope</th>
              <th>
                <button
                  type="button"
                  className="hz-sort-btn"
                  onClick={() => onToggleSort("status")}
                >
                  Account Status <ArrowUpDown size={11} />
                </button>
              </th>
              <th>
                <button
                  type="button"
                  className="hz-sort-btn"
                  onClick={() => onToggleSort("lastActiveAt")}
                >
                  Last Activity <ArrowUpDown size={11} />
                </button>
              </th>
              <th>Security Status</th>
              <th style={{ textAlign: "end" }}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {employees.length > 0 ? (
              employees.map((emp) => {
                const isSelf = emp.id === currentActorId;
                const template = roles.find((r) => r.key === emp.roleKey);
                const effectiveScope = emp.scopeOverride || template?.defaultScope || "own";
                const hasCustomOverrides =
                  emp.permissionOverrides && Object.keys(emp.permissionOverrides).length > 0;
                const canModifyTarget =
                  canEdit && !isSelf && (isSuperAdmin || emp.roleKey !== "super_admin");

                return (
                  <tr
                    key={emp.id}
                    className={selectedId === emp.id ? "is-selected" : ""}
                    tabIndex={0}
                    onClick={() => onSelectEmployee(emp)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectEmployee(emp);
                      }
                    }}
                  >
                    <td>
                      <div className="hz-crm-client-cell" style={{ minWidth: 200 }}>
                        <span className="hz-iam-avatar" aria-hidden="true">
                          {getInitials(emp.fullName)}
                        </span>
                        <div className="hz-crm-client-copy">
                          <div className="hz-crm-client-top">
                            <strong>{emp.fullName}</strong>
                            {isSelf ? (
                              <span className="hz-iam-self-tag">You</span>
                            ) : null}
                          </div>
                          <small>{emp.email}</small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <strong style={{ display: "block", fontSize: 12.5, color: "#E2E8F0" }}>
                        {emp.jobTitle || template?.label || emp.roleKey}
                      </strong>
                      <span style={{ fontSize: 11.5, color: "#7C8BB0" }}>{emp.department}</span>
                    </td>

                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <StatusBadge tone={roleBadgeTone(emp.roleKey)}>
                          {template?.label || emp.roleKey}
                        </StatusBadge>
                        {hasCustomOverrides ? (
                          <span
                            className="hz-iam-override-dot"
                            title="Has custom per-employee permission overrides"
                          >
                            +Custom
                          </span>
                        ) : null}
                      </div>
                    </td>

                    <td>
                      <div className="hz-iam-scope-cell">
                        {effectiveScope === "all" ? (
                          <Globe size={12} color="#60A5FA" />
                        ) : effectiveScope === "team" ? (
                          <Users size={12} color="#A78BFA" />
                        ) : (
                          <User size={12} color="#94A3B8" />
                        )}
                        <span>{SCOPE_METADATA[effectiveScope].short}</span>
                        {emp.scopeOverride ? (
                          <em className="hz-iam-override-tag">override</em>
                        ) : null}
                      </div>
                    </td>

                    <td>
                      <StatusBadge
                        dot
                        tone={
                          emp.status === "active"
                            ? "emerald"
                            : emp.status === "suspended"
                            ? "rose"
                            : "amber"
                        }
                      >
                        {emp.status === "invited"
                          ? "Pending Activation"
                          : emp.status === "active"
                          ? "Active"
                          : "Suspended"}
                      </StatusBadge>
                    </td>

                    <td style={{ fontSize: 12, color: "#9AA7C7", whiteSpace: "nowrap" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <Clock size={12} color="#64748B" />
                        {formatLocalTimestamp(emp.lastActiveAt)}
                      </span>
                    </td>

                    <td>
                      <div className="hz-iam-sec-cell">
                        {emp.status === "invited" ? (() => {
                          const inv = invitationsByEmployee[emp.id];
                          const delivery = describeInvitationDelivery(inv, emp.status);
                          return (
                            <>
                              <StatusBadge tone={delivery.tone} dot>
                                {delivery.label}
                              </StatusBadge>
                              {delivery.detail ? (
                                <small
                                  title={delivery.detail}
                                  style={{
                                    maxWidth: 175,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {delivery.detail}
                                </small>
                              ) : null}
                            </>
                          );
                        })() : emp.mfaEnrolled ? (
                          <>
                            <span className="hz-iam-sec-mfa">
                              <ShieldCheck size={12} /> MFA Verified
                            </span>
                            <small>Session v{emp.sessionVersion}</small>
                          </>
                        ) : (
                          <>
                            <span className="hz-iam-sec-pwd">
                              <ShieldOff size={12} /> Password Only
                            </span>
                            <small>Session v{emp.sessionVersion}</small>
                          </>
                        )}
                      </div>
                    </td>

                    <td className="hz-crm-actions-cell">
                      <div
                        className="hz-crm-row-actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {emp.status === "invited" && canEdit ? (
                          <button
                            type="button"
                            className="hz-btn hz-btn-secondary hz-btn-sm"
                            disabled={resendingId === emp.id}
                            onClick={() => onResendInvite(emp)}
                            title="Revoke previous token and resend invitation email"
                          >
                            <Mail size={12} />
                            {resendingId === emp.id ? "Sending…" : "Resend"}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="hz-crm-act-btn"
                          title="Manage permissions"
                          aria-label={`Manage permissions for ${emp.fullName}`}
                          onClick={() => onOpenPermissions(emp)}
                        >
                          <SlidersHorizontal size={13} />
                        </button>
                        {canModifyTarget ? (
                          <button
                            type="button"
                            className="hz-crm-act-btn"
                            title="Security, session revocation & suspension"
                            aria-label={`Security controls for ${emp.fullName}`}
                            onClick={() => onOpenSecurity(emp)}
                          >
                            <KeyRound size={13} />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="hz-btn hz-btn-secondary hz-btn-sm"
                          onClick={() => onSelectEmployee(emp)}
                        >
                          Inspect
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} style={{ padding: 28 }}>
                  <EmptyState
                    title="No matching employee accounts"
                    description="Adjust your filters or invite a new team member with scoped role permissions."
                    action={
                      canCreate ? (
                        <button
                          type="button"
                          className="hz-crm-new-btn"
                          onClick={onOpenInvite}
                        >
                          <UserPlus size={14} /> Invite Employee
                        </button>
                      ) : undefined
                    }
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Helpful footer when organization has a small team */}
      {totalAll === 1 && canCreate ? (
        <div className="hz-iam-single-hint">
          <span>
            Your workspace currently has 1 active account. Invite Sales, HR, Marketing, or
            Engineering team members with scoped least-privilege access.
          </span>
          <button type="button" className="hz-btn hz-btn-secondary hz-btn-sm" onClick={onOpenInvite}>
            <UserPlus size={13} /> Invite First Teammate
          </button>
        </div>
      ) : null}

      {totalFiltered > pageSize ? (
        <div className="hz-pagination">
          <span>
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalFiltered)} of{" "}
            {totalFiltered}
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              className="hz-btn hz-btn-secondary hz-btn-sm"
              disabled={page <= 1}
              onClick={() => onPageChange(Math.max(1, page - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className="hz-btn hz-btn-secondary hz-btn-sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
