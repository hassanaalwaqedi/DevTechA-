"use client";

import { useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import {
  EmptyState,
  PageHeader,
  StatusBadge,
} from "@/components/admin-ui/primitives";
import type { AuditLogEntry } from "@/lib/intelligence/types";

export function AdminAuditClient({ initialLogs }: { initialLogs: AuditLogEntry[] }) {
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [outcomeFilter, setOutcomeFilter] = useState("all");

  const modules = useMemo(
    () => Array.from(new Set(initialLogs.map((l) => l.module))).sort(),
    [initialLogs]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialLogs.filter((entry) => {
      if (moduleFilter !== "all" && entry.module !== moduleFilter) return false;
      if (outcomeFilter !== "all" && entry.outcome !== outcomeFilter) return false;
      if (q) {
        const hay = `${entry.actorEmail} ${entry.actorRole} ${entry.module} ${entry.action} ${entry.summary}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [initialLogs, search, moduleFilter, outcomeFilter]);

  return (
    <>
      <PageHeader
        eyebrow="Security & Governance · Append-Only Trail"
        title="System Audit Logs"
        description="Immutable PostgreSQL record of authentication events, RBAC denials, employee permission changes, CRM updates, and AI Agent tool executions."
      />

      <div className="hz-toolbar">
        <div className="hz-filter-group">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search actor, action, or summary…"
            aria-label="Search audit logs"
            style={{ minWidth: 250 }}
          />
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            aria-label="Filter by module"
          >
            <option value="all">All modules</option>
            {modules.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value)}
            aria-label="Filter by outcome"
          >
            <option value="all">All outcomes</option>
            <option value="allowed">Allowed</option>
            <option value="denied">Denied</option>
            <option value="pending_confirmation">Pending confirmation</option>
            <option value="error">Error</option>
          </select>
        </div>
        <span style={{ fontSize: 12, color: "var(--hz-text-muted)" }}>
          {filtered.length} event{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="hz-table-wrap">
        <table className="hz-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Actor</th>
              <th>Module / Action</th>
              <th>Outcome</th>
              <th>Summary</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((entry) => (
                <tr key={entry.id}>
                  <td style={{ whiteSpace: "nowrap", fontSize: 12, color: "var(--hz-text-secondary)" }}>
                    {new Date(entry.createdAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td>
                    <strong style={{ color: "var(--hz-text-strong)" }}>{entry.actorEmail}</strong>
                    <div style={{ fontSize: 11, color: "var(--hz-text-muted)" }}>
                      {entry.actorRole}
                    </div>
                  </td>
                  <td>
                    <code style={{ fontSize: 12, color: "#93C5FD" }}>
                      {entry.module}:{entry.action}
                    </code>
                  </td>
                  <td>
                    <StatusBadge
                      dot
                      tone={
                        entry.outcome === "denied" || entry.outcome === "error"
                          ? "rose"
                          : entry.outcome === "pending_confirmation"
                          ? "amber"
                          : "emerald"
                      }
                    >
                      {entry.outcome.replace(/_/g, " ")}
                    </StatusBadge>
                  </td>
                  <td style={{ fontSize: 12.5 }}>{entry.summary}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={{ padding: 24 }}>
                  <EmptyState
                    icon={<ShieldCheck size={18} />}
                    title="No matching audit entries"
                    description="Authentication events, permission changes, and Agent tool calls appear here automatically."
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
