"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  ArrowUpDown,
  Building2,
  Calendar,
  CheckCircle2,
  Circle,
  ExternalLink,
  Layers,
  Mail,
  RefreshCw,
  Sparkles,
  User,
} from "lucide-react";
import { EmptyState, StatusBadge } from "@/components/admin-ui/primitives";
import {
  formatLocalDateTime,
  formatRelativeAge,
  getInitials,
  getMonogramColor,
  stageTone,
  type LeadQualityStatus,
} from "@/components/crm/types";
import { CRM_STAGE_LABELS, type CrmLeadRecord } from "@/lib/crm-types";
import type { CrmTaskRecord } from "@/lib/intelligence/types";

export function CrmDataTable({
  leads,
  totalFiltered,
  page,
  totalPages,
  pageSize,
  selectedId,
  qualityMap,
  flaggedCount,
  lastSyncedAt,
  syncing,
  canUseAgent,
  onToggleSort,
  onSelectLead,
  onAskAgentLead,
  onPageChange,
  onSync,
  onOpenQualityReview,
}: {
  leads: CrmLeadRecord[];
  totalFiltered: number;
  page: number;
  totalPages: number;
  pageSize: number;
  selectedId: string | null;
  qualityMap: Map<string, LeadQualityStatus>;
  flaggedCount: number;
  lastSyncedAt: string;
  syncing: boolean;
  canUseAgent: boolean;
  onToggleSort: (col: "createdAt" | "company" | "stage") => void;
  onSelectLead: (lead: CrmLeadRecord) => void;
  onAskAgentLead: (lead: CrmLeadRecord, prompt: string) => void;
  onPageChange: (nextPage: number) => void;
  onSync: () => void;
  onOpenQualityReview: () => void;
}) {
  return (
    <section className="hz-crm-table-card" aria-label="B2B Sales Pipeline">
      <div className="hz-crm-card-head">
        <div className="hz-crm-card-title-group">
          <span className="hz-crm-card-emblem" aria-hidden="true">
            <Layers size={18} color="#818CF8" />
          </span>
          <div>
            <h2>B2B Sales Pipeline</h2>
            <p>Active opportunities, next actions, and progression across your enterprise pipeline.</p>
          </div>
        </div>

        <div className="hz-crm-card-head-meta">
          {flaggedCount > 0 ? (
            <button
              type="button"
              className="hz-crm-quality-pill"
              onClick={onOpenQualityReview}
              title="Inspect suspected test, duplicate, or incomplete CRM records safely"
            >
              <AlertTriangle size={12} />
              <span>{flaggedCount} Needs Review</span>
            </button>
          ) : null}

          <span className="hz-cc-count-pill">
            {totalFiltered} Opportunit{totalFiltered === 1 ? "y" : "ies"}
          </span>

          <button
            type="button"
            className="hz-cc-updated-btn"
            disabled={syncing}
            onClick={onSync}
            title="Sync latest CRM records from Supabase"
          >
            <RefreshCw size={11} className={syncing ? "hz-spin" : ""} />
            <span>{syncing ? "Syncing…" : `Updated ${formatRelativeAge(lastSyncedAt)}`}</span>
          </button>
        </div>
      </div>

      <div className="hz-crm-table-scroll">
        <table className="hz-crm-table">
          <thead>
            <tr>
              <th>Ref ID</th>
              <th>
                <button
                  type="button"
                  className="hz-sort-btn"
                  onClick={() => onToggleSort("company")}
                >
                  Client / Company <ArrowUpDown size={11} />
                </button>
              </th>
              <th>Owner / Track</th>
              <th>
                <button
                  type="button"
                  className="hz-sort-btn"
                  onClick={() => onToggleSort("createdAt")}
                >
                  Appointment Window <ArrowUpDown size={11} />
                </button>
              </th>
              <th>
                <button
                  type="button"
                  className="hz-sort-btn"
                  onClick={() => onToggleSort("stage")}
                >
                  Stage <ArrowUpDown size={11} />
                </button>
              </th>
              <th>Stated Budget</th>
              <th style={{ textAlign: "end" }}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {leads.length > 0 ? (
              leads.map((lead) => {
                const quality = qualityMap.get(lead.id);
                const { dateLabel, timeLabel } = formatLocalDateTime(
                  lead.scheduledSlotIso || lead.nextFollowUpAt
                );
                const ownerDisplay =
                  lead.ownerName ||
                  lead.ownerEmail ||
                  (lead.ownerId ? "Assigned Representative" : "Unassigned");

                return (
                  <tr
                    key={lead.id}
                    className={selectedId === lead.id ? "is-selected" : ""}
                    tabIndex={0}
                    onClick={() => onSelectLead(lead)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectLead(lead);
                      }
                    }}
                  >
                    <td className="hz-crm-ref-cell">
                      <strong>{lead.referenceId}</strong>
                      <span>{lead.leadType === "discovery_call" ? "Discovery" : "Proposal"}</span>
                    </td>

                    <td>
                      <div className="hz-crm-client-cell">
                        <span
                          className="hz-crm-monogram"
                          style={{ background: getMonogramColor(lead.company || lead.fullName) }}
                          aria-hidden="true"
                        >
                          {getInitials(lead.company || lead.fullName)}
                        </span>
                        <div className="hz-crm-client-copy">
                          <div className="hz-crm-client-top">
                            <strong>{lead.company || lead.fullName}</strong>
                            {quality && quality.kind !== "genuine" ? (
                              <span
                                className={`hz-crm-flag-tag is-${quality.kind}`}
                                title={quality.reason}
                              >
                                {quality.label}
                              </span>
                            ) : null}
                          </div>
                          <small>
                            {lead.fullName} · {lead.email}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="hz-crm-owner-cell">
                        <span className="hz-crm-owner-avatar" aria-hidden="true">
                          {getInitials(ownerDisplay)}
                        </span>
                        <div className="hz-crm-owner-copy">
                          <strong>{ownerDisplay}</strong>
                          <small>{lead.serviceTrack}</small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="hz-crm-date-cell">
                        <Calendar size={13} color="#7C8BB0" />
                        <div>
                          <strong>
                            {lead.scheduledSlotIso
                              ? dateLabel
                              : lead.nextFollowUpAt
                              ? `Follow-up ${dateLabel}`
                              : "Awaiting slot"}
                          </strong>
                          <small>
                            {lead.scheduledSlotIso
                              ? timeLabel
                              : lead.preferredWindow || `Updated ${formatRelativeAge(lead.updatedAt)}`}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <StatusBadge tone={stageTone(lead.stage)} dot>
                        {CRM_STAGE_LABELS[lead.stage].en}
                      </StatusBadge>
                    </td>

                    <td className="hz-crm-budget-cell">
                      {lead.budgetRange ? (
                        <strong>{lead.budgetRange}</strong>
                      ) : (
                        <span className="hz-crm-muted">Not stated</span>
                      )}
                    </td>

                    <td className="hz-crm-actions-cell">
                      <div
                        className="hz-crm-row-actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {lead.scheduledSlotIso ? (
                          <a
                            href={`/api/bookings/ics?ref=${encodeURIComponent(lead.referenceId)}`}
                            className="hz-crm-act-btn"
                            title="Download calendar invite (.ics)"
                            aria-label={`Download calendar invite for ${lead.company || lead.fullName}`}
                          >
                            <Calendar size={13} />
                          </a>
                        ) : null}
                        {canUseAgent ? (
                          <button
                            type="button"
                            className="hz-crm-act-btn"
                            title="Ask HIRZEXA about this client"
                            aria-label={`Ask HIRZEXA about ${lead.company || lead.fullName}`}
                            onClick={() =>
                              onAskAgentLead(
                                lead,
                                `Summarize ${lead.referenceId} (${lead.company || lead.fullName}) and suggest the best next action.`
                              )
                            }
                          >
                            <Sparkles size={13} />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="hz-crm-act-btn"
                          title="Open client workspace"
                          aria-label={`Open details for ${lead.company || lead.fullName}`}
                          onClick={() => onSelectLead(lead)}
                        >
                          <ExternalLink size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} style={{ padding: 28 }}>
                  <EmptyState
                    title="No matching CRM opportunities"
                    description="Adjust your search or filters, or add a new opportunity to populate this view."
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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

export function CrmCompaniesView({
  leads,
  onSelectLead,
}: {
  leads: CrmLeadRecord[];
  onSelectLead: (lead: CrmLeadRecord) => void;
}) {
  const companies = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        leads: CrmLeadRecord[];
        latest: CrmLeadRecord;
        primaryContact: string;
        email: string;
      }
    >();
    for (const lead of leads) {
      const displayName = lead.company?.trim() || lead.fullName;
      const key = displayName.toLowerCase();
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          name: displayName,
          leads: [lead],
          latest: lead,
          primaryContact: lead.fullName,
          email: lead.email,
        });
      } else {
        existing.leads.push(lead);
        if (new Date(lead.updatedAt).getTime() > new Date(existing.latest.updatedAt).getTime()) {
          existing.latest = lead;
        }
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.latest.updatedAt).getTime() - new Date(a.latest.updatedAt).getTime()
    );
  }, [leads]);

  return (
    <section className="hz-crm-table-card" aria-label="CRM Companies">
      <div className="hz-crm-card-head">
        <div className="hz-crm-card-title-group">
          <span className="hz-crm-card-emblem" aria-hidden="true">
            <Building2 size={17} color="#60A5FA" />
          </span>
          <div>
            <h2>Client Companies</h2>
            <p>Account rollups derived directly from authorized CRM lead records.</p>
          </div>
        </div>
        <span className="hz-cc-count-pill">{companies.length} Companies</span>
      </div>

      <div className="hz-crm-table-scroll">
        <table className="hz-crm-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Primary Contact</th>
              <th>Opportunities</th>
              <th>Latest Stage</th>
              <th>Last Activity</th>
              <th style={{ textAlign: "end" }}>Open</th>
            </tr>
          </thead>
          <tbody>
            {companies.length > 0 ? (
              companies.map((c) => (
                <tr key={c.name} onClick={() => onSelectLead(c.latest)}>
                  <td>
                    <div className="hz-crm-client-cell">
                      <span
                        className="hz-crm-monogram"
                        style={{ background: getMonogramColor(c.name) }}
                      >
                        {getInitials(c.name)}
                      </span>
                      <div className="hz-crm-client-copy">
                        <strong>{c.name}</strong>
                        <small>{c.latest.serviceTrack}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <strong style={{ fontSize: 12.5, color: "#F8FAFC" }}>{c.primaryContact}</strong>
                    <div style={{ fontSize: 11.5, color: "#8C9AB8" }}>{c.email}</div>
                  </td>
                  <td>
                    <StatusBadge tone="blue">{c.leads.length}</StatusBadge>
                  </td>
                  <td>
                    <StatusBadge tone={stageTone(c.latest.stage)} dot>
                      {CRM_STAGE_LABELS[c.latest.stage].en}
                    </StatusBadge>
                  </td>
                  <td style={{ fontSize: 12, color: "#8C9AB8" }}>
                    {formatRelativeAge(c.latest.updatedAt)}
                  </td>
                  <td style={{ textAlign: "end" }}>
                    <button
                      type="button"
                      className="hz-btn hz-btn-secondary hz-btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectLead(c.latest);
                      }}
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{ padding: 24 }}>
                  <EmptyState
                    title="No companies found"
                    description="Companies appear automatically from inbound bookings and created opportunities."
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function CrmContactsView({
  leads,
  onSelectLead,
}: {
  leads: CrmLeadRecord[];
  onSelectLead: (lead: CrmLeadRecord) => void;
}) {
  const contacts = useMemo(() => {
    const map = new Map<string, CrmLeadRecord>();
    for (const lead of leads) {
      const key = lead.email.trim().toLowerCase();
      const prev = map.get(key);
      if (!prev || new Date(lead.updatedAt).getTime() > new Date(prev.updatedAt).getTime()) {
        map.set(key, lead);
      }
    }
    return Array.from(map.values());
  }, [leads]);

  return (
    <section className="hz-crm-table-card" aria-label="CRM Contacts">
      <div className="hz-crm-card-head">
        <div className="hz-crm-card-title-group">
          <span className="hz-crm-card-emblem" aria-hidden="true">
            <User size={17} color="#A78BFA" />
          </span>
          <div>
            <h2>Client Contacts</h2>
            <p>Primary stakeholders across active discovery calls and proposal discussions.</p>
          </div>
        </div>
        <span className="hz-cc-count-pill">{contacts.length} Contacts</span>
      </div>

      <div className="hz-crm-table-scroll">
        <table className="hz-crm-table">
          <thead>
            <tr>
              <th>Contact</th>
              <th>Company &amp; Role</th>
              <th>Email &amp; Phone</th>
              <th>Stage</th>
              <th style={{ textAlign: "end" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {contacts.length > 0 ? (
              contacts.map((lead) => (
                <tr key={lead.id} onClick={() => onSelectLead(lead)}>
                  <td>
                    <div className="hz-crm-owner-cell">
                      <span className="hz-crm-owner-avatar">{getInitials(lead.fullName)}</span>
                      <strong style={{ fontSize: 13, color: "#F8FAFC" }}>{lead.fullName}</strong>
                    </div>
                  </td>
                  <td>
                    <strong style={{ fontSize: 12.5, color: "#F8FAFC" }}>
                      {lead.company || "Independent"}
                    </strong>
                    <div style={{ fontSize: 11.5, color: "#8C9AB8" }}>
                      {lead.roleTitle || lead.serviceTrack}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: 12.5, color: "#BFDBFE" }}>{lead.email}</div>
                    {lead.phone ? (
                      <div style={{ fontSize: 11.5, color: "#8C9AB8" }}>{lead.phone}</div>
                    ) : null}
                  </td>
                  <td>
                    <StatusBadge tone={stageTone(lead.stage)} dot>
                      {CRM_STAGE_LABELS[lead.stage].en}
                    </StatusBadge>
                  </td>
                  <td style={{ textAlign: "end" }}>
                    <a
                      href={`mailto:${lead.email}`}
                      className="hz-crm-act-btn"
                      onClick={(e) => e.stopPropagation()}
                      title={`Email ${lead.fullName}`}
                    >
                      <Mail size={13} />
                    </a>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={{ padding: 24 }}>
                  <EmptyState
                    title="No contacts recorded"
                    description="Contacts are populated automatically as leads enter the CRM."
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function CrmTasksView({
  tasks,
  leads,
  onToggleTask,
  onSelectLead,
}: {
  tasks: CrmTaskRecord[];
  leads: CrmLeadRecord[];
  onToggleTask: (task: CrmTaskRecord) => void;
  onSelectLead: (lead: CrmLeadRecord) => void;
}) {
  return (
    <section className="hz-crm-table-card" aria-label="CRM Follow-Up Tasks">
      <div className="hz-crm-card-head">
        <div className="hz-crm-card-title-group">
          <span className="hz-crm-card-emblem" aria-hidden="true">
            <CheckCircle2 size={17} color="#34D399" />
          </span>
          <div>
            <h2>Sales Follow-Up Tasks</h2>
            <p>Operational action items linked to clients and discovery opportunities.</p>
          </div>
        </div>
        <span className="hz-cc-count-pill">
          {tasks.filter((t) => t.status !== "completed").length} Open
        </span>
      </div>

      <div style={{ padding: "0 16px 16px" }}>
        {tasks.length > 0 ? (
          <div className="hz-row-list">
            {tasks.map((task) => {
              const linked = task.entityId
                ? leads.find((l) => l.id === task.entityId || l.referenceId === task.entityId)
                : undefined;
              const overdue =
                task.status !== "completed" &&
                Boolean(task.dueAt) &&
                new Date(task.dueAt!).getTime() < Date.now();

              return (
                <div key={task.id} className="hz-list-row">
                  <button
                    type="button"
                    onClick={() => onToggleTask(task)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 10,
                      border: 0,
                      background: "transparent",
                      color: "inherit",
                      cursor: "pointer",
                      textAlign: "start",
                      padding: 0,
                    }}
                  >
                    {task.status === "completed" ? (
                      <CheckCircle2 size={16} color="#10B981" />
                    ) : (
                      <Circle size={16} color={overdue ? "#F43F5E" : "#64748B"} />
                    )}
                    <div>
                      <strong
                        style={
                          task.status === "completed"
                            ? { textDecoration: "line-through", opacity: 0.55 }
                            : undefined
                        }
                      >
                        {task.title}
                      </strong>
                      <small>
                        {task.entityLabel ? `${task.entityLabel} · ` : ""}
                        {task.assignedToEmail ? `${task.assignedToEmail} · ` : ""}
                        {task.dueAt
                          ? `Due ${formatLocalDateTime(task.dueAt, { includeTime: false }).dateLabel}`
                          : "No due date"}
                      </small>
                    </div>
                  </button>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {linked ? (
                      <button
                        type="button"
                        className="hz-btn hz-btn-secondary hz-btn-sm"
                        onClick={() => onSelectLead(linked)}
                      >
                        Open Client
                      </button>
                    ) : null}
                    <StatusBadge
                      tone={
                        overdue
                          ? "rose"
                          : task.status === "completed"
                          ? "emerald"
                          : "amber"
                      }
                    >
                      {overdue ? "Overdue" : task.status}
                    </StatusBadge>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No sales tasks queued"
            description="Open any client in the pipeline to create a linked follow-up task."
          />
        )}
      </div>
    </section>
  );
}
