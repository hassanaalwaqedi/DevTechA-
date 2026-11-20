"use client";

import { useState } from "react";
import { Check, Globe, Lock, Shield, User, Users } from "lucide-react";
import { Modal, StatusBadge } from "@/components/admin-ui/primitives";
import {
  ACTION_LABELS,
  MODULE_LABELS,
  roleBadgeTone,
  SCOPE_METADATA,
} from "@/components/team/types";
import {
  ACCESS_SCOPES,
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  type RoleKey,
  type RoleTemplate,
} from "@/lib/rbac";

export function RoleMatrixModal({
  open,
  roles,
  onClose,
}: {
  open: boolean;
  roles: RoleTemplate[];
  onClose: () => void;
}) {
  const [selectedRoleKey, setSelectedRoleKey] = useState<RoleKey>("super_admin");
  const activeRole = roles.find((r) => r.key === selectedRoleKey) || roles[0];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Role Templates & Permission Matrix"
      subtitle="9 built-in organizational roles enforced server-side across PostgreSQL RLS, API routes, and AI Agent tools."
      width={1020}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Read-only transparency notice */}
        <div className="hz-iam-readonly-note">
          <Lock size={14} color="#93C5FD" />
          <span>
            Built-in role templates are code-governed in <code>lib/rbac.ts</code> for auditability.
            To customize individual employee access, open any employee in the directory and edit
            their <strong>Permissions</strong> tab.
          </span>
        </div>

        {/* Interactive Role Template Selector Pills */}
        <div className="hz-iam-role-pills" role="tablist" aria-label="Role templates">
          {roles.map((r) => (
            <button
              key={r.key}
              type="button"
              role="tab"
              aria-selected={activeRole.key === r.key}
              className={`hz-iam-role-pill ${activeRole.key === r.key ? "is-active" : ""}`}
              onClick={() => setSelectedRoleKey(r.key)}
            >
              <span>{r.label}</span>
              <small>{SCOPE_METADATA[r.defaultScope].short}</small>
            </button>
          ))}
        </div>

        {/* Selected Role Summary + Full Module x Action Matrix */}
        <div className="hz-iam-preview-box">
          <div className="hz-iam-preview-head">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Shield size={15} color="#818CF8" />
              <strong>{activeRole.label}</strong>
              <code>{activeRole.key}</code>
            </div>
            <StatusBadge tone={roleBadgeTone(activeRole.key)}>
              Default Scope: {SCOPE_METADATA[activeRole.defaultScope].label}
            </StatusBadge>
          </div>
          <p>{activeRole.description}</p>
        </div>

        <div className="hz-table-wrap">
          <table className="hz-table">
            <thead>
              <tr>
                <th>Module</th>
                {PERMISSION_ACTIONS.map((act) => (
                  <th key={act} style={{ textAlign: "center" }}>
                    {ACTION_LABELS[act]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_MODULES.map((mod) => {
                const acts = activeRole.permissions[mod] || [];
                const hasManage = acts.includes("manage");
                return (
                  <tr key={mod}>
                    <td>
                      <strong style={{ fontSize: 12.5 }}>{MODULE_LABELS[mod]}</strong>
                    </td>
                    {PERMISSION_ACTIONS.map((act) => {
                      const allowed = hasManage || acts.includes(act);
                      return (
                        <td key={act} style={{ textAlign: "center" }}>
                          {allowed ? (
                            <span className="hz-iam-matrix-yes" aria-label="Permitted">
                              <Check size={12} />
                            </span>
                          ) : (
                            <span style={{ color: "#475569" }}>—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Record-Level Access Scopes Reference */}
        <div>
          <p className="hz-eyebrow" style={{ marginBottom: 8 }}>
            Record-Level Access Scopes
          </p>
          <div className="hz-iam-scope-cards">
            {ACCESS_SCOPES.map((scope) => (
              <div key={scope} className="hz-iam-scope-card">
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                  {scope === "all" ? (
                    <Globe size={13} color="#60A5FA" />
                  ) : scope === "team" ? (
                    <Users size={13} color="#A78BFA" />
                  ) : (
                    <User size={13} color="#94A3B8" />
                  )}
                  <strong>{SCOPE_METADATA[scope].label}</strong>
                </div>
                <p>{SCOPE_METADATA[scope].description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
