"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Mail,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";
import { Modal, StatusBadge } from "@/components/admin-ui/primitives";
import { formatLocalDateTime } from "@/components/crm/types";
import type { CrmLeadRecord } from "@/lib/crm-types";
import {
  MEETING_TEMPLATE_LABELS,
  type MeetingCommunicationRecord,
  type MeetingCommunicationSummary,
  type MeetingEmailStatus,
  type MeetingEmailTemplateType,
  type RenderedMeetingEmail,
} from "@/lib/crm-meetings/types";

function deliveryStatusMeta(status: MeetingEmailStatus | "not_sent"): {
  label: string;
  tone: "neutral" | "blue" | "violet" | "emerald" | "amber" | "rose";
} {
  switch (status) {
    case "delivered":
      return { label: "Confirmed Delivered", tone: "emerald" };
    case "submitted":
      return { label: "Submitted to Provider", tone: "blue" };
    case "queued":
      return { label: "Queued", tone: "violet" };
    case "processing":
      return { label: "Sending…", tone: "amber" };
    case "failed":
      return { label: "Failed", tone: "rose" };
    case "bounced":
      return { label: "Bounced", tone: "rose" };
    case "complained":
      return { label: "Spam Complaint", tone: "rose" };
    case "cancelled":
      return { label: "Cancelled", tone: "neutral" };
    case "skipped":
      return { label: "Skipped", tone: "neutral" };
    case "draft":
      return { label: "Draft", tone: "neutral" };
    case "not_sent":
    default:
      return { label: "Not Sent", tone: "amber" };
  }
}

function triggerLabel(source: MeetingCommunicationRecord["triggerSource"]): string {
  switch (source) {
    case "booking_auto":
      return "Booking Automation";
    case "scheduler_auto":
      return "Reminder Scheduler";
    case "reschedule_auto":
      return "Reschedule Automation";
    case "cancel_auto":
      return "Cancellation Automation";
    case "ai_assisted_manual":
      return "AI-Assisted (Staff Approved)";
    case "manual_staff":
    default:
      return "Manual Staff Send";
  }
}

function formatOffsetLabel(minutes: number): string {
  if (minutes >= 1440 && minutes % 1440 === 0) {
    const days = minutes / 1440;
    return `${days}d before`;
  }
  if (minutes >= 60 && minutes % 60 === 0) {
    const hrs = minutes / 60;
    return `${hrs}h before`;
  }
  return `${minutes}m before`;
}

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

const PRESET_OFFSETS = [
  { minutes: 1440, label: "24 hours before (default)" },
  { minutes: 120, label: "2 hours before" },
  { minutes: 60, label: "1 hour before (default)" },
  { minutes: 30, label: "30 minutes before" },
];

export function MeetingCommunicationsPanel({
  lead,
  canEdit,
  canUseAgent,
  onLeadUpdated,
  onHistoryLoaded,
}: {
  lead: CrmLeadRecord;
  canEdit: boolean;
  canUseAgent: boolean;
  onLeadUpdated?: (updatedLead: CrmLeadRecord) => void;
  onHistoryLoaded?: (history: MeetingCommunicationRecord[]) => void;
}) {
  const [summary, setSummary] = useState<MeetingCommunicationSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [repairBusy, setRepairBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Composer Modal State
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<"email" | "reminder">("email");
  const [templateType, setTemplateType] = useState<MeetingEmailTemplateType>("post_meeting_followup");
  const [locale, setLocale] = useState<"en" | "ar">(lead.locale || "en");
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [preview, setPreview] = useState<RenderedMeetingEmail | null>(null);
  const [previewTab, setPreviewTab] = useState<"edit" | "html" | "text">("edit");
  const [previewBusy, setPreviewBusy] = useState(false);
  const [aiDraftBusy, setAiDraftBusy] = useState(false);
  const [aiAssisted, setAiAssisted] = useState(false);
  const [groundedFacts, setGroundedFacts] = useState<string[]>([]);
  const [confirmedSend, setConfirmedSend] = useState(false);
  const [duplicateOverride, setDuplicateOverride] = useState(false);
  const [duplicatePrompt, setDuplicatePrompt] = useState<string | null>(null);
  const [sendBusy, setSendBusy] = useState(false);
  const [composerError, setComposerError] = useState("");

  // Schedule & Meeting Management Modal State
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleTab, setScheduleTab] = useState<"reminders" | "reschedule" | "cancel">("reminders");
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [selectedOffsets, setSelectedOffsets] = useState<number[]>([1440, 60]);
  const [customReminderLocal, setCustomReminderLocal] = useState("");
  const [rescheduleSlotLocal, setRescheduleSlotLocal] = useState("");
  const [rescheduleLink, setRescheduleLink] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [rescheduleNotify, setRescheduleNotify] = useState(true);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelNotify, setCancelNotify] = useState(true);
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [scheduleError, setScheduleError] = useState("");

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/crm/${encodeURIComponent(lead.id)}/communications`, {
        cache: "no-store",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        summary?: MeetingCommunicationSummary;
        error?: string;
      };
      if (!res.ok || !data.summary) {
        setError(data.error || "Unable to load meeting communications.");
        return;
      }
      setSummary(data.summary);
      setRemindersEnabled(data.summary.reminderConfig.enabled);
      setSelectedOffsets(data.summary.reminderConfig.offsetsMinutes);
      onHistoryLoaded?.(data.summary.history);
    } catch {
      setError("Network error loading meeting communications.");
    } finally {
      setLoading(false);
    }
  }, [lead.id, onHistoryLoaded]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const fetchPreview = useCallback(
    async (
      nextTemplate: MeetingEmailTemplateType,
      nextLocale: "en" | "ar",
      overrides?: { subject?: string; bodyText?: string; overwriteFields?: boolean }
    ) => {
      setPreviewBusy(true);
      setComposerError("");
      try {
        const res = await fetch(`/api/admin/crm/${encodeURIComponent(lead.id)}/communications`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "preview",
            templateType: nextTemplate,
            locale: nextLocale,
            subject: overrides?.overwriteFields ? undefined : overrides?.subject,
            bodyText: overrides?.overwriteFields ? undefined : overrides?.bodyText,
          }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          preview?: RenderedMeetingEmail;
          error?: string;
        };
        if (!res.ok || !data.preview) {
          setComposerError(data.error || "Unable to render email preview.");
          return;
        }
        setPreview(data.preview);
        if (overrides?.overwriteFields) {
          setSubject(data.preview.subject);
          setBodyText(data.preview.editableBody);
        }
      } catch {
        setComposerError("Network error rendering preview.");
      } finally {
        setPreviewBusy(false);
      }
    },
    [lead.id]
  );

  function openComposer(mode: "email" | "reminder", initialTemplate?: MeetingEmailTemplateType) {
    const defaultTpl: MeetingEmailTemplateType =
      initialTemplate ||
      (mode === "reminder"
        ? "meeting_reminder_24h"
        : lead.stage === "discovery_completed" || lead.stage === "proposal_sent"
        ? "post_meeting_followup"
        : "custom_email");
    const nextLocale = lead.locale || "en";
    setComposerMode(mode);
    setTemplateType(defaultTpl);
    setLocale(nextLocale);
    setPreviewTab("edit");
    setConfirmedSend(false);
    setDuplicateOverride(false);
    setDuplicatePrompt(mode === "reminder" ? summary?.recentReminderWarning || null : null);
    setAiAssisted(false);
    setGroundedFacts([]);
    setComposerError("");
    setComposerOpen(true);
    void fetchPreview(defaultTpl, nextLocale, { overwriteFields: true });
  }

  async function handleAiDraftFollowUp() {
    setAiDraftBusy(true);
    setComposerError("");
    try {
      const res = await fetch(`/api/admin/crm/${encodeURIComponent(lead.id)}/communications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ai_draft_followup",
          locale,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        draft?: {
          subject: string;
          bodyText: string;
          groundedFacts: string[];
          generatedBy: string;
        };
        error?: string;
      };
      if (!res.ok || !data.draft) {
        setComposerError(data.error || "Unable to generate AI follow-up draft.");
        return;
      }
      setTemplateType("post_meeting_followup");
      setSubject(data.draft.subject);
      setBodyText(data.draft.bodyText);
      setGroundedFacts(data.draft.groundedFacts);
      setAiAssisted(true);
      setConfirmedSend(false);
      setPreviewTab("edit");
      await fetchPreview("post_meeting_followup", locale, {
        subject: data.draft.subject,
        bodyText: data.draft.bodyText,
      });
    } catch {
      setComposerError("Network error generating AI draft.");
    } finally {
      setAiDraftBusy(false);
    }
  }

  async function handleSendEmail() {
    if (!confirmedSend) {
      setComposerError("Please confirm recipient and message content before sending.");
      return;
    }
    setSendBusy(true);
    setComposerError("");
    try {
      const res = await fetch(`/api/admin/crm/${encodeURIComponent(lead.id)}/communications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: composerMode === "reminder" ? "send_reminder" : "send_email",
          templateType,
          subject,
          bodyText,
          locale,
          confirmed: true,
          allowDuplicateOverride: duplicateOverride,
          aiAssisted,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        code?: string;
        error?: string;
        summary?: MeetingCommunicationSummary;
      };
      if (!res.ok) {
        if (data.code === "DUPLICATE_REMINDER_GUARD") {
          setDuplicatePrompt(data.error || "A reminder was recently sent.");
        }
        setComposerError(data.error || "Failed to send email.");
        if (data.summary) {
          setSummary(data.summary);
          onHistoryLoaded?.(data.summary.history);
        }
        return;
      }
      if (data.summary) {
        setSummary(data.summary);
        onHistoryLoaded?.(data.summary.history);
      }
      setNotice(
        `${MEETING_TEMPLATE_LABELS[templateType].label} submitted to ${lead.email} via Resend (awaiting webhook delivery confirmation).`
      );
      setComposerOpen(false);
    } catch {
      setComposerError("Network error while sending email.");
    } finally {
      setSendBusy(false);
    }
  }

  function openScheduleModal(tab: "reminders" | "reschedule" | "cancel" = "reminders") {
    setScheduleTab(tab);
    setScheduleError("");
    setCustomReminderLocal("");
    setRescheduleSlotLocal(toDatetimeLocalValue(lead.scheduledSlotIso));
    setRescheduleLink(lead.meetingLink || "");
    setRescheduleReason("");
    setRescheduleNotify(true);
    setCancelReason("");
    setCancelNotify(true);
    if (summary) {
      setRemindersEnabled(summary.reminderConfig.enabled);
      setSelectedOffsets(summary.reminderConfig.offsetsMinutes);
    }
    setScheduleOpen(true);
  }

  async function handleSaveReminderSchedule() {
    setScheduleBusy(true);
    setScheduleError("");
    try {
      const customIso = customReminderLocal
        ? new Date(customReminderLocal).toISOString()
        : undefined;
      const res = await fetch(`/api/admin/crm/${encodeURIComponent(lead.id)}/communications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "schedule_reminder",
          enabled: remindersEnabled,
          offsetsMinutes: selectedOffsets,
          customScheduledForIso: customIso,
          locale: lead.locale,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        summary?: MeetingCommunicationSummary;
      };
      if (!res.ok) {
        setScheduleError(data.error || "Unable to update reminder schedule.");
        return;
      }
      if (data.summary) {
        setSummary(data.summary);
        onHistoryLoaded?.(data.summary.history);
      }
      setCustomReminderLocal("");
      setNotice("Reminder schedule updated and persisted in UTC.");
    } catch {
      setScheduleError("Network error saving reminder schedule.");
    } finally {
      setScheduleBusy(false);
    }
  }

  async function handleCancelQueuedReminder(jobId: string) {
    setScheduleBusy(true);
    setScheduleError("");
    try {
      const res = await fetch(`/api/admin/crm/${encodeURIComponent(lead.id)}/communications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel_reminder", jobId }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        summary?: MeetingCommunicationSummary;
      };
      if (!res.ok) {
        setScheduleError(data.error || "Unable to cancel scheduled reminder.");
        return;
      }
      if (data.summary) {
        setSummary(data.summary);
        onHistoryLoaded?.(data.summary.history);
      }
    } catch {
      setScheduleError("Network error cancelling reminder.");
    } finally {
      setScheduleBusy(false);
    }
  }

  async function handleRescheduleMeeting() {
    if (!rescheduleSlotLocal) {
      setScheduleError("Select a new future date and time.");
      return;
    }
    setScheduleBusy(true);
    setScheduleError("");
    try {
      const res = await fetch(`/api/admin/crm/${encodeURIComponent(lead.id)}/communications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reschedule_meeting",
          newScheduledSlotIso: new Date(rescheduleSlotLocal).toISOString(),
          timezone: lead.timezone || "UTC",
          meetingLink: rescheduleLink.trim() || undefined,
          reason: rescheduleReason.trim() || undefined,
          notifyClient: rescheduleNotify,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        lead?: CrmLeadRecord;
        cancelledCount?: number;
        scheduledReminders?: MeetingCommunicationRecord[];
        summary?: MeetingCommunicationSummary;
      };
      if (!res.ok) {
        setScheduleError(data.error || "Failed to reschedule meeting.");
        return;
      }
      if (data.lead) onLeadUpdated?.(data.lead);
      if (data.summary) {
        setSummary(data.summary);
        onHistoryLoaded?.(data.summary.history);
      }
      setNotice(
        `Meeting rescheduled. Cancelled ${data.cancelledCount ?? 0} obsolete reminder(s) and queued ${
          data.scheduledReminders?.length ?? 0
        } updated reminder(s).`
      );
      setScheduleOpen(false);
    } catch {
      setScheduleError("Network error rescheduling meeting.");
    } finally {
      setScheduleBusy(false);
    }
  }

  async function handleCancelMeeting() {
    setScheduleBusy(true);
    setScheduleError("");
    try {
      const res = await fetch(`/api/admin/crm/${encodeURIComponent(lead.id)}/communications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel_meeting",
          reason: cancelReason.trim() || undefined,
          notifyClient: cancelNotify,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        lead?: CrmLeadRecord;
        cancelledCount?: number;
        summary?: MeetingCommunicationSummary;
      };
      if (!res.ok) {
        setScheduleError(data.error || "Failed to cancel meeting.");
        return;
      }
      if (data.lead) onLeadUpdated?.(data.lead);
      if (data.summary) {
        setSummary(data.summary);
        onHistoryLoaded?.(data.summary.history);
      }
      setNotice(
        `Meeting cancelled and ${data.cancelledCount ?? 0} pending reminder(s) stopped.`
      );
      setScheduleOpen(false);
    } catch {
      setScheduleError("Network error cancelling meeting.");
    } finally {
      setScheduleBusy(false);
    }
  }

  async function handleRepairGoogleMeet() {
    setRepairBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/admin/crm/${encodeURIComponent(lead.id)}/communications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "provision_google_meet" }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        lead?: CrmLeadRecord;
        meetUrl?: string;
        summary?: MeetingCommunicationSummary;
      };
      if (!res.ok || !data.meetUrl) {
        setError(data.error || "Unable to generate Google Meet link.");
        return;
      }
      if (data.lead) onLeadUpdated?.(data.lead);
      if (data.summary) {
        setSummary(data.summary);
        onHistoryLoaded?.(data.summary.history);
      }
      setNotice(
        `Verified Google Meet link attached (${data.meetUrl}). No duplicate customer email was sent automatically — use Send Email when ready to share it.`
      );
    } catch {
      setError("Network error while provisioning Google Meet link.");
    } finally {
      setRepairBusy(false);
    }
  }

  const slotFmt = formatLocalDateTime(lead.scheduledSlotIso);
  const nextRemFmt = formatLocalDateTime(summary?.nextScheduledReminder?.scheduledFor);
  const confirmBadge = deliveryStatusMeta(summary?.confirmationStatus || "not_sent");
  const meetingActive =
    Boolean(lead.scheduledSlotIso) &&
    lead.stage !== "lost" &&
    lead.stage !== "discovery_completed";
  const hasRealVideoLink =
    Boolean(lead.meetingLink) && !/hirzexa\.com\/book/i.test(lead.meetingLink || "");
  const isGoogleMeetLink = Boolean(
    lead.meetingLink && /^https:\/\/meet\.google\.com\/.+$/i.test(lead.meetingLink.trim())
  );

  const availableTemplates: MeetingEmailTemplateType[] = useMemo(
    () =>
      composerMode === "reminder"
        ? ["meeting_reminder_24h", "meeting_reminder_1h", "meeting_reminder_custom"]
        : [
            "meeting_confirmation",
            "meeting_reminder_24h",
            "meeting_reminder_1h",
            "meeting_rescheduled",
            "meeting_cancelled",
            "post_meeting_followup",
            "custom_email",
          ],
    [composerMode]
  );

  return (
    <div className="hz-panel" style={{ marginBottom: 0 }}>
      <div className="hz-panel-head" style={{ alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Mail size={14} color="#60A5FA" />
          <h2>Meeting Communications</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <StatusBadge tone={confirmBadge.tone} dot>
            Confirmation: {confirmBadge.label}
          </StatusBadge>
          <button
            type="button"
            className="hz-icon-btn"
            onClick={() => void loadSummary()}
            disabled={loading}
            aria-label="Refresh communication status"
            title="Refresh communication status"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {error ? (
        <p className="hz-alert-error" style={{ margin: "0 0 10px", fontSize: 12 }}>
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="hz-alert-success" style={{ margin: "0 0 10px", fontSize: 12 }}>
          {notice}
        </p>
      ) : null}
      {summary && !summary.emailProviderReady ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 10px",
            marginBottom: 10,
            borderRadius: 8,
            background: "rgba(245, 158, 11, 0.1)",
            border: "1px solid rgba(245, 158, 11, 0.28)",
            fontSize: 12,
            color: "#FCD34D",
          }}
        >
          <AlertTriangle size={14} style={{ flexShrink: 0 }} />
          <span>
            Resend API key is not configured on this environment. Emails will fail safely until{" "}
            <code>RESEND_API_KEY</code> is provisioned.
          </span>
        </div>
      ) : null}

      {/* Compact Meeting Details Grid */}
      <div className="admin-detail-grid" style={{ marginBottom: 12 }}>
        <div>
          <span>Meeting Date &amp; Time</span>
          <strong>
            {lead.scheduledSlotIso
              ? `${slotFmt.dateLabel} · ${slotFmt.timeLabel}`
              : lead.preferredWindow || "Not scheduled"}
          </strong>
          <small style={{ color: "var(--hz-text-muted)", fontSize: 11 }}>
            Client TZ: {lead.timezone || "UTC"}
          </small>
        </div>
        <div>
          <span>Client Email</span>
          <strong style={{ wordBreak: "break-all" }}>{lead.email}</strong>
        </div>
        <div>
          <span>Meeting Type</span>
          <strong>
            {lead.leadType === "discovery_call"
              ? `Discovery Call (${lead.durationMinutes} min)`
              : "Proposal Consultation"}
          </strong>
        </div>
        <div>
          <span>Assigned Employee</span>
          <strong>{lead.ownerName || lead.ownerEmail || "Unassigned"}</strong>
        </div>
        <div>
          <span>{isGoogleMeetLink ? "Google Meet Link" : "Joining Link / Location"}</span>
          {hasRealVideoLink && lead.meetingLink ? (
            <a
              href={lead.meetingLink}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12.5,
                color: "#34D399",
                fontWeight: 600,
                wordBreak: "break-all",
              }}
            >
              {lead.meetingLink} <ExternalLink size={11} />
            </a>
          ) : (
            <div>
              <strong style={{ color: "#FBBF24" }}>
                {lead.meetProvisioningStatus === "failed"
                  ? "Meet Link Failed"
                  : "No Verified Meet Link"}
              </strong>
              {lead.meetProvisioningError ? (
                <small style={{ display: "block", color: "#FCA5A5", fontSize: 11, marginTop: 2 }}>
                  {lead.meetProvisioningError}
                </small>
              ) : null}
            </div>
          )}
        </div>
        <div>
          <span>Next Scheduled Reminder</span>
          {summary?.nextScheduledReminder ? (
            <>
              <strong>
                {MEETING_TEMPLATE_LABELS[summary.nextScheduledReminder.templateType].shortLabel}
              </strong>
              <small style={{ color: "var(--hz-text-muted)", fontSize: 11 }}>
                {nextRemFmt.dateLabel} · {nextRemFmt.timeLabel}
              </small>
            </>
          ) : (
            <strong style={{ color: "var(--hz-text-muted)" }}>
              {meetingActive ? "None queued" : "Inactive"}
            </strong>
          )}
        </div>
      </div>

      {/* Compact Action Controls */}
      {canEdit ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {meetingActive && !isGoogleMeetLink ? (
            <button
              type="button"
              className="hz-btn hz-btn-primary hz-btn-sm"
              disabled={repairBusy}
              title="Creates a real Google Calendar event & unique Google Meet link without automatically emailing the client"
              onClick={() => void handleRepairGoogleMeet()}
            >
              <RefreshCw size={12} />
              {repairBusy ? "Generating Meet…" : "Generate Google Meet Link"}
            </button>
          ) : null}
          <button
            type="button"
            className="hz-btn hz-btn-primary hz-btn-sm"
            onClick={() => openComposer("email")}
          >
            <Mail size={12} /> Send Email
          </button>
          <button
            type="button"
            className="hz-btn hz-btn-secondary hz-btn-sm"
            disabled={!meetingActive}
            title={
              meetingActive
                ? "Preview and send a meeting reminder email"
                : "Requires an active scheduled meeting"
            }
            onClick={() => openComposer("reminder", "meeting_reminder_24h")}
          >
            <Bell size={12} /> Send Meeting Reminder
          </button>
          <button
            type="button"
            className="hz-btn hz-btn-secondary hz-btn-sm"
            onClick={() => openScheduleModal("reminders")}
          >
            <CalendarClock size={12} /> Schedule Reminder
          </button>
          {canUseAgent ? (
            <button
              type="button"
              className="hz-btn hz-btn-ghost hz-btn-sm"
              onClick={() => {
                openComposer("email", "post_meeting_followup");
                setTimeout(() => void handleAiDraftFollowUp(), 80);
              }}
            >
              <Sparkles size={12} /> AI Follow-Up Draft
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Compact Recent Communication History */}
      <div style={{ borderTop: "1px solid var(--hz-border)", paddingTop: 10 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--hz-text-secondary)" }}>
            Client Email History ({summary?.history.length ?? 0})
          </span>
          {summary ? (
            <span style={{ fontSize: 11, color: "var(--hz-text-muted)" }}>
              From: {summary.senderAddress}
            </span>
          ) : null}
        </div>

        {loading && !summary ? (
          <p style={{ margin: 0, fontSize: 12, color: "var(--hz-text-muted)" }}>
            Loading communications…
          </p>
        ) : summary && summary.history.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {summary.history.slice(0, 5).map((item) => {
              const badge = deliveryStatusMeta(item.status);
              const schedDt = formatLocalDateTime(item.scheduledFor);
              const sentDt = formatLocalDateTime(item.sentAt);
              return (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: "rgba(15, 23, 42, 0.55)",
                    border: "1px solid rgba(148, 163, 184, 0.14)",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "#F8FAFC" }}>
                      {MEETING_TEMPLATE_LABELS[item.templateType]?.label || item.templateType}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--hz-text-secondary)", marginTop: 2 }}>
                      To: {item.recipientEmail} · {item.initiatedByName || triggerLabel(item.triggerSource)}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--hz-text-muted)", marginTop: 2 }}>
                      {item.status === "queued" && item.scheduledFor
                        ? `Scheduled: ${schedDt.dateLabel} ${schedDt.timeLabel}`
                        : item.sentAt
                        ? `Submitted: ${sentDt.dateLabel} ${sentDt.timeLabel}`
                        : `Created: ${formatLocalDateTime(item.createdAt).dateLabel}`}
                      {item.deliveredAt
                        ? ` · Delivered: ${formatLocalDateTime(item.deliveredAt).timeLabel}`
                        : ""}
                    </div>
                    {item.failureReason ? (
                      <div style={{ fontSize: 11, color: "#FCA5A5", marginTop: 3 }}>
                        {item.failureReason}
                      </div>
                    ) : null}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                    <StatusBadge tone={badge.tone} dot>
                      {badge.label}
                    </StatusBadge>
                    {item.status === "queued" && canEdit ? (
                      <button
                        type="button"
                        className="hz-btn hz-btn-ghost hz-btn-sm"
                        style={{ padding: "2px 6px", fontSize: 11 }}
                        onClick={() => void handleCancelQueuedReminder(item.id)}
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 12, color: "var(--hz-text-muted)" }}>
            No client meeting emails recorded yet. Use <strong>Send Email</strong> or{" "}
            <strong>Schedule Reminder</strong> above.
          </p>
        )}
      </div>

      {/* EMAIL COMPOSER & LIVE PREVIEW MODAL */}
      <Modal
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        width={760}
        title={composerMode === "reminder" ? "Send Meeting Reminder" : "Compose Client Email"}
        subtitle={`Recipient: ${lead.fullName} <${lead.email}> · Ref ${lead.referenceId}`}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {composerError ? (
            <p className="hz-alert-error" style={{ margin: 0, fontSize: 12.5 }}>
              {composerError}
            </p>
          ) : null}

          {duplicatePrompt ? (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: "rgba(245, 158, 11, 0.12)",
                border: "1px solid rgba(245, 158, 11, 0.35)",
                fontSize: 12.5,
                color: "#FDE68A",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                <AlertTriangle size={14} /> Duplicate Reminder Protection
              </div>
              <p style={{ margin: "4px 0 8px" }}>{duplicatePrompt}</p>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={duplicateOverride}
                  onChange={(e) => setDuplicateOverride(e.target.checked)}
                />
                <span>Override duplicate guard — I intentionally want to send another reminder now</span>
              </label>
            </div>
          ) : null}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 120px auto",
              gap: 8,
              alignItems: "end",
            }}
          >
            <div className="field" style={{ margin: 0 }}>
              <label>Template</label>
              <select
                value={templateType}
                onChange={(e) => {
                  const next = e.target.value as MeetingEmailTemplateType;
                  setTemplateType(next);
                  setAiAssisted(false);
                  setGroundedFacts([]);
                  void fetchPreview(next, locale, { overwriteFields: true });
                }}
              >
                {availableTemplates.map((tpl) => (
                  <option key={tpl} value={tpl}>
                    {MEETING_TEMPLATE_LABELS[tpl].label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field" style={{ margin: 0 }}>
              <label>Language</label>
              <select
                value={locale}
                onChange={(e) => {
                  const nextLoc = e.target.value === "ar" ? "ar" : "en";
                  setLocale(nextLoc);
                  void fetchPreview(templateType, nextLoc, { overwriteFields: true });
                }}
              >
                <option value="en">English</option>
                <option value="ar">Arabic</option>
              </select>
            </div>

            {canUseAgent ? (
              <button
                type="button"
                className="hz-btn hz-btn-secondary hz-btn-sm"
                disabled={aiDraftBusy}
                onClick={() => void handleAiDraftFollowUp()}
                style={{ height: 38 }}
              >
                <Sparkles size={13} />
                {aiDraftBusy ? "Drafting…" : "AI Draft Follow-Up"}
              </button>
            ) : null}
          </div>

          {groundedFacts.length > 0 ? (
            <div
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                background: "rgba(59, 130, 246, 0.1)",
                border: "1px solid rgba(59, 130, 246, 0.28)",
                fontSize: 11.5,
                color: "#BFDBFE",
              }}
            >
              <strong>AI Draft (Requires Human Review):</strong> Grounded strictly in{" "}
              {groundedFacts.length} verified CRM fields. Verify every line before approving send.
            </div>
          ) : null}

          <div className="hz-tabs" style={{ alignSelf: "flex-start" }}>
            <button
              type="button"
              className={`hz-tab ${previewTab === "edit" ? "active" : ""}`}
              onClick={() => setPreviewTab("edit")}
            >
              Compose &amp; Edit
            </button>
            <button
              type="button"
              className={`hz-tab ${previewTab === "html" ? "active" : ""}`}
              onClick={() => {
                setPreviewTab("html");
                void fetchPreview(templateType, locale, { subject, bodyText });
              }}
            >
              <Eye size={12} /> HTML Preview
            </button>
            <button
              type="button"
              className={`hz-tab ${previewTab === "text" ? "active" : ""}`}
              onClick={() => {
                setPreviewTab("text");
                void fetchPreview(templateType, locale, { subject, bodyText });
              }}
            >
              Plain Text
            </button>
          </div>

          {previewTab === "edit" ? (
            <>
              <div className="field" style={{ margin: 0 }}>
                <label>Subject</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={220}
                  placeholder="Email subject line…"
                />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Message Body (Plain text — safely wrapped in HIRZEXA responsive HTML)</label>
                <textarea
                  rows={8}
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  maxLength={6000}
                  dir={locale === "ar" ? "rtl" : "ltr"}
                />
              </div>
            </>
          ) : previewTab === "html" ? (
            <div
              style={{
                borderRadius: 10,
                overflow: "hidden",
                border: "1px solid var(--hz-border)",
                background: "#eef2fa",
              }}
            >
              {previewBusy || !preview ? (
                <div style={{ padding: 24, color: "#334155", fontSize: 13 }}>
                  Rendering live HTML preview…
                </div>
              ) : (
                <iframe
                  title="Meeting Email HTML Preview"
                  sandbox=""
                  srcDoc={preview.html}
                  style={{ width: "100%", height: 390, border: 0, display: "block" }}
                />
              )}
            </div>
          ) : (
            <pre
              style={{
                margin: 0,
                padding: 14,
                borderRadius: 10,
                background: "rgba(15, 23, 42, 0.85)",
                border: "1px solid var(--hz-border)",
                fontSize: 12,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                maxHeight: 360,
                overflowY: "auto",
                color: "#E2E8F0",
              }}
            >
              {previewBusy ? "Rendering plain-text preview…" : preview?.text || bodyText}
            </pre>
          )}

          {/* Explicit Human Confirmation Gate */}
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              padding: "10px 12px",
              borderRadius: 10,
              background: "rgba(16, 80, 255, 0.08)",
              border: "1px solid rgba(59, 130, 246, 0.25)",
              fontSize: 12.5,
              color: "#E2E8F0",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={confirmedSend}
              onChange={(e) => setConfirmedSend(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            <span>
              I confirm sending this transactional email to <strong>{lead.email}</strong> (reply-to:{" "}
              <code>{summary?.replyToAddress || "business@hirzexa.com"}</code>) and have verified the
              meeting details and message accuracy.
            </span>
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="button"
              className="hz-btn hz-btn-ghost"
              onClick={() => setComposerOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="hz-btn hz-btn-primary"
              disabled={sendBusy || !confirmedSend || !subject.trim() || !bodyText.trim()}
              onClick={() => void handleSendEmail()}
            >
              <Send size={13} />
              {sendBusy ? "Submitting…" : "Approve & Send Email"}
            </button>
          </div>
        </div>
      </Modal>

      {/* SCHEDULE REMINDERS / RESCHEDULE / CANCEL MODAL */}
      <Modal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        width={620}
        title="Meeting Reminders & Schedule"
        subtitle={`${lead.company || lead.fullName} (${lead.referenceId}) · Timezone: ${lead.timezone || "UTC"}`}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="hz-tabs" style={{ alignSelf: "flex-start" }}>
            <button
              type="button"
              className={`hz-tab ${scheduleTab === "reminders" ? "active" : ""}`}
              onClick={() => {
                setScheduleTab("reminders");
                setScheduleError("");
              }}
            >
              <Clock size={12} /> Reminder Schedule
            </button>
            <button
              type="button"
              className={`hz-tab ${scheduleTab === "reschedule" ? "active" : ""}`}
              onClick={() => {
                setScheduleTab("reschedule");
                setScheduleError("");
              }}
            >
              <CalendarClock size={12} /> Reschedule
            </button>
            <button
              type="button"
              className={`hz-tab ${scheduleTab === "cancel" ? "active" : ""}`}
              onClick={() => {
                setScheduleTab("cancel");
                setScheduleError("");
              }}
            >
              <XCircle size={12} /> Cancel Meeting
            </button>
          </div>

          {scheduleError ? (
            <p className="hz-alert-error" style={{ margin: 0, fontSize: 12.5 }}>
              {scheduleError}
            </p>
          ) : null}

          {scheduleTab === "reminders" ? (
            <>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={remindersEnabled}
                  onChange={(e) => setRemindersEnabled(e.target.checked)}
                />
                <span>Enable automated pre-meeting email reminders (UTC-scheduled)</span>
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {PRESET_OFFSETS.map((preset) => {
                  const checked = selectedOffsets.includes(preset.minutes);
                  return (
                    <label
                      key={preset.minutes}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 10px",
                        borderRadius: 8,
                        background: "rgba(15, 23, 42, 0.55)",
                        border: "1px solid var(--hz-border)",
                        fontSize: 12.5,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        disabled={!remindersEnabled}
                        checked={checked}
                        onChange={(e) => {
                          setSelectedOffsets((prev) =>
                            e.target.checked
                              ? [...prev, preset.minutes].sort((a, b) => b - a)
                              : prev.filter((m) => m !== preset.minutes)
                          );
                        }}
                      />
                      <span>{preset.label}</span>
                    </label>
                  );
                })}
              </div>

              <div className="field" style={{ margin: 0 }}>
                <label>Optional: Schedule a Custom One-Off Reminder (Your Local Time → Stored UTC)</label>
                <input
                  type="datetime-local"
                  value={customReminderLocal}
                  onChange={(e) => setCustomReminderLocal(e.target.value)}
                  disabled={!meetingActive}
                />
              </div>

              {summary && summary.scheduledReminders.length > 0 ? (
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--hz-text-secondary)" }}>
                    Active Queued Reminders ({summary.scheduledReminders.length})
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
                    {summary.scheduledReminders.map((job) => {
                      const dt = formatLocalDateTime(job.scheduledFor);
                      const offsetMin =
                        typeof job.metadata?.offsetMinutes === "number"
                          ? formatOffsetLabel(job.metadata.offsetMinutes)
                          : "Custom";
                      return (
                        <div
                          key={job.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "8px 10px",
                            borderRadius: 8,
                            background: "rgba(15, 23, 42, 0.5)",
                            border: "1px solid var(--hz-border)",
                            fontSize: 12,
                          }}
                        >
                          <div>
                            <strong>{MEETING_TEMPLATE_LABELS[job.templateType].label}</strong>{" "}
                            <span style={{ color: "var(--hz-text-muted)" }}>({offsetMin})</span>
                            <div style={{ fontSize: 11.5, color: "var(--hz-text-secondary)" }}>
                              Fires: {dt.dateLabel} · {dt.timeLabel}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="hz-btn hz-btn-ghost hz-btn-sm"
                            disabled={scheduleBusy}
                            onClick={() => void handleCancelQueuedReminder(job.id)}
                          >
                            <Trash2 size={12} /> Cancel
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  type="button"
                  className="hz-btn hz-btn-ghost"
                  onClick={() => setScheduleOpen(false)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="hz-btn hz-btn-primary"
                  disabled={scheduleBusy}
                  onClick={() => void handleSaveReminderSchedule()}
                >
                  <CheckCircle2 size={13} />
                  {scheduleBusy ? "Saving…" : "Save Reminder Schedule"}
                </button>
              </div>
            </>
          ) : scheduleTab === "reschedule" ? (
            <>
              <div className="field" style={{ margin: 0 }}>
                <label>New Meeting Date &amp; Time</label>
                <input
                  type="datetime-local"
                  value={rescheduleSlotLocal}
                  onChange={(e) => setRescheduleSlotLocal(e.target.value)}
                />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Confirmed Meeting Link (optional — leave blank if unchanged)</label>
                <input
                  value={rescheduleLink}
                  onChange={(e) => setRescheduleLink(e.target.value)}
                  placeholder="https://meet.google.com/..."
                />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Reason / Note for Client (optional)</label>
                <input
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="Updated to accommodate engineering lead availability…"
                />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                <input
                  type="checkbox"
                  checked={rescheduleNotify}
                  onChange={(e) => setRescheduleNotify(e.target.checked)}
                />
                <span>Send Meeting Rescheduled email with updated .ics invite to {lead.email}</span>
              </label>
              <p style={{ margin: 0, fontSize: 11.5, color: "var(--hz-text-muted)" }}>
                Obsolete reminders for the previous slot will be cancelled automatically and new
                reminders will be recalculated from the new UTC time.
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  type="button"
                  className="hz-btn hz-btn-ghost"
                  onClick={() => setScheduleOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="hz-btn hz-btn-primary"
                  disabled={scheduleBusy || !rescheduleSlotLocal}
                  onClick={() => void handleRescheduleMeeting()}
                >
                  {scheduleBusy ? "Rescheduling…" : "Confirm Reschedule"}
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: 12.5, color: "var(--hz-text-secondary)" }}>
                Cancelling clears the scheduled meeting slot and immediately stops all queued
                automated reminders so the client never receives obsolete messages.
              </p>
              <div className="field" style={{ margin: 0 }}>
                <label>Cancellation Reason (optional)</label>
                <input
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Client requested to postpone until next quarter…"
                />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                <input
                  type="checkbox"
                  checked={cancelNotify}
                  onChange={(e) => setCancelNotify(e.target.checked)}
                />
                <span>Send Meeting Cancelled confirmation email to {lead.email}</span>
              </label>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  type="button"
                  className="hz-btn hz-btn-ghost"
                  onClick={() => setScheduleOpen(false)}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="hz-btn hz-btn-danger"
                  disabled={scheduleBusy}
                  onClick={() => void handleCancelMeeting()}
                >
                  {scheduleBusy ? "Cancelling…" : "Confirm Cancel Meeting"}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
