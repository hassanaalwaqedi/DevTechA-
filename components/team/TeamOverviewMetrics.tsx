"use client";

import { KeyRound, Layers, UserCheck, UserX } from "lucide-react";

export function TeamOverviewMetrics({
  activeCount,
  invitedCount,
  suspendedCount,
  roleCount,
  activeStatusFilter,
  onFilterStatus,
  onOpenRoles,
}: {
  activeCount: number;
  invitedCount: number;
  suspendedCount: number;
  roleCount: number;
  activeStatusFilter: string;
  onFilterStatus: (status: string) => void;
  onOpenRoles: () => void;
}) {
  return (
    <section className="hz-iam-kpi-grid" aria-label="Organization Access Overview">
      <button
        type="button"
        className={`hz-iam-kpi-card ${activeStatusFilter === "active" ? "is-selected" : ""}`}
        onClick={() => onFilterStatus(activeStatusFilter === "active" ? "all" : "active")}
      >
        <div className="hz-iam-kpi-head">
          <UserCheck size={14} color="#34D399" />
          <span>Active Employees</span>
        </div>
        <div className="hz-iam-kpi-val">
          <strong>{activeCount}</strong>
          <span>Authorized workspace access</span>
        </div>
      </button>

      <button
        type="button"
        className={`hz-iam-kpi-card ${activeStatusFilter === "invited" ? "is-selected" : ""}`}
        onClick={() => onFilterStatus(activeStatusFilter === "invited" ? "all" : "invited")}
      >
        <div className="hz-iam-kpi-head">
          <KeyRound size={14} color="#FBBF24" />
          <span>Pending Invitations</span>
        </div>
        <div className="hz-iam-kpi-val">
          <strong>{invitedCount}</strong>
          <span>48h single-use hashed links</span>
        </div>
      </button>

      <button
        type="button"
        className={`hz-iam-kpi-card ${activeStatusFilter === "suspended" ? "is-selected" : ""}`}
        onClick={() => onFilterStatus(activeStatusFilter === "suspended" ? "all" : "suspended")}
      >
        <div className="hz-iam-kpi-head">
          <UserX size={14} color={suspendedCount > 0 ? "#FB7185" : "#7C8BB0"} />
          <span>Suspended Accounts</span>
        </div>
        <div className="hz-iam-kpi-val">
          <strong>{suspendedCount}</strong>
          <span>Blocked at API &amp; Postgres RLS</span>
        </div>
      </button>

      <button type="button" className="hz-iam-kpi-card" onClick={onOpenRoles}>
        <div className="hz-iam-kpi-head">
          <Layers size={14} color="#818CF8" />
          <span>Available Role Templates</span>
        </div>
        <div className="hz-iam-kpi-val">
          <strong>{roleCount}</strong>
          <span>Server-enforced RBAC roles</span>
        </div>
      </button>
    </section>
  );
}
