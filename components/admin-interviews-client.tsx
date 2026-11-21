"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  Eye,
  List,
  Mail,
  Monitor,
  Plus,
  RefreshCw,
  Smartphone,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import {
  EmptyState,
  MetricCard,
  PageHeader,
  StatusBadge,
} from "@/components/admin-ui/primitives";
import {
  COMMON_IANA_TIMEZONES,
  INTERVIEW_DURATIONS,
  INTERVIEW_FORMAT_LABELS,
  INTERVIEW_TYPE_LABELS,
  formatUtcInTimezone,
  type InterviewActivityRecord,
  type InterviewAppointmentRecord,
  type InterviewDuration,
  type InterviewOutcome,
  type InterviewStatistics,
  type InterviewTemplateKind,
  type InterviewerAvailabilityException,
  type InterviewerAvailabilityRule,
  type SafeInterviewInvitation,
} from "@/lib/interviews/types";

interface InterviewerOption {
  id: string;
  fullName: string;
  email: string;
  jobTitle: string;
  department: string;
  roleKey: string;
  hasConfiguredAvailability: boolean;
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const TEMPLATE_OPTIONS: Array<{ kind: InterviewTemplateKind; label: string }> = [
  { kind: "invitation", label: "1. Interview Invitation" },
  { kind: "confirmation", label: "2. Interview Confirmation" },
  { kind: "reminder", label: "3. Interview Reminder (24h / 1h)" },
  { kind: "rescheduled", label: "4. Interview Rescheduled" },
  { kind: "canceled", label: "5. Interview Canceled" },
  { kind: "expired", label: "6. Scheduling Link Expired" },
];

function minutesToTimeInput(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function timeInputToMinutes(val: string): number {
  const [h, m] = val.split(":").map(Number);
  return (Number.isFinite(h) ? h : 9) * 60 + (Number.isFinite(m) ? m : 0);
}

function deliveryTone(status: string): "emerald" | "blue" | "amber" | "rose" | "neutral" {
  switch (status) {
    case "delivered":
      return "emerald";
    case "accepted_by_provider":
      return "blue";
    case "delivery_failed":
    case "bounced":
    case "complained":
      return "rose";
    default:
      return "amber";
  }
}

function apptTone(status: string): "emerald" | "blue" | "amber" | "rose" | "neutral" {
  switch (status) {
    case "confirmed":
      return "blue";
    case "completed":
      return "emerald";
    case "canceled":
    case "no_show":
      return "rose";
    default:
      return "neutral";
  }
}

export function AdminInterviewsClient({
  actorEmployeeId,
  canCreate,
  canEdit,
  canManage,
}: {
  actorEmail: string;
  actorEmployeeId: string;
  canCreate: boolean;
  canEdit: boolean;
  canManage: boolean;
}) {
  const [activeTab, setActiveTab] = useState<
    "scheduled" | "invitations" | "availability" | "templates"
  >("scheduled");
  const [scheduleView, setScheduleView] = useState<"list" | "calendar">("list");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [invitations, setInvitations] = useState<SafeInterviewInvitation[]>([]);
  const [appointments, setAppointments] = useState<InterviewAppointmentRecord[]>([]);
  const [activity, setActivity] = useState<InterviewActivityRecord[]>([]);
  const [statistics, setStatistics] = useState<InterviewStatistics>({
    invitationsSent: 0,
    awaitingScheduling: 0,
    interviewsScheduled: 0,
    interviewsToday: 0,
    upcomingInterviews: 0,
    canceledInterviews: 0,
    completedInterviews: 0,
  });
  const [interviewers, setInterviewers] = useState<InterviewerOption[]>([]);
  const [resendConfigured, setResendConfigured] = useState(true);
  const [calendarStatus, setCalendarStatus] = useState<{
    provider: string;
    connected: boolean;
    message: string;
  } | null>(null);

  // Availability editor state
  const [selectedEmpId, setSelectedEmpId] = useState(actorEmployeeId);
  const [availTz, setAvailTz] = useState("Europe/Istanbul");
  const [slotDuration, setSlotDuration] = useState<InterviewDuration>(45);
  const [minNoticeHours, setMinNoticeHours] = useState(12);
  const [bufferBefore, setBufferBefore] = useState(10);
  const [bufferAfter, setBufferAfter] = useState(10);
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(21);
  const [dayWindows, setDayWindows] = useState<
    Array<{ dayOfWeek: number; enabled: boolean; start: string; end: string }>
  >(() =>
    DAY_NAMES.map((_, i) => ({
      dayOfWeek: i,
      enabled: i >= 1 && i <= 5,
      start: "09:00",
      end: "17:00",
    }))
  );
  const [exceptions, setExceptions] = useState<InterviewerAvailabilityException[]>([]);
  const [newExcDate, setNewExcDate] = useState("");
  const [newExcReason, setNewExcReason] = useState("");
  const [savingAvail, setSavingAvail] = useState(false);

  // Email preview studio state
  const [previewKind, setPreviewKind] = useState<InterviewTemplateKind>("invitation");
  const [previewLocale, setPreviewLocale] = useState<"en" | "ar">("en");
  const [previewViewport, setPreviewViewport] = useState<"desktop" | "mobile">("desktop");
  const [previewMode, setPreviewMode] = useState<"html" | "text">("html");
  const [previewTemplate, setPreviewTemplate] = useState<{
    from: string;
    replyTo: string;
    subject: string;
    html: string;
    text: string;
  } | null>(null);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/interviews", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to load interviews.");
        return;
      }
      setInvitations(data.invitations || []);
      setAppointments(data.appointments || []);
      setActivity(data.activity || []);
      if (data.statistics) setStatistics(data.statistics);
      setInterviewers(data.interviewers || []);
      setResendConfigured(Boolean(data.resendConfigured));
      setCalendarStatus(data.externalCalendar || null);
      if (!selectedEmpId && data.interviewers?.length > 0) {
        setSelectedEmpId(actorEmployeeId || data.interviewers[0].id);
      }
    } catch {
      setError("Network error while loading interviews workspace.");
    } finally {
      setLoading(false);
    }
  }, [actorEmployeeId, selectedEmpId]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const loadAvailability = useCallback(async (empId: string) => {
    if (!empId) return;
    try {
      const res = await fetch(
        `/api/admin/interviews/availability?employeeId=${encodeURIComponent(empId)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok) return;
      const rules: InterviewerAvailabilityRule[] = data.rules || [];
      setExceptions(data.exceptions || []);
      if (rules.length > 0) {
        setAvailTz(rules[0].timezone || "UTC");
        setSlotDuration(rules[0].slotDurationMinutes || 45);
        setMinNoticeHours(rules[0].minNoticeHours ?? 12);
        setBufferBefore(rules[0].bufferBeforeMinutes ?? 10);
        setBufferAfter(rules[0].bufferAfterMinutes ?? 10);
        setMaxAdvanceDays(rules[0].maxAdvanceDays ?? 21);
        const byDay = new Map<number, InterviewerAvailabilityRule>();
        for (const r of rules) {
          if (r.isActive) byDay.set(r.dayOfWeek, r);
        }
        setDayWindows(
          DAY_NAMES.map((_, i) => {
            const existing = byDay.get(i);
            return existing
              ? {
                  dayOfWeek: i,
                  enabled: true,
                  start: minutesToTimeInput(existing.startMinute),
                  end: minutesToTimeInput(existing.endMinute),
                }
              : { dayOfWeek: i, enabled: false, start: "09:00", end: "17:00" };
          })
        );
      } else {
        setDayWindows(
          DAY_NAMES.map((_, i) => ({
            dayOfWeek: i,
            enabled: i >= 1 && i <= 5,
            start: "09:00",
            end: "17:00",
          }))
        );
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (activeTab === "availability" && selectedEmpId) {
      void loadAvailability(selectedEmpId);
    }
  }, [activeTab, selectedEmpId, loadAvailability]);

  const loadPreviewTemplate = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/interviews/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: previewKind, locale: previewLocale }),
      });
      const data = await res.json();
      if (res.ok && data.template) {
        setPreviewTemplate(data.template);
      }
    } catch {
      setError("Unable to load email template preview right now.");
    }
  }, [previewKind, previewLocale]);

  useEffect(() => {
    if (activeTab === "templates") {
      void loadPreviewTemplate();
    }
  }, [activeTab, loadPreviewTemplate]);

  const handleSaveAvailability = async () => {
    if (!selectedEmpId) return;
    setSavingAvail(true);
    setNotice(null);
    setError(null);
    try {
      const weeklyWindows = dayWindows
        .filter((d) => d.enabled)
        .map((d) => ({
          dayOfWeek: d.dayOfWeek,
          startMinute: timeInputToMinutes(d.start),
          endMinute: timeInputToMinutes(d.end),
          isActive: true,
        }));
      const res = await fetch("/api/admin/interviews/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmpId,
          timezone: availTz,
          slotDurationMinutes: slotDuration,
          minNoticeHours,
          bufferBeforeMinutes: bufferBefore,
          bufferAfterMinutes: bufferAfter,
          maxAdvanceDays,
          weeklyWindows,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save availability.");
        return;
      }
      setNotice("Interviewer availability saved successfully.");
      await loadWorkspace();
    } catch {
      setError("Network error while saving availability.");
    } finally {
      setSavingAvail(false);
    }
  };

  const handleAddException = async () => {
    if (!selectedEmpId || !newExcDate) return;
    try {
      const res = await fetch("/api/admin/interviews/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmpId,
          exceptionDate: newExcDate,
          isUnavailable: true,
          reason: newExcReason || "Blocked / Holiday",
        }),
      });
      if (res.ok) {
        setNewExcDate("");
        setNewExcReason("");
        await loadAvailability(selectedEmpId);
      }
    } catch {
      setError("Network error while adding blocked date.");
    }
  };

  const handleDeleteException = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/interviews/availability?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) await loadAvailability(selectedEmpId);
    } catch {
      setError("Network error while removing blocked date.");
    }
  };

  const handleInvitationAction = async (
    id: string,
    action: "resend_invitation" | "revoke_invitation"
  ) => {
    setNotice(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/interviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Action failed.");
        return;
      }
      setNotice(
        action === "resend_invitation"
          ? "Fresh scheduling link generated and resent."
          : "Invitation link revoked."
      );
      await loadWorkspace();
    } catch {
      setError("Network error while updating invitation.");
    }
  };

  const handleAppointmentUpdate = async (
    id: string,
    payload: {
      action: "cancel" | "update_outcome";
      status?: "completed" | "no_show";
      outcome?: InterviewOutcome;
      reason?: string;
    }
  ) => {
    setNotice(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/interviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update appointment.");
        return;
      }
      setNotice("Interview appointment updated.");
      await loadWorkspace();
    } catch {
      setError("Network error while updating appointment.");
    }
  };

  const handleDispatchReminders = async () => {
    setNotice(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/interviews/reminders/dispatch", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to dispatch reminders.");
        return;
      }
      setNotice(
        `Reminder dispatcher completed: ${data.sent} sent, ${data.canceled} skipped/canceled, ${data.failed} failed.`
      );
    } catch {
      setError("Network error while running reminder dispatch.");
    }
  };

  const groupedByDate = useMemo(() => {
    const map = new Map<string, InterviewAppointmentRecord[]>();
    for (const appt of appointments) {
      const key = appt.scheduledStartUtc.slice(0, 10);
      const list = map.get(key) || [];
      list.push(appt);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [appointments]);

  return (
    <div className="hz-int-page">
      <PageHeader
        eyebrow="HIRZEXA TALENT ACQUISITION"
        title="Interview Scheduling"
        description="Coordinate candidate self-service scheduling, interviewer availability windows, automated reminders, and official HIRZEXA recruitment emails."
        actions={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {canManage ? (
              <button
                type="button"
                className="hz-btn hz-btn-secondary"
                onClick={handleDispatchReminders}
              >
                <Clock size={14} /> Run Reminder Dispatch
              </button>
            ) : null}
            <Link href="/admin/applications" className="hz-btn hz-btn-primary">
              <Plus size={14} /> Invite from Applications
            </Link>
          </div>
        }
      />

      {!resendConfigured ? (
        <div className="hz-int-banner is-warn">
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            <strong>RESEND_API_KEY is not configured</strong> on this server. Secure scheduling
            links still work, but outbound emails will report <code>delivery_failed</code> until
            Resend is configured.
          </span>
        </div>
      ) : null}

      {error ? <div className="hz-int-banner is-error">{error}</div> : null}
      {notice ? <div className="hz-int-banner is-success">{notice}</div> : null}

      {/* Executive KPI Strip */}
      <div className="hz-int-kpi-grid">
        <MetricCard
          label="Invitations Sent"
          value={statistics.invitationsSent}
          sublabel="All authorized invites"
          icon={<Mail size={15} />}
          tone="blue"
        />
        <MetricCard
          label="Awaiting Selection"
          value={statistics.awaitingScheduling}
          sublabel="Pending candidate slot"
          icon={<Clock size={15} />}
          tone="amber"
        />
        <MetricCard
          label="Upcoming Confirmed"
          value={statistics.upcomingInterviews}
          sublabel={`${statistics.interviewsToday} scheduled today`}
          icon={<Calendar size={15} />}
          tone="emerald"
        />
        <MetricCard
          label="Completed"
          value={statistics.completedInterviews}
          sublabel="Evaluated sessions"
          icon={<CheckCircle2 size={15} />}
          tone="blue"
        />
        <MetricCard
          label="Canceled"
          value={statistics.canceledInterviews}
          sublabel="Reminders auto-stopped"
          icon={<XCircle size={15} />}
          tone="neutral"
        />
      </div>

      {/* Workspace Navigation Tabs */}
      <div className="hz-int-tabs-bar">
        <div className="hz-int-tabs">
          <button
            type="button"
            className={`hz-int-tab ${activeTab === "scheduled" ? "is-active" : ""}`}
            onClick={() => setActiveTab("scheduled")}
          >
            <Calendar size={14} />
            Scheduled
            <span className="hz-int-tab-count">{appointments.length}</span>
          </button>
          <button
            type="button"
            className={`hz-int-tab ${activeTab === "invitations" ? "is-active" : ""}`}
            onClick={() => setActiveTab("invitations")}
          >
            <Mail size={14} />
            Invitations
            <span className="hz-int-tab-count">{invitations.length}</span>
          </button>
          <button
            type="button"
            className={`hz-int-tab ${activeTab === "availability" ? "is-active" : ""}`}
            onClick={() => setActiveTab("availability")}
          >
            <Users size={14} />
            Interviewer Availability
          </button>
          <button
            type="button"
            className={`hz-int-tab ${activeTab === "templates" ? "is-active" : ""}`}
            onClick={() => setActiveTab("templates")}
          >
            <Eye size={14} />
            Email Templates &amp; Preview
          </button>
        </div>

        <button
          type="button"
          className="hz-btn hz-btn-secondary hz-btn-sm"
          onClick={loadWorkspace}
        >
          <RefreshCw size={13} /> {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* TAB 1: SCHEDULED INTERVIEWS */}
      {activeTab === "scheduled" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="hz-int-card">
            <div className="hz-int-card-head">
              <div>
                <h2 className="hz-int-card-title">Confirmed &amp; Historical Interviews</h2>
                <p className="hz-int-card-sub">
                  Real candidate bookings synchronized with interviewer availability and automated
                  24h/1h reminders.
                </p>
              </div>
              <div className="hz-int-segment">
                <button
                  type="button"
                  className={scheduleView === "list" ? "is-active" : ""}
                  onClick={() => setScheduleView("list")}
                >
                  <List size={13} /> List
                </button>
                <button
                  type="button"
                  className={scheduleView === "calendar" ? "is-active" : ""}
                  onClick={() => setScheduleView("calendar")}
                >
                  <CalendarDays size={13} /> By Date
                </button>
              </div>
            </div>

            {appointments.length === 0 ? (
              <EmptyState
                icon={<Calendar size={20} />}
                title="No scheduled interviews yet"
                description="Configure interviewer working hours in the Availability tab, then click 'Invite' on any candidate in Recruitment Applications."
              />
            ) : scheduleView === "list" ? (
              <div className="hz-table-wrap">
                <table className="hz-table">
                  <thead>
                    <tr>
                      <th>Candidate &amp; Role</th>
                      <th>Date &amp; Time</th>
                      <th>Interviewer</th>
                      <th>Format</th>
                      <th>Status &amp; Outcome</th>
                      <th style={{ textAlign: "end" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((appt) => {
                      const fmt = formatUtcInTimezone(
                        appt.scheduledStartUtc,
                        appt.interviewerTimezone,
                        "en"
                      );
                      return (
                        <tr key={appt.id}>
                          <td>
                            <div style={{ fontWeight: 650, color: "var(--hz-text-strong)" }}>
                              {appt.candidateName}
                            </div>
                            <div style={{ fontSize: 12, color: "var(--hz-text-secondary)" }}>
                              {appt.positionTitle}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "var(--hz-text-muted)",
                                fontFamily: "monospace",
                              }}
                            >
                              {appt.applicationReferenceId}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: "var(--hz-text-strong)" }}>
                              {fmt.dateLabel}
                            </div>
                            <div style={{ fontSize: 12, color: "var(--hz-text-secondary)" }}>
                              {fmt.timeLabel} ({appt.interviewerTimezone}) · {appt.durationMinutes}m
                            </div>
                          </td>
                          <td>{appt.interviewerName}</td>
                          <td>
                            <div>{INTERVIEW_FORMAT_LABELS[appt.interviewFormat]?.en}</div>
                            {appt.meetingUrl ? (
                              <a
                                href={appt.meetingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: 12, color: "#60a5fa" }}
                              >
                                Join Meeting Link
                              </a>
                            ) : null}
                          </td>
                          <td>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              <StatusBadge tone={apptTone(appt.status)} dot>
                                {appt.status}
                              </StatusBadge>
                              <span style={{ fontSize: 11.5, color: "var(--hz-text-muted)" }}>
                                Outcome: {appt.outcome}
                              </span>
                            </div>
                          </td>
                          <td style={{ textAlign: "end" }}>
                            {appt.status === "confirmed" ? (
                              <div className="hz-int-action-row">
                                <button
                                  type="button"
                                  className="hz-btn hz-btn-secondary hz-btn-sm"
                                  onClick={() =>
                                    handleAppointmentUpdate(appt.id, {
                                      action: "update_outcome",
                                      status: "completed",
                                      outcome: "advance",
                                    })
                                  }
                                >
                                  Complete
                                </button>
                                <button
                                  type="button"
                                  className="hz-btn hz-btn-secondary hz-btn-sm"
                                  onClick={() =>
                                    handleAppointmentUpdate(appt.id, {
                                      action: "update_outcome",
                                      status: "no_show",
                                    })
                                  }
                                >
                                  No-Show
                                </button>
                                {canEdit ? (
                                  <button
                                    type="button"
                                    className="hz-btn hz-btn-secondary hz-btn-sm"
                                    style={{ color: "#fda4af" }}
                                    onClick={() =>
                                      handleAppointmentUpdate(appt.id, {
                                        action: "cancel",
                                        reason: "Canceled by hiring team",
                                      })
                                    }
                                  >
                                    Cancel
                                  </button>
                                ) : null}
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {groupedByDate.map(([dateKey, list]) => (
                  <div key={dateKey} className="hz-int-cal-group">
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "#93c5fd",
                      }}
                    >
                      {dateKey} · {list.length} interview{list.length === 1 ? "" : "s"}
                    </div>
                    <div className="hz-int-cal-grid">
                      {list.map((appt) => {
                        const fmt = formatUtcInTimezone(
                          appt.scheduledStartUtc,
                          appt.interviewerTimezone,
                          "en"
                        );
                        return (
                          <div key={appt.id} className="hz-int-cal-card">
                            <div>
                              <div style={{ fontWeight: 700, color: "var(--hz-text-strong)" }}>
                                {appt.candidateName}
                              </div>
                              <div style={{ fontSize: 12, color: "var(--hz-text-secondary)" }}>
                                {appt.positionTitle}
                              </div>
                              <div style={{ fontSize: 12.5, color: "#93c5fd", marginTop: 6 }}>
                                {fmt.timeLabel} ({appt.interviewerTimezone}) · {appt.durationMinutes} min
                              </div>
                              <div
                                style={{
                                  fontSize: 11.5,
                                  color: "var(--hz-text-muted)",
                                  marginTop: 2,
                                }}
                              >
                                {appt.interviewerName} ·{" "}
                                {INTERVIEW_TYPE_LABELS[appt.interviewType]?.en}
                              </div>
                            </div>
                            <StatusBadge tone={apptTone(appt.status)} dot>
                              {appt.status}
                            </StatusBadge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {activity.length > 0 ? (
            <div className="hz-int-card">
              <div className="hz-int-card-head" style={{ marginBottom: 8 }}>
                <h3 className="hz-int-card-title">Recent Scheduling Activity</h3>
              </div>
              {activity.slice(0, 8).map((ev) => (
                <div key={ev.id} className="hz-int-activity-row">
                  <div>
                    <span
                      style={{
                        fontFamily: "monospace",
                        color: "#93c5fd",
                        marginInlineEnd: 10,
                        fontWeight: 600,
                      }}
                    >
                      {ev.applicationReferenceId}
                    </span>
                    <span style={{ color: "var(--hz-text)" }}>{ev.summary}</span>
                  </div>
                  <span style={{ fontSize: 11.5, color: "var(--hz-text-muted)", flexShrink: 0 }}>
                    {ev.createdAt.slice(0, 16).replace("T", " ")} UTC
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* TAB 2: INVITATIONS */}
      {activeTab === "invitations" ? (
        <div className="hz-int-card">
          <div className="hz-int-card-head">
            <div>
              <h2 className="hz-int-card-title">Interview Invitations</h2>
              <p className="hz-int-card-sub">
                Track real Resend email delivery state, token expiration, and manage active
                candidate scheduling links.
              </p>
            </div>
          </div>

          {invitations.length === 0 ? (
            <EmptyState
              icon={<Mail size={20} />}
              title="No interview invitations sent"
              description="Open Recruitment Applications and click 'Invite' on any candidate to configure, preview, and send an official HIRZEXA invitation."
            />
          ) : (
            <div className="hz-table-wrap">
              <table className="hz-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Stage &amp; Interviewer</th>
                    <th>Status</th>
                    <th>Email Delivery</th>
                    <th>Expires</th>
                    <th style={{ textAlign: "end" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((inv) => (
                    <tr key={inv.id}>
                      <td>
                        <div style={{ fontWeight: 650, color: "var(--hz-text-strong)" }}>
                          {inv.candidateName}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--hz-text-secondary)" }}>
                          {inv.candidateEmail}
                        </div>
                        <div style={{ fontSize: 11.5, color: "var(--hz-text-muted)" }}>
                          {inv.positionTitle} ({inv.applicationReferenceId})
                        </div>
                      </td>
                      <td>
                        <div>
                          {INTERVIEW_TYPE_LABELS[inv.interviewType]?.en} ({inv.durationMinutes}m)
                        </div>
                        <div style={{ fontSize: 12, color: "var(--hz-text-secondary)" }}>
                          {inv.interviewerName}
                        </div>
                      </td>
                      <td>
                        <StatusBadge
                          dot
                          tone={
                            inv.status === "scheduled"
                              ? "emerald"
                              : inv.status === "sent"
                                ? "blue"
                                : inv.status === "revoked" || inv.status === "expired"
                                  ? "rose"
                                  : "amber"
                          }
                        >
                          {inv.status}
                        </StatusBadge>
                      </td>
                      <td>
                        <StatusBadge tone={deliveryTone(inv.emailDeliveryStatus)}>
                          {inv.emailDeliveryStatus}
                        </StatusBadge>
                        {inv.deliveryError ? (
                          <div style={{ fontSize: 11, color: "#fcd34d", marginTop: 4 }}>
                            {inv.deliveryError}
                          </div>
                        ) : null}
                      </td>
                      <td style={{ color: "var(--hz-text-secondary)" }}>
                        {inv.expiresAt.slice(0, 10)}
                      </td>
                      <td style={{ textAlign: "end" }}>
                        {canEdit && inv.status !== "scheduled" && inv.status !== "revoked" ? (
                          <div className="hz-int-action-row">
                            <button
                              type="button"
                              className="hz-btn hz-btn-secondary hz-btn-sm"
                              onClick={() => handleInvitationAction(inv.id, "resend_invitation")}
                            >
                              Resend Link
                            </button>
                            <button
                              type="button"
                              className="hz-btn hz-btn-secondary hz-btn-sm"
                              style={{ color: "#fda4af" }}
                              onClick={() => handleInvitationAction(inv.id, "revoke_invitation")}
                            >
                              Revoke
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {/* TAB 3: INTERVIEWER AVAILABILITY */}
      {activeTab === "availability" ? (
        <div className="hz-int-split">
          <div className="hz-int-card">
            <div className="hz-int-card-head">
              <div>
                <h2 className="hz-int-card-title">Weekly Interview Availability</h2>
                <p className="hz-int-card-sub">
                  Candidate time slots are generated strictly from configured working hours below.
                </p>
              </div>
              {canManage && interviewers.length > 0 ? (
                <div className="hz-int-field" style={{ minWidth: 230 }}>
                  <select
                    aria-label="Select Interviewer"
                    value={selectedEmpId}
                    onChange={(e) => setSelectedEmpId(e.target.value)}
                  >
                    {interviewers.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName} ({emp.roleKey})
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>

            <div className="hz-int-form-grid-3">
              <div className="hz-int-field">
                <label>Time Zone (IANA)</label>
                <select value={availTz} onChange={(e) => setAvailTz(e.target.value)}>
                  {COMMON_IANA_TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
              <div className="hz-int-field">
                <label>Default Duration</label>
                <select
                  value={slotDuration}
                  onChange={(e) => setSlotDuration(Number(e.target.value) as InterviewDuration)}
                >
                  {INTERVIEW_DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d} minutes
                    </option>
                  ))}
                </select>
              </div>
              <div className="hz-int-field">
                <label>Min Notice (hours)</label>
                <input
                  type="number"
                  min={0}
                  max={168}
                  value={minNoticeHours}
                  onChange={(e) => setMinNoticeHours(Number(e.target.value))}
                />
              </div>
              <div className="hz-int-field">
                <label>Buffer Before (min)</label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={bufferBefore}
                  onChange={(e) => setBufferBefore(Number(e.target.value))}
                />
              </div>
              <div className="hz-int-field">
                <label>Buffer After (min)</label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={bufferAfter}
                  onChange={(e) => setBufferAfter(Number(e.target.value))}
                />
              </div>
              <div className="hz-int-field">
                <label>Max Advance Window (days)</label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={maxAdvanceDays}
                  onChange={(e) => setMaxAdvanceDays(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="hz-int-day-list">
              {dayWindows.map((w, idx) => (
                <div
                  key={w.dayOfWeek}
                  className={`hz-int-day-row ${w.enabled ? "is-enabled" : ""}`}
                >
                  <label className="hz-int-day-toggle">
                    <input
                      type="checkbox"
                      checked={w.enabled}
                      onChange={(e) =>
                        setDayWindows((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, enabled: e.target.checked } : item
                          )
                        )
                      }
                    />
                    {DAY_NAMES[w.dayOfWeek]}
                  </label>
                  {w.enabled ? (
                    <div className="hz-int-time-range">
                      <input
                        type="time"
                        value={w.start}
                        onChange={(e) =>
                          setDayWindows((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, start: e.target.value } : item
                            )
                          )
                        }
                      />
                      <span style={{ color: "var(--hz-text-muted)", fontSize: 12 }}>to</span>
                      <input
                        type="time"
                        value={w.end}
                        onChange={(e) =>
                          setDayWindows((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, end: e.target.value } : item
                            )
                          )
                        }
                      />
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--hz-text-muted)" }}>Unavailable</span>
                  )}
                </div>
              ))}
            </div>

            <div style={{ marginTop: 18 }}>
              <button
                type="button"
                className="hz-btn hz-btn-primary"
                disabled={savingAvail || !selectedEmpId}
                onClick={handleSaveAvailability}
              >
                {savingAvail ? "Saving Availability…" : "Save Interviewer Availability"}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="hz-int-card">
              <h3 className="hz-int-card-title" style={{ marginBottom: 4 }}>
                Date Blocks &amp; Holidays
              </h3>
              <p className="hz-int-card-sub" style={{ marginBottom: 14 }}>
                Override recurring hours for vacations, public holidays, or focus days.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="hz-int-field">
                  <label>Blocked Date</label>
                  <input
                    type="date"
                    value={newExcDate}
                    onChange={(e) => setNewExcDate(e.target.value)}
                  />
                </div>
                <div className="hz-int-field">
                  <label>Reason</label>
                  <input
                    type="text"
                    value={newExcReason}
                    onChange={(e) => setNewExcReason(e.target.value)}
                    placeholder="e.g., Public Holiday, Out of Office"
                  />
                </div>
                <button
                  type="button"
                  className="hz-btn hz-btn-secondary"
                  disabled={!newExcDate}
                  onClick={handleAddException}
                >
                  Block Selected Date
                </button>
              </div>

              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                {exceptions.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 12, color: "var(--hz-text-muted)" }}>
                    No blocked dates configured.
                  </p>
                ) : (
                  exceptions.map((ex) => (
                    <div key={ex.id} className="hz-int-exc-row">
                      <div>
                        <div style={{ fontWeight: 650, color: "var(--hz-text-strong)" }}>
                          {ex.exceptionDate}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--hz-text-secondary)" }}>
                          {ex.reason || "Unavailable"}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="hz-icon-btn"
                        onClick={() => handleDeleteException(ex.id)}
                        aria-label="Remove blocked date"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="hz-int-card">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <h3 className="hz-int-card-title">External Calendar Sync</h3>
                <StatusBadge tone={calendarStatus?.connected ? "emerald" : "neutral"} dot>
                  {calendarStatus?.connected ? "Connected" : "Not Connected"}
                </StatusBadge>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 12.5,
                  lineHeight: 1.6,
                  color: "var(--hz-text-secondary)",
                }}
              >
                {calendarStatus?.message ||
                  "Google Calendar OAuth sync is optional and currently not connected. Native availability rules and .ics calendar invites are active."}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* TAB 4: EMAIL TEMPLATES & CONTROLLED TEST STUDIO */}
      {activeTab === "templates" ? (
        <div className="hz-int-split-studio">
          <div className="hz-int-card" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <h2 className="hz-int-card-title">Official HIRZEXA Email Suite</h2>
              <p className="hz-int-card-sub">
                Inspect all 6 bilingual candidate templates before sending.
              </p>
            </div>

            <div className="hz-int-template-list">
              {TEMPLATE_OPTIONS.map((opt) => (
                <button
                  key={opt.kind}
                  type="button"
                  className={`hz-int-template-btn ${previewKind === opt.kind ? "is-active" : ""}`}
                  onClick={() => setPreviewKind(opt.kind)}
                >
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>

            <div style={{ borderTop: "1px solid var(--hz-border-subtle)", paddingTop: 14 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--hz-text-muted)",
                  marginBottom: 8,
                }}
              >
                Template Language
              </div>
              <div className="hz-int-segment" style={{ width: "100%" }}>
                <button
                  type="button"
                  style={{ flex: 1, justifyContent: "center" }}
                  className={previewLocale === "en" ? "is-active" : ""}
                  onClick={() => setPreviewLocale("en")}
                >
                  English (LTR)
                </button>
                <button
                  type="button"
                  style={{ flex: 1, justifyContent: "center" }}
                  className={previewLocale === "ar" ? "is-active" : ""}
                  onClick={() => setPreviewLocale("ar")}
                >
                  العربية (RTL)
                </button>
              </div>
            </div>

            {canCreate ? (
              <div
                style={{
                  borderTop: "1px solid var(--hz-border-subtle)",
                  paddingTop: 14,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--hz-text-muted)",
                  }}
                >
                  Strict Preview Isolation
                </div>
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: "var(--hz-text-secondary)" }}>
                  Previews contain placeholder fields and are blocked from outbound email delivery.
                  To send a real invitation with a cryptographically signed scheduling link via
                  Resend, invite a candidate from Recruitment Applications.
                </p>
                <Link href="/admin/applications" className="hz-btn hz-btn-primary">
                  <Plus size={14} /> Send Real Invitation
                </Link>
              </div>
            ) : null}
          </div>

          <div className="hz-int-card">
            <div className="hz-int-card-head">
              <div className="hz-int-segment">
                <button
                  type="button"
                  className={previewViewport === "desktop" ? "is-active" : ""}
                  onClick={() => setPreviewViewport("desktop")}
                >
                  <Monitor size={13} /> Desktop
                </button>
                <button
                  type="button"
                  className={previewViewport === "mobile" ? "is-active" : ""}
                  onClick={() => setPreviewViewport("mobile")}
                >
                  <Smartphone size={13} /> Mobile
                </button>
              </div>

              <div className="hz-int-segment">
                <button
                  type="button"
                  className={previewMode === "html" ? "is-active" : ""}
                  onClick={() => setPreviewMode("html")}
                >
                  HTML Preview
                </button>
                <button
                  type="button"
                  className={previewMode === "text" ? "is-active" : ""}
                  onClick={() => setPreviewMode("text")}
                >
                  Plain Text
                </button>
              </div>
            </div>

            {previewTemplate ? (
              <>
                <div className="hz-int-email-meta">
                  <span className="hz-int-email-meta-label">From</span>
                  <span className="hz-int-email-meta-val">{previewTemplate.from}</span>
                  <span className="hz-int-email-meta-label">Reply-To</span>
                  <span className="hz-int-email-meta-val">{previewTemplate.replyTo}</span>
                  <span className="hz-int-email-meta-label">Subject</span>
                  <span className="hz-int-email-meta-val" style={{ fontWeight: 700 }}>
                    {previewTemplate.subject}
                  </span>
                </div>

                {previewMode === "html" ? (
                  <div className="hz-int-preview-stage">
                    <iframe
                      title="HIRZEXA Recruitment Template Preview"
                      srcDoc={previewTemplate.html}
                      className={`hz-int-preview-frame ${
                        previewViewport === "mobile" ? "is-mobile" : ""
                      }`}
                    />
                  </div>
                ) : (
                  <pre className="hz-int-preview-plain">{previewTemplate.text}</pre>
                )}
              </>
            ) : (
              <div style={{ padding: 40, textAlign: "center", color: "var(--hz-text-secondary)" }}>
                Rendering official HIRZEXA email template…
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
