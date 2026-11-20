"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Circle,
  Download,
  Mail,
  Plus,
  Send,
  Sparkles,
  UserCheck,
} from "lucide-react";
import {
  EmptyState,
  Modal,
  SlideOver,
  StatusBadge,
} from "@/components/admin-ui/primitives";
import {
  formatLocalDateTime,
  stageTone,
  type LeadQualityStatus,
  type OwnerOption,
} from "@/components/crm/types";
import {
  B2B_SERVICE_TRACKS,
  canTransitionStage,
  CRM_STAGE_LABELS,
  CRM_STAGES,
  type CrmLeadRecord,
  type CrmStage,
} from "@/lib/crm-types";
import type { CrmTaskRecord } from "@/lib/intelligence/types";

export function LeadDetailPanel({
  lead,
  tasks,
  owners,
  quality,
  canEdit,
  canAssign,
  canUseAgent,
  canCreateTask,
  isSuperAdmin,
  saving,
  onClose,
  onPatchLead,
  onAddTask,
  onToggleTask,
  onAskAgent,
}: {
  lead: CrmLeadRecord | null;
  tasks: CrmTaskRecord[];
  owners: OwnerOption[];
  quality?: LeadQualityStatus;
  canEdit: boolean;
  canAssign: boolean;
  canUseAgent: boolean;
  canCreateTask: boolean;
  isSuperAdmin: boolean;
  saving: boolean;
  onClose: () => void;
  onPatchLead: (
    lead: CrmLeadRecord,
    patch: {
      stage?: CrmStage;
      notes?: string;
      nextFollowUpAt?: string | null;
      meetingLink?: string;
      activityNote?: string;
      sendReminder?: boolean;
      ownerId?: string | null;
      ownerEmail?: string | null;
      ownerName?: string | null;
    }
  ) => Promise<void>;
  onAddTask: (lead: CrmLeadRecord, title: string, dueDate: string) => Promise<void>;
  onToggleTask: (task: CrmTaskRecord) => void;
  onAskAgent: (lead: CrmLeadRecord, prompt: string) => void;
}) {
  const [tab, setTab] = useState<"overview" | "tasks" | "timeline" | "copilot">("overview");
  const [notesDraft, setNotesDraft] = useState<string>("");
  const [notesLeadId, setNotesLeadId] = useState<string | null>(null);
  const [activityInput, setActivityInput] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDue, setNewTaskDue] = useState("");

  if (lead && notesLeadId !== lead.id) {
    setNotesLeadId(lead.id);
    setNotesDraft(lead.notes || "");
  }

  const meeting = formatLocalDateTime(lead?.scheduledSlotIso);

  return (
    <SlideOver
      open={Boolean(lead)}
      onClose={onClose}
      width={680}
      title={
        lead
          ? lead.company
            ? `${lead.company} — ${lead.fullName}`
            : lead.fullName
          : ""
      }
      subtitle={
        lead
          ? `${lead.referenceId} · ${lead.email}${lead.phone ? ` · ${lead.phone}` : ""}`
          : ""
      }
      headerActions={
        lead && canUseAgent ? (
          <button
            type="button"
            className="hz-btn hz-btn-primary hz-btn-sm"
            onClick={() =>
              onAskAgent(lead, "Summarize this client and suggest the best next step.")
            }
          >
            <Sparkles size={12} /> Ask HIRZEXA
          </button>
        ) : null
      }
    >
      {lead ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Data Quality Review Banner if Flagged */}
          {quality && quality.kind !== "genuine" ? (
            <div className="hz-crm-quality-banner">
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <AlertTriangle size={16} color="#FBBF24" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>Data Quality Review: {quality.label}</strong>
                  <p>{quality.reason}</p>
                </div>
              </div>
              {canEdit && lead.stage !== "lost" ? (
                <button
                  type="button"
                  className="hz-btn hz-btn-secondary hz-btn-sm"
                  disabled={saving}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Archive ${lead.referenceId} as Closed-Lost and append a [test-record] audit note?`
                      )
                    ) {
                      void onPatchLead(lead, {
                        stage: "lost",
                        notes: `${lead.notes ? `${lead.notes}\n` : ""}[test-record] Reviewed and archived by operator.`,
                        activityNote: "Data quality review: marked as non-production/duplicate and moved to Lost.",
                      });
                    }
                  }}
                >
                  Archive Safely
                </button>
              ) : null}
            </div>
          ) : null}

          {/* Detail Navigation Tabs */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div className="hz-tabs">
              <button
                type="button"
                className={`hz-tab ${tab === "overview" ? "active" : ""}`}
                onClick={() => setTab("overview")}
              >
                Overview
              </button>
              <button
                type="button"
                className={`hz-tab ${tab === "tasks" ? "active" : ""}`}
                onClick={() => setTab("tasks")}
              >
                Tasks ({tasks.length})
              </button>
              <button
                type="button"
                className={`hz-tab ${tab === "timeline" ? "active" : ""}`}
                onClick={() => setTab("timeline")}
              >
                Timeline ({lead.activities.length})
              </button>
              {canUseAgent ? (
                <button
                  type="button"
                  className={`hz-tab ${tab === "copilot" ? "active" : ""}`}
                  onClick={() => setTab("copilot")}
                >
                  <Sparkles size={11} /> AI Copilot
                </button>
              ) : null}
            </div>

            <StatusBadge tone={stageTone(lead.stage)} dot>
              {CRM_STAGE_LABELS[lead.stage].en}
            </StatusBadge>
          </div>

          {/* TAB 1: OVERVIEW */}
          {tab === "overview" ? (
            <>
              <div className="admin-detail-grid">
                <div>
                  <span>Service Category</span>
                  <strong>{lead.serviceTrack}</strong>
                </div>
                <div>
                  <span>Client-Stated Budget</span>
                  <strong>{lead.budgetRange || "Not stated"}</strong>
                </div>
                <div>
                  <span>Confirmed Revenue</span>
                  <strong style={{ color: "var(--hz-text-muted)" }}>
                    {lead.stage === "won" ? "Contract signed (see finance)" : "Not confirmed"}
                  </strong>
                </div>
                <div>
                  <span>Scheduled Consultation</span>
                  <strong>
                    {lead.scheduledSlotIso
                      ? `${meeting.dateLabel} · ${meeting.timeLabel}`
                      : lead.preferredWindow || "Not scheduled"}
                  </strong>
                </div>
              </div>

              <div className="hz-panel" style={{ marginBottom: 0 }}>
                <div className="hz-panel-head">
                  <h2>Project Scope &amp; Requirements</h2>
                  <span style={{ fontSize: 11.5, color: "var(--hz-text-muted)" }}>
                    {lead.leadType === "discovery_call" ? "Discovery Booking" : "Proposal Request"}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "var(--hz-text)", lineHeight: 1.6 }}>
                  {lead.projectSummary}
                </p>
                {lead.currentStack ? (
                  <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--hz-text-secondary)" }}>
                    Current stack: <strong>{lead.currentStack}</strong>
                  </p>
                ) : null}
              </div>

              {/* Pipeline Stage & Owner Governance */}
              <div className="field-grid">
                <div className="field">
                  <label>Pipeline Stage</label>
                  <select
                    disabled={!canEdit || saving}
                    value={lead.stage}
                    onChange={(e) => {
                      const nextStage = e.target.value as CrmStage;
                      void onPatchLead(lead, { stage: nextStage });
                    }}
                  >
                    {CRM_STAGES.map((stage) => {
                      const allowed =
                        isSuperAdmin ||
                        stage === lead.stage ||
                        canTransitionStage(lead.stage, stage);
                      return (
                        <option key={stage} value={stage} disabled={!allowed}>
                          {CRM_STAGE_LABELS[stage].en}
                          {!allowed ? " (sequential transition required)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="field">
                  <label>
                    <UserCheck size={12} style={{ display: "inline", marginInlineEnd: 4 }} />
                    Assigned Owner
                  </label>
                  <select
                    disabled={!canAssign || saving}
                    value={lead.ownerId || ""}
                    onChange={(e) => {
                      const ownerId = e.target.value || null;
                      const match = owners.find((o) => o.id === ownerId);
                      void onPatchLead(lead, {
                        ownerId,
                        ownerEmail: match?.email || null,
                        ownerName: match?.fullName || null,
                      });
                    }}
                  >
                    <option value="">Unassigned</option>
                    {owners.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.fullName} ({o.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quick Actions */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {lead.scheduledSlotIso ? (
                  <a
                    href={`/api/bookings/ics?ref=${encodeURIComponent(lead.referenceId)}`}
                    className="hz-btn hz-btn-secondary hz-btn-sm"
                  >
                    <Download size={12} /> Download .ics
                  </a>
                ) : null}
                {canEdit ? (
                  <button
                    type="button"
                    className="hz-btn hz-btn-secondary hz-btn-sm"
                    disabled={saving}
                    onClick={() => void onPatchLead(lead, { sendReminder: true })}
                  >
                    <CalendarClock size={12} /> Log Reminder
                  </button>
                ) : null}
                <a href={`mailto:${lead.email}`} className="hz-btn hz-btn-secondary hz-btn-sm">
                  <Mail size={12} /> Email Contact
                </a>
                {canUseAgent ? (
                  <button
                    type="button"
                    className="hz-btn hz-btn-secondary hz-btn-sm"
                    onClick={() =>
                      onAskAgent(
                        lead,
                        `Prepare a concise, professional follow-up email for ${lead.fullName} at ${lead.company || "their company"} regarding ${lead.serviceTrack}.`
                      )
                    }
                  >
                    <Sparkles size={12} /> Draft Follow-Up Email
                  </button>
                ) : null}
              </div>

              {/* Internal Notes */}
              <div className="field">
                <label>Shared Internal Notes</label>
                <textarea
                  disabled={!canEdit}
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  placeholder="Record qualification findings, architecture requirements, or decision-maker context…"
                />
                {canEdit ? (
                  <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="hz-btn hz-btn-primary hz-btn-sm"
                      disabled={saving}
                      onClick={() => void onPatchLead(lead, { notes: notesDraft })}
                    >
                      Save Notes
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}

          {/* TAB 2: TASKS */}
          {tab === "tasks" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {canCreateTask ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newTaskTitle.trim()) return;
                    void onAddTask(lead, newTaskTitle.trim(), newTaskDue).then(() => {
                      setNewTaskTitle("");
                      setNewTaskDue("");
                    });
                  }}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) 136px auto",
                    gap: 8,
                  }}
                >
                  <input
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Add a follow-up task for this client…"
                    aria-label="Follow-up task title"
                  />
                  <input
                    type="date"
                    value={newTaskDue}
                    onChange={(e) => setNewTaskDue(e.target.value)}
                    aria-label="Follow-up task due date"
                  />
                  <button
                    type="submit"
                    className="hz-btn hz-btn-primary"
                    disabled={saving || !newTaskTitle.trim()}
                  >
                    <Plus size={14} /> Add
                  </button>
                </form>
              ) : null}

              {tasks.length > 0 ? (
                <div className="hz-row-list">
                  {tasks.map((task) => (
                    <div key={task.id} className="hz-list-row">
                      <button
                        type="button"
                        onClick={() => onToggleTask(task)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 9,
                          border: 0,
                          background: "transparent",
                          color: "inherit",
                          cursor: "pointer",
                          textAlign: "start",
                          padding: 0,
                        }}
                      >
                        {task.status === "completed" ? (
                          <CheckCircle2 size={15} color="#10B981" />
                        ) : (
                          <Circle size={15} color="#64748B" />
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
                            {task.dueAt
                              ? `Due ${formatLocalDateTime(task.dueAt, { includeTime: false }).dateLabel}`
                              : "No due date"}
                          </small>
                        </div>
                      </button>
                      <StatusBadge tone={task.status === "completed" ? "emerald" : "amber"}>
                        {task.status}
                      </StatusBadge>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No linked tasks"
                  description="Schedule a follow-up task above or ask HIRZEXA Copilot to stage one with approval."
                />
              )}
            </div>
          ) : null}

          {/* TAB 3: TIMELINE */}
          {tab === "timeline" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {canEdit ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!activityInput.trim()) return;
                    void onPatchLead(lead, { activityNote: activityInput.trim() }).then(() =>
                      setActivityInput("")
                    );
                  }}
                  style={{ display: "flex", gap: 8 }}
                >
                  <input
                    value={activityInput}
                    onChange={(e) => setActivityInput(e.target.value)}
                    placeholder="Log a call summary, decision note, or client update…"
                    aria-label="Log activity note"
                  />
                  <button
                    type="submit"
                    className="hz-btn hz-btn-primary"
                    disabled={saving || !activityInput.trim()}
                  >
                    <Send size={13} /> Log
                  </button>
                </form>
              ) : null}

              <div className="hz-row-list">
                {lead.activities.map((item) => {
                  const dt = formatLocalDateTime(item.createdAt);
                  return (
                    <div key={item.id} className="hz-list-row" style={{ alignItems: "flex-start" }}>
                      <div>
                        <strong>{item.summary}</strong>
                        <small>
                          {item.actor} · {dt.dateLabel} {dt.timeLabel}
                        </small>
                      </div>
                      <StatusBadge tone="neutral">{item.type.replace(/_/g, " ")}</StatusBadge>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* TAB 4: CONTEXTUAL AI COPILOT */}
          {tab === "copilot" && canUseAgent ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ margin: 0, fontSize: 12.5, color: "var(--hz-text-secondary)" }}>
                Launch record-aware HIRZEXA Intelligence analysis for{" "}
                <strong style={{ color: "#F8FAFC" }}>{lead.company || lead.fullName}</strong>. All
                suggested writes require your explicit confirmation.
              </p>

              {[
                {
                  title: "Executive Client Summary",
                  desc: "Synthesize scope, pipeline stage, interactions, and next step with citations.",
                  prompt: `Summarize client ${lead.referenceId} (${lead.company || lead.fullName}) and recommend the next commercial step.`,
                },
                {
                  title: "Discovery Call Preparation",
                  desc: "Generate tailored architecture questions and agenda points based on their service track.",
                  prompt: `Prepare discovery call talking points and qualification questions for ${lead.referenceId} (${lead.company || lead.fullName}).`,
                },
                {
                  title: "Identify Missing Qualification Details",
                  desc: "Highlight gaps in budget, timeline, decision-makers, or technical stack.",
                  prompt: `Inspect ${lead.referenceId} (${lead.company || lead.fullName}) and list any missing qualification details we need to confirm.`,
                },
                {
                  title: "Draft Client Follow-Up Email",
                  desc: "Draft a bilingual-ready executive follow-up grounded in this opportunity's notes.",
                  prompt: `Draft a professional follow-up email for ${lead.fullName} at ${lead.company || "their organization"} referencing ${lead.referenceId}.`,
                },
                {
                  title: "Stage Follow-Up Task (Approval-Gated)",
                  desc: "Prepare a linked CRM follow-up task for your review before execution.",
                  prompt: `Create a high-priority follow-up task for lead ${lead.referenceId} (${lead.company || lead.fullName}) due tomorrow.`,
                },
              ].map((item) => (
                <button
                  key={item.title}
                  type="button"
                  className="hz-cc-insight-row"
                  onClick={() => onAskAgent(lead, item.prompt)}
                >
                  <span className="hz-cc-row-icon is-indigo" aria-hidden="true">
                    <Sparkles size={15} />
                  </span>
                  <div className="hz-cc-row-copy">
                    <strong>{item.title}</strong>
                    <small>{item.desc}</small>
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </SlideOver>
  );
}

export function CreateOpportunityModal({
  open,
  owners,
  canAssign,
  onClose,
  onCreated,
}: {
  open: boolean;
  owners: OwnerOption[];
  canAssign: boolean;
  onClose: () => void;
  onCreated: (lead: CrmLeadRecord) => void;
}) {
  const [company, setCompany] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [leadType, setLeadType] = useState<"proposal_request" | "discovery_call">("proposal_request");
  const [serviceTrack, setServiceTrack] = useState<string>(B2B_SERVICE_TRACKS[0].en);
  const [budgetRange, setBudgetRange] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [projectSummary, setProjectSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const selectedOwner = owners.find((o) => o.id === ownerId);
      const res = await fetch("/api/admin/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadType,
          company: company.trim(),
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          roleTitle: roleTitle.trim(),
          serviceTrack,
          budgetRange: budgetRange.trim(),
          projectSummary: projectSummary.trim(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          ownerId: selectedOwner?.id,
          ownerEmail: selectedOwner?.email,
          ownerName: selectedOwner?.fullName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to create opportunity.");
        return;
      }
      onCreated(data.lead as CrmLeadRecord);
      setCompany("");
      setFullName("");
      setEmail("");
      setPhone("");
      setRoleTitle("");
      setBudgetRange("");
      setProjectSummary("");
      onClose();
    } catch {
      setError("Network error while creating opportunity.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New B2B Opportunity"
      subtitle="Add a qualified client inquiry or enterprise proposal directly into Supabase CRM."
      width={560}
    >
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        {error ? <p className="hz-alert-error" style={{ margin: 0 }}>{error}</p> : null}

        <div className="field-grid">
          <div className="field">
            <label>Company Name *</label>
            <input
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme Systems"
            />
          </div>
          <div className="field">
            <label>Primary Contact *</label>
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Doe"
            />
          </div>
          <div className="field">
            <label>Work Email *</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@company.com"
            />
          </div>
          <div className="field">
            <label>Phone (optional)</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 010 2020"
            />
          </div>
          <div className="field">
            <label>Opportunity Type</label>
            <select
              value={leadType}
              onChange={(e) =>
                setLeadType(e.target.value as "proposal_request" | "discovery_call")
              }
            >
              <option value="proposal_request">Proposal / Commercial Inquiry</option>
              <option value="discovery_call">Discovery Call Opportunity</option>
            </select>
          </div>
          <div className="field">
            <label>Service Track</label>
            <select value={serviceTrack} onChange={(e) => setServiceTrack(e.target.value)}>
              {B2B_SERVICE_TRACKS.map((track) => (
                <option key={track.id} value={track.en}>
                  {track.en}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Client-Stated Budget (optional)</label>
            <input
              value={budgetRange}
              onChange={(e) => setBudgetRange(e.target.value)}
              placeholder="e.g. $25k – $60k (stated)"
            />
          </div>
          {canAssign && owners.length > 0 ? (
            <div className="field">
              <label>Deal Owner</label>
              <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
                <option value="">Assign to me</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.fullName}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="field">
              <label>Role / Title (optional)</label>
              <input
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="VP of Engineering"
              />
            </div>
          )}
        </div>

        <div className="field">
          <label>Project Scope &amp; Business Objective *</label>
          <textarea
            required
            minLength={5}
            value={projectSummary}
            onChange={(e) => setProjectSummary(e.target.value)}
            placeholder="Describe the client's engineering goals, AI workflow requirements, or delivery timeline…"
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <button type="button" className="hz-btn hz-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="hz-btn hz-btn-primary" disabled={submitting}>
            <Plus size={14} /> {submitting ? "Creating…" : "Create Opportunity"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
