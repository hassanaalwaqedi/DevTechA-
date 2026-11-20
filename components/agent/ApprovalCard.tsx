"use client";

import { Check, ShieldAlert, X } from "lucide-react";
import { StatusBadge } from "@/components/admin-ui/primitives";
import type { AgentPendingAction } from "@/lib/intelligence/types";

export function ApprovalCard({
  action,
  busy,
  onDecision,
}: {
  action: AgentPendingAction;
  busy: boolean;
  onDecision: (action: AgentPendingAction, decision: "approve" | "reject") => void;
}) {
  const statusTone =
    action.status === "executed"
      ? "emerald"
      : action.status === "rejected"
      ? "neutral"
      : "amber";

  const statusLabel =
    action.status === "pending"
      ? "Pending approval"
      : action.status === "executed"
      ? "Approved & executed"
      : action.status === "rejected"
      ? "Cancelled"
      : action.status;

  return (
    <div className="hz-ag-approval" dir="ltr">
      <div className="hz-ag-approval-head">
        <div className="hz-ag-approval-title">
          <ShieldAlert size={15} color="#FBBF24" />
          <strong>{action.title}</strong>
        </div>
        <StatusBadge tone={statusTone}>{statusLabel}</StatusBadge>
      </div>

      <p className="hz-ag-approval-summary">{action.summary}</p>

      {action.preview && Object.keys(action.preview).length > 0 ? (
        <dl className="hz-ag-approval-kv">
          {Object.entries(action.preview).map(([key, value]) => (
            <div key={key}>
              <dt>{key.replace(/([A-Z])/g, " $1").replace(/_/g, " ")}</dt>
              <dd>{String(value ?? "—")}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {action.status === "pending" ? (
        <div className="hz-ag-approval-actions">
          <button
            type="button"
            className="hz-ag-approve-btn"
            disabled={busy}
            onClick={() => onDecision(action, "approve")}
          >
            <Check size={13} />
            <span>{busy ? "Executing…" : "Confirm & Execute"}</span>
          </button>
          <button
            type="button"
            className="hz-btn hz-btn-secondary hz-btn-sm"
            disabled={busy}
            onClick={() => onDecision(action, "reject")}
          >
            <X size={13} />
            <span>Cancel</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
