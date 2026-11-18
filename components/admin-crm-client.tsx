"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CRM_STAGE_LABELS,
  CRM_STAGES,
  type CrmLeadRecord,
  type CrmStage,
} from "@/lib/crm-types";

export function AdminCrmClient({ initialLeads }: { initialLeads: CrmLeadRecord[] }) {
  const [leads, setLeads] = useState<CrmLeadRecord[]>(initialLeads);
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CrmLeadRecord | null>(
    initialLeads[0] || null
  );
  const [activityInput, setActivityInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadLeads = useCallback(async () => {
    const params = new URLSearchParams();
    if (stageFilter !== "all") params.set("stage", stageFilter);
    if (search.trim()) params.set("query", search.trim());
    try {
      const response = await fetch(
        `/api/admin/crm${params.size ? `?${params.toString()}` : ""}`,
        { cache: "no-store" }
      );
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Unable to load CRM pipeline.");
        return;
      }
      setLeads(data.leads || []);
    } catch {
      setError("Unable to reach CRM service.");
    }
  }, [stageFilter, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadLeads();
    }, 220);
    return () => window.clearTimeout(timer);
  }, [loadLeads]);

  async function patchLead(
    lead: CrmLeadRecord,
    patch: {
      stage?: CrmStage;
      notes?: string;
      nextFollowUpAt?: string | null;
      meetingLink?: string;
      activityNote?: string;
      sendReminder?: boolean;
    }
  ) {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/crm/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Unable to update lead.");
        return;
      }
      const updated = data.lead as CrmLeadRecord;
      setSelected(updated);
      setLeads((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      if (patch.sendReminder) {
        setNotice(`Reminder dispatched and logged for ${updated.email}.`);
      } else if (patch.activityNote) {
        setActivityInput("");
        setNotice("Follow-up activity logged.");
      } else {
        setNotice("Lead record updated.");
      }
    } catch {
      setError("Network error while updating CRM record.");
    } finally {
      setSaving(false);
    }
  }

  const stageCounts = CRM_STAGES.reduce<Record<CrmStage, number>>(
    (acc, stage) => {
      acc[stage] = leads.filter((item) => item.stage === stage).length;
      return acc;
    },
    {
      new_lead: 0,
      meeting_booked: 0,
      discovery_completed: 0,
      proposal_sent: 0,
      negotiation: 0,
      won: 0,
      lost: 0,
    }
  );

  return (
    <>
      <div className="metric-grid" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        <div className="metric">
          <span>New Leads &amp; Booked Calls</span>
          <strong>{stageCounts.new_lead + stageCounts.meeting_booked}</strong>
        </div>
        <div className="metric">
          <span>Discovery Completed</span>
          <strong>{stageCounts.discovery_completed}</strong>
        </div>
        <div className="metric">
          <span>Proposals &amp; Negotiation</span>
          <strong>{stageCounts.proposal_sent + stageCounts.negotiation}</strong>
        </div>
        <div className="metric">
          <span>Won Opportunities</span>
          <strong>{stageCounts.won}</strong>
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="admin-filter-row" style={{ gap: 10, flexWrap: "wrap" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, contact, email, or reference ID…"
            aria-label="Search sales leads"
            style={{ minWidth: 260 }}
          />
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            aria-label="Filter pipeline stage"
          >
            <option value="all">All Pipeline Stages ({leads.length})</option>
            {CRM_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {CRM_STAGE_LABELS[stage].en} ({stageCounts[stage]})
              </option>
            ))}
          </select>
        </div>
        <span style={{ color: "#9ba397", fontSize: 12 }}>
          {leads.length} {leads.length === 1 ? "opportunity" : "opportunities"}
        </span>
      </div>

      {error ? <p className="admin-error">{error}</p> : null}
      {notice ? <p className="admin-notice">{notice}</p> : null}

      <div className="admin-panel">
        <h2>B2B Sales Pipeline</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Reference &amp; Type</th>
              <th>Client &amp; Company</th>
              <th>Service Track</th>
              <th>Appointment / Window</th>
              <th>Stage</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {leads.length > 0 ? (
              leads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <strong>{lead.referenceId}</strong>
                    <br />
                    <span style={{ color: "#9ba397", fontSize: 11 }}>
                      {lead.leadType === "discovery_call"
                        ? `Discovery (${lead.durationMinutes}m)`
                        : "Proposal Request"}
                    </span>
                  </td>
                  <td>
                    <strong>{lead.company || lead.fullName}</strong>
                    <br />
                    <span style={{ color: "#9ba397", fontSize: 11 }}>
                      {lead.fullName} · {lead.email}
                    </span>
                  </td>
                  <td>
                    <span>{lead.serviceTrack}</span>
                    {lead.budgetRange ? (
                      <>
                        <br />
                        <small style={{ color: "#dbff53" }}>{lead.budgetRange}</small>
                      </>
                    ) : null}
                  </td>
                  <td>
                    {lead.scheduledSlotIso ? (
                      <>
                        <strong>
                          {new Date(lead.scheduledSlotIso).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </strong>
                        <br />
                        <span style={{ color: "#9ba397", fontSize: 11 }}>
                          {lead.timezone}
                        </span>
                      </>
                    ) : (
                      <span style={{ color: "#9ba397", fontSize: 12 }}>
                        {lead.preferredWindow || "Async / Callback"}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="status">{CRM_STAGE_LABELS[lead.stage].en}</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="button-small"
                      onClick={() => setSelected(lead)}
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{ color: "#9ba397", padding: 28 }}>
                  No sales leads match this filter yet. Booked discovery calls and proposal requests appear here automatically.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected ? (
        <div className="admin-panel" style={{ marginTop: 18 }}>
          <div className="admin-toolbar">
            <div>
              <span className="eyebrow">
                {selected.referenceId} · {CRM_STAGE_LABELS[selected.stage].en}
              </span>
              <h2 style={{ margin: "10px 0 4px" }}>
                {selected.company
                  ? `${selected.company} — ${selected.fullName}`
                  : selected.fullName}
              </h2>
              <p style={{ margin: 0, color: "#9ba397", fontSize: 13 }}>
                {selected.email}
                {selected.phone ? ` · ${selected.phone}` : ""}
                {selected.roleTitle ? ` · ${selected.roleTitle}` : ""}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {selected.scheduledSlotIso ? (
                <a
                  href={`/api/bookings/ics?ref=${encodeURIComponent(selected.referenceId)}`}
                  className="button-small"
                  style={{ textDecoration: "none" }}
                >
                  Download .ics
                </a>
              ) : null}
              <button
                type="button"
                className="button-small"
                disabled={saving}
                onClick={() => patchLead(selected, { sendReminder: true })}
              >
                {selected.reminder24hSent ? "Resend Reminder" : "Send Reminder Email"}
              </button>
              <button
                type="button"
                className="button-small"
                onClick={() => setSelected(null)}
              >
                Close
              </button>
            </div>
          </div>

          <div className="admin-detail-grid" style={{ marginBottom: 18 }}>
            <div>
              <span>Pipeline Stage</span>
              <select
                value={selected.stage}
                disabled={saving}
                onChange={(e) =>
                  patchLead(selected, { stage: e.target.value as CrmStage })
                }
              >
                {CRM_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {CRM_STAGE_LABELS[stage].en}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span>Engineering Track</span>
              <strong>{selected.serviceTrack}</strong>
            </div>
            <div>
              <span>Consultation Slot &amp; Timezone</span>
              <strong>
                {selected.scheduledSlotIso
                  ? `${new Date(selected.scheduledSlotIso).toUTCString()} (${selected.timezone} · ${selected.durationMinutes}m)`
                  : selected.preferredWindow || "Priority callback / Proposal review"}
              </strong>
            </div>
            <div>
              <span>Budget &amp; Target Timeline</span>
              <strong>
                {selected.budgetRange || "Not specified"} ·{" "}
                {selected.timeline || "Flexible"}
              </strong>
            </div>
            <div>
              <span>Privacy Consent Record</span>
              <strong>
                {selected.consent ? "Verified Consent" : "No"} ·{" "}
                {new Date(selected.consentTimestamp).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </strong>
            </div>
            <div>
              <span>Next Follow-Up Date</span>
              <input
                type="date"
                defaultValue={
                  selected.nextFollowUpAt ? selected.nextFollowUpAt.slice(0, 10) : ""
                }
                onBlur={(e) =>
                  patchLead(selected, {
                    nextFollowUpAt: e.target.value
                      ? new Date(`${e.target.value}T12:00:00Z`).toISOString()
                      : null,
                  })
                }
              />
            </div>
          </div>

          <div className="field" style={{ marginBottom: 16 }}>
            <label>Meeting &amp; Coordination Link</label>
            <input
              defaultValue={selected.meetingLink || ""}
              placeholder="https://meet.google.com/... or Cal.com link"
              onBlur={(e) =>
                patchLead(selected, { meetingLink: e.target.value.trim() })
              }
            />
          </div>

          <div
            style={{
              padding: 16,
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "#121512",
              marginBottom: 18,
            }}
          >
            <span
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 700,
                color: "#aeb5a9",
                marginBottom: 6,
              }}
            >
              CLIENT CHALLENGE &amp; PROJECT SCOPE
            </span>
            <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
              {selected.projectSummary}
            </p>
            {selected.currentStack ? (
              <p style={{ margin: "10px 0 0", fontSize: 12, color: "#9ba397" }}>
                <strong>Current Stack / Context:</strong> {selected.currentStack}
              </p>
            ) : null}
          </div>

          <div className="field-grid">
            <div className="field">
              <label>Internal CRM Notes</label>
              <textarea
                defaultValue={selected.notes}
                placeholder="Record discovery findings, architecture decisions, pricing notes, or stakeholder requirements…"
                onBlur={(e) => patchLead(selected, { notes: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Log Follow-Up Activity</label>
              <div style={{ display: "grid", gap: 8 }}>
                <input
                  value={activityInput}
                  onChange={(e) => setActivityInput(e.target.value)}
                  placeholder="e.g. Sent technical architecture proposal v1 via email"
                />
                <button
                  type="button"
                  className="button-dark"
                  disabled={saving || !activityInput.trim()}
                  onClick={() =>
                    patchLead(selected, { activityNote: activityInput.trim() })
                  }
                >
                  Add Activity Entry
                </button>
              </div>

              <div
                style={{
                  marginTop: 14,
                  maxHeight: 180,
                  overflowY: "auto",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  padding: 12,
                  background: "#121512",
                }}
              >
                <span
                  style={{
                    display: "block",
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    color: "#9ba397",
                    marginBottom: 8,
                  }}
                >
                  LEAD HISTORY &amp; ACTIVITY LOG ({selected.activities.length})
                </span>
                {selected.activities.map((act) => (
                  <div
                    key={act.id}
                    style={{
                      padding: "7px 0",
                      borderTop: "1px solid rgba(255,255,255,0.06)",
                      fontSize: 12,
                    }}
                  >
                    <strong style={{ color: "#dbff53" }}>{act.summary}</strong>
                    <div style={{ color: "#8f978a", fontSize: 11, marginTop: 2 }}>
                      {act.actor} ·{" "}
                      {new Date(act.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
