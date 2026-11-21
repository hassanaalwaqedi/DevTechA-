"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Globe,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  User,
  Video,
  XCircle,
} from "lucide-react";
import {
  COMMON_IANA_TIMEZONES,
  INTERVIEW_FORMAT_LABELS,
  INTERVIEW_TYPE_LABELS,
  formatUtcInTimezone,
  type AvailableInterviewSlot,
  type InterviewFormat,
  type InterviewType,
} from "@/lib/interviews/types";

interface PublicInvitationView {
  id: string;
  candidateName: string;
  positionTitle: string;
  interviewStage: string;
  interviewType: InterviewType;
  interviewFormat: InterviewFormat;
  durationMinutes: number;
  interviewerName: string;
  interviewerTimezone: string;
  personalizedMessage: string;
  locale: "en" | "ar";
  expiresAt: string;
}

interface PublicAppointmentView {
  id: string;
  scheduledStartUtc: string;
  scheduledEndUtc: string;
  candidateTimezone: string;
  meetingUrl?: string | null;
  locationDetails?: string | null;
  status: string;
  rescheduleCount: number;
}

type PublicPayload =
  | { state: "loading" }
  | { state: "invalid" }
  | { state: "revoked"; positionTitle: string; locale: "en" | "ar" }
  | { state: "expired"; positionTitle: string; locale: "en" | "ar" }
  | { state: "canceled"; positionTitle: string; locale: "en" | "ar" }
  | {
      state: "open";
      invitation: PublicInvitationView;
      availableSlots: AvailableInterviewSlot[];
      hasConfiguredAvailability: boolean;
    }
  | {
      state: "scheduled";
      invitation: PublicInvitationView;
      appointment: PublicAppointmentView;
      calendarLinks: { googleUrl: string; outlookUrl: string };
      availableSlots: AvailableInterviewSlot[];
    };

function detectBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function formatDateButtonLabel(dateKey: string, locale: "en" | "ar") {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const loc = locale === "ar" ? "ar-SA" : "en-US";
  return {
    weekday: new Intl.DateTimeFormat(loc, { weekday: "short", timeZone: "UTC" }).format(dt),
    day: new Intl.DateTimeFormat(loc, { day: "numeric", timeZone: "UTC" }).format(dt),
    month: new Intl.DateTimeFormat(loc, { month: "short", timeZone: "UTC" }).format(dt),
  };
}

export function CandidateSchedulerClient({ token }: { token: string }) {
  const [locale, setLocale] = useState<"en" | "ar">("en");
  const [timezone, setTimezone] = useState<string>("UTC");
  const [payload, setPayload] = useState<PublicPayload>({ state: "loading" });
  const [selectedDateKey, setSelectedDateKey] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<AvailableInterviewSlot | null>(null);
  const [rescheduleMode, setRescheduleMode] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const isAr = locale === "ar";

  useEffect(() => {
    setTimezone(detectBrowserTimezone());
  }, []);

  const timezoneOptions = useMemo(() => {
    const list = new Set<string>(COMMON_IANA_TIMEZONES);
    if (timezone) list.add(timezone);
    return Array.from(list);
  }, [timezone]);

  const fetchSchedule = useCallback(
    async (tz: string) => {
      if (!token) {
        setPayload({ state: "invalid" });
        return;
      }
      setErrorBanner(null);
      try {
        const res = await fetch(
          `/api/interviews/public?token=${encodeURIComponent(token)}&timezone=${encodeURIComponent(tz)}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (!res.ok || data.state === "invalid") {
          setPayload({ state: "invalid" });
          return;
        }
        setPayload(data as PublicPayload);
        if (data.invitation?.locale) {
          setLocale(data.invitation.locale === "ar" ? "ar" : "en");
        } else if (data.locale) {
          setLocale(data.locale === "ar" ? "ar" : "en");
        }
      } catch {
        setErrorBanner(
          isAr
            ? "تعذر تحميل بيانات الجدولة حاليًا. يرجى المحاولة مرة أخرى."
            : "Unable to load scheduling details right now. Please refresh and try again."
        );
      }
    },
    [token, isAr]
  );

  useEffect(() => {
    if (timezone) {
      void fetchSchedule(timezone);
    }
  }, [timezone, fetchSchedule]);

  const slots = useMemo(() => {
    if (payload.state === "open" || payload.state === "scheduled") {
      return payload.availableSlots;
    }
    return [];
  }, [payload]);

  const datesWithSlots = useMemo(() => {
    const map = new Map<string, AvailableInterviewSlot[]>();
    for (const s of slots) {
      const list = map.get(s.dateKeyCandidate) || [];
      list.push(s);
      map.set(s.dateKeyCandidate, list);
    }
    return map;
  }, [slots]);

  const sortedDateKeys = useMemo(
    () => Array.from(datesWithSlots.keys()).sort(),
    [datesWithSlots]
  );

  useEffect(() => {
    if (sortedDateKeys.length > 0 && !datesWithSlots.has(selectedDateKey)) {
      setSelectedDateKey(sortedDateKeys[0]);
      setSelectedSlot(null);
    }
  }, [sortedDateKeys, datesWithSlots, selectedDateKey]);

  const activeDaySlots = selectedDateKey ? datesWithSlots.get(selectedDateKey) || [] : [];

  const handleConfirmBooking = async () => {
    if (!selectedSlot) return;
    setSubmitting(true);
    setErrorBanner(null);
    try {
      const endpoint = rescheduleMode
        ? "/api/interviews/public/reschedule"
        : "/api/interviews/public";
      const bodyPayload = rescheduleMode
        ? {
            token,
            newSlotStartUtc: selectedSlot.startUtc,
            candidateTimezone: timezone,
          }
        : {
            token,
            slotStartUtc: selectedSlot.startUtc,
            candidateTimezone: timezone,
          };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorBanner(
          data.error ||
            (isAr
              ? "تعذر تأكيد هذا الموعد. يرجى اختيار وقت آخر."
              : "Could not confirm that slot. Please choose another available time.")
        );
        await fetchSchedule(timezone);
        return;
      }
      setRescheduleMode(false);
      setSelectedSlot(null);
      await fetchSchedule(timezone);
    } catch {
      setErrorBanner(
        isAr ? "حدث خطأ في الاتصال. حاول مجددًا." : "Network error while confirming. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelAppointment = async () => {
    setSubmitting(true);
    setErrorBanner(null);
    try {
      const res = await fetch("/api/interviews/public/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, reason: cancelReason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorBanner(data.error || "Failed to cancel appointment.");
        return;
      }
      const posTitle =
        payload.state === "scheduled" ? payload.invitation.positionTitle : "HIRZEXA Interview";
      setCancelConfirmOpen(false);
      setPayload({ state: "canceled", positionTitle: posTitle, locale });
    } catch {
      setErrorBanner(isAr ? "حدث خطأ أثناء الإلغاء." : "Unable to cancel right now.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatIcon = (fmt: InterviewFormat) => {
    if (fmt === "online_video") return <Video size={16} />;
    if (fmt === "phone") return <Phone size={16} />;
    return <MapPin size={16} />;
  };

  return (
    <div dir={isAr ? "rtl" : "ltr"} className="hz-cand-shell">
      <header className="hz-cand-header">
        <div className="hz-cand-header-inner">
          <div className="hz-cand-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/hirzexa-mark.png" alt="HIRZEXA" className="hz-cand-logo" />
            <div>
              <div className="hz-cand-brand-name">HIRZEXA</div>
              <div className="hz-cand-brand-sub">
                {isAr ? "استقطاب الكفاءات" : "Talent Acquisition"}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="hz-cand-lang-btn"
            onClick={() => setLocale(isAr ? "en" : "ar")}
          >
            <Globe size={14} />
            {isAr ? "English" : "العربية"}
          </button>
        </div>
      </header>

      <main className="hz-cand-main">
        {payload.state === "loading" ? (
          <div className="hz-cand-status-card">
            <div className="hz-cand-spinner" />
            <p style={{ marginBottom: 0 }}>
              {isAr ? "جارٍ تحميل تفاصيل مقابلتك..." : "Loading your secure interview link..."}
            </p>
          </div>
        ) : null}

        {payload.state === "invalid" ||
        payload.state === "revoked" ||
        payload.state === "expired" ||
        payload.state === "canceled" ? (
          <div className="hz-cand-status-card">
            <div className="hz-cand-status-icon">
              {payload.state === "canceled" ? <XCircle size={26} /> : <AlertCircle size={26} />}
            </div>
            <h1>
              {payload.state === "expired"
                ? isAr
                  ? "انتهت صلاحية رابط الجدولة"
                  : "This Scheduling Link Has Expired"
                : payload.state === "revoked"
                  ? isAr
                    ? "هذا الرابط لم يعد نشطًا"
                    : "This Scheduling Link Is No Longer Active"
                  : payload.state === "canceled"
                    ? isAr
                      ? "تم إلغاء موعد المقابلة"
                      : "Interview Appointment Canceled"
                    : isAr
                      ? "رابط الجدولة غير صالح"
                      : "Invalid Scheduling Link"}
            </h1>
            <p>
              {payload.state === "canceled"
                ? isAr
                  ? "تم إلغاء موعدك بنجاح وإبلاغ فريق المقابلة. لا يعني هذا الإلغاء رفض طلبك — يمكنك التواصل مع فريق استقطاب الكفاءات في أي وقت لتنسيق موعد جديد."
                  : "Your appointment has been canceled and the hiring panel has been notified. This does not represent a rejection of your application — reach out anytime to coordinate a new slot."
                : isAr
                  ? "لأسباب أمنية، لا يمكن استخدام هذا الرابط حاليًا. يرجى التواصل مع فريق استقطاب الكفاءات في HIRZEXA وسنرسل لك رابط جدولة جديدًا فورًا."
                  : "For security reasons, this personal scheduling link cannot be used. Please contact HIRZEXA Talent Acquisition and we will promptly issue a new link."}
            </p>
            <a href="mailto:careers@hirzexa.com" className="hz-cand-btn-primary">
              {isAr ? "تواصل مع careers@hirzexa.com" : "Contact careers@hirzexa.com"}
            </a>
          </div>
        ) : null}

        {payload.state === "open" || payload.state === "scheduled" ? (
          <div>
            {errorBanner ? (
              <div className="hz-cand-error">
                <AlertCircle size={17} style={{ flexShrink: 0 }} />
                <span>{errorBanner}</span>
              </div>
            ) : null}

            <div className="hz-cand-grid">
              {/* Left Column: Interview Summary Card */}
              <aside className="hz-cand-card">
                <span className="hz-cand-pill">
                  <ShieldCheck size={13} />
                  {isAr ? "جدولة آمنة" : "Secure Scheduling"}
                </span>
                <h1 className="hz-cand-role-title">{payload.invitation.positionTitle}</h1>
                <p className="hz-cand-prepared">
                  {isAr
                    ? `مرحبًا ${payload.invitation.candidateName}`
                    : `Prepared for ${payload.invitation.candidateName}`}
                </p>

                <div className="hz-cand-meta-list">
                  <div className="hz-cand-meta-item">
                    <div className="hz-cand-meta-icon">
                      <Calendar size={16} />
                    </div>
                    <div>
                      <div className="hz-cand-meta-label">
                        {isAr ? "مرحلة المقابلة" : "Interview Stage"}
                      </div>
                      <div className="hz-cand-meta-val">
                        {INTERVIEW_TYPE_LABELS[payload.invitation.interviewType]?.[locale] ||
                          payload.invitation.interviewStage}
                      </div>
                    </div>
                  </div>

                  <div className="hz-cand-meta-item">
                    <div className="hz-cand-meta-icon">
                      <Clock size={16} />
                    </div>
                    <div>
                      <div className="hz-cand-meta-label">{isAr ? "المدة" : "Duration"}</div>
                      <div className="hz-cand-meta-val">
                        {isAr
                          ? `${payload.invitation.durationMinutes} دقيقة`
                          : `${payload.invitation.durationMinutes} minutes`}
                      </div>
                    </div>
                  </div>

                  <div className="hz-cand-meta-item">
                    <div className="hz-cand-meta-icon">
                      {formatIcon(payload.invitation.interviewFormat)}
                    </div>
                    <div>
                      <div className="hz-cand-meta-label">{isAr ? "الطريقة" : "Format"}</div>
                      <div className="hz-cand-meta-val">
                        {INTERVIEW_FORMAT_LABELS[payload.invitation.interviewFormat]?.[locale]}
                      </div>
                    </div>
                  </div>

                  <div className="hz-cand-meta-item">
                    <div className="hz-cand-meta-icon">
                      <User size={16} />
                    </div>
                    <div>
                      <div className="hz-cand-meta-label">{isAr ? "المحاور" : "Interviewer"}</div>
                      <div className="hz-cand-meta-val">{payload.invitation.interviewerName}</div>
                    </div>
                  </div>
                </div>

                {payload.invitation.personalizedMessage ? (
                  <div className="hz-cand-note-box">
                    <div className="hz-cand-note-title">
                      {isAr ? "ملاحظة من فريق التوظيف" : "Note from Talent Acquisition"}
                    </div>
                    <p className="hz-cand-note-body">{payload.invitation.personalizedMessage}</p>
                  </div>
                ) : null}

                <div className="hz-cand-security-foot">
                  {isAr ? "جدولة آمنة. لا يتطلب إنشاء حساب." : "Secure scheduling. No account required."}
                </div>
              </aside>

              {/* Right Column: Confirmed State OR Slot Picker */}
              <section className="hz-cand-card">
                {payload.state === "scheduled" && !rescheduleMode ? (
                  <div>
                    <div className="hz-cand-confirmed-head">
                      <div className="hz-cand-confirmed-icon">
                        <CheckCircle2 size={24} />
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: "0.09em",
                            textTransform: "uppercase",
                            color: "#059669",
                          }}
                        >
                          {isAr ? "تم التأكيد" : "Confirmed"}
                        </div>
                        <h2
                          style={{
                            margin: "4px 0 4px",
                            fontSize: 21,
                            fontWeight: 750,
                            color: "#0f172a",
                          }}
                        >
                          {isAr ? "تم تأكيد موعد مقابلتك" : "Your Interview Is Confirmed"}
                        </h2>
                        <p style={{ margin: 0, fontSize: 13.5, color: "#667085" }}>
                          {isAr
                            ? "أرسلنا تأكيدًا مع دعوة تقويم (.ics) إلى بريدك الإلكتروني."
                            : "We sent a confirmation email with a calendar invite (.ics) to your inbox."}
                        </p>
                      </div>
                    </div>

                    {(() => {
                      const formatted = formatUtcInTimezone(
                        payload.appointment.scheduledStartUtc,
                        payload.appointment.candidateTimezone || timezone,
                        locale
                      );
                      return (
                        <div className="hz-cand-detail-box">
                          <div>
                            <div className="hz-cand-meta-label">{isAr ? "التاريخ" : "Date"}</div>
                            <div className="hz-cand-meta-val">{formatted.dateLabel}</div>
                          </div>
                          <div>
                            <div className="hz-cand-meta-label">
                              {isAr ? "الوقت المحلي" : "Local Time"}
                            </div>
                            <div className="hz-cand-meta-val">
                              {formatted.timeLabel} ({payload.appointment.candidateTimezone})
                            </div>
                          </div>
                          {payload.appointment.meetingUrl ? (
                            <div style={{ gridColumn: "1 / -1" }}>
                              <div className="hz-cand-meta-label">
                                {isAr ? "رابط الاجتماع" : "Meeting Link"}
                              </div>
                              <a
                                href={payload.appointment.meetingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 6,
                                  color: "#315cda",
                                  fontWeight: 650,
                                  wordBreak: "break-all",
                                  marginTop: 4,
                                }}
                              >
                                {payload.appointment.meetingUrl}
                                <ExternalLink size={14} />
                              </a>
                            </div>
                          ) : null}
                          {payload.appointment.locationDetails ? (
                            <div style={{ gridColumn: "1 / -1" }}>
                              <div className="hz-cand-meta-label">
                                {isAr ? "الموقع / التعليمات" : "Location / Instructions"}
                              </div>
                              <div className="hz-cand-meta-val">
                                {payload.appointment.locationDetails}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })()}

                    <div>
                      <div className="hz-cand-step-label">
                        {isAr ? "أضف إلى التقويم" : "Add to Calendar"}
                      </div>
                      <div className="hz-cand-cal-actions">
                        <a
                          href={`/api/interviews/public/ics?token=${encodeURIComponent(token)}`}
                          className="hz-cand-btn-primary"
                        >
                          <Download size={15} />
                          {isAr ? "تنزيل ملف (.ics)" : "Download .ics Invite"}
                        </a>
                        <a
                          href={payload.calendarLinks.googleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hz-cand-btn-secondary"
                        >
                          <ExternalLink size={14} /> Google Calendar
                        </a>
                        <a
                          href={payload.calendarLinks.outlookUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hz-cand-btn-secondary"
                        >
                          <ExternalLink size={14} /> Outlook
                        </a>
                      </div>
                    </div>

                    <div className="hz-cand-manage-row">
                      <button
                        type="button"
                        className="hz-cand-btn-secondary"
                        onClick={() => {
                          setRescheduleMode(true);
                          setSelectedSlot(null);
                        }}
                      >
                        <RefreshCw size={14} />
                        {isAr ? "إعادة جدولة الموعد" : "Reschedule Interview"}
                      </button>

                      <button
                        type="button"
                        className="hz-cand-btn-danger-link"
                        onClick={() => setCancelConfirmOpen(true)}
                      >
                        {isAr ? "إلغاء الموعد" : "Cancel Appointment"}
                      </button>
                    </div>

                    {cancelConfirmOpen ? (
                      <div className="hz-cand-cancel-box">
                        <strong style={{ color: "#991b1b", fontSize: 14 }}>
                          {isAr ? "تأكيد إلغاء المقابلة" : "Confirm Cancellation"}
                        </strong>
                        <span style={{ fontSize: 12.5, color: "#7f1d1d" }}>
                          {isAr
                            ? "ملاحظة اختيارية لفريق استقطاب الكفاءات:"
                            : "Optional note for our Talent Acquisition team:"}
                        </span>
                        <input
                          type="text"
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          placeholder={isAr ? "مثال: تعارض في المواعيد" : "e.g., Schedule conflict"}
                        />
                        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                          <button
                            type="button"
                            disabled={submitting}
                            className="hz-cand-btn-primary"
                            style={{ background: "#dc2626", boxShadow: "none" }}
                            onClick={handleCancelAppointment}
                          >
                            {submitting
                              ? isAr
                                ? "جارٍ الإلغاء..."
                                : "Canceling..."
                              : isAr
                                ? "تأكيد الإلغاء"
                                : "Yes, Cancel Interview"}
                          </button>
                          <button
                            type="button"
                            className="hz-cand-btn-secondary"
                            onClick={() => setCancelConfirmOpen(false)}
                          >
                            {isAr ? "تراجع" : "Keep Appointment"}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div>
                    <div className="hz-cand-picker-head">
                      <div>
                        <h2>
                          {rescheduleMode
                            ? isAr
                              ? "اختر موعدًا بديلًا"
                              : "Select a New Date & Time"
                            : isAr
                              ? "اختر التاريخ والوقت المناسبين لك"
                              : "Select a Date & Time"}
                        </h2>
                        <p>
                          {isAr
                            ? "جميع الأوقات معروضة وفق منطقتك الزمنية المختارة."
                            : "All times are displayed in your selected local time zone."}
                        </p>
                      </div>

                      <div className="hz-cand-tz-wrap">
                        <Globe size={14} style={{ color: "#667085" }} />
                        <select
                          aria-label="Time Zone"
                          value={timezone}
                          onChange={(e) => setTimezone(e.target.value)}
                        >
                          {timezoneOptions.map((tz) => (
                            <option key={tz} value={tz}>
                              {tz}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {rescheduleMode ? (
                      <div style={{ marginBottom: 16 }}>
                        <button
                          type="button"
                          onClick={() => {
                            setRescheduleMode(false);
                            setSelectedSlot(null);
                          }}
                          style={{
                            border: 0,
                            background: "transparent",
                            color: "#315cda",
                            fontSize: 13,
                            fontWeight: 650,
                            cursor: "pointer",
                            padding: 0,
                          }}
                        >
                          {isAr ? "العودة إلى تفاصيل الموعد المؤكد" : "← Back to confirmed appointment"}
                        </button>
                      </div>
                    ) : null}

                    {sortedDateKeys.length === 0 ? (
                      <div
                        style={{
                          padding: 36,
                          borderRadius: 14,
                          border: "1px solid #e2e8f2",
                          background: "#f8fafd",
                          textAlign: "center",
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>
                          {isAr
                            ? "لا توجد أوقات متاحة حاليًا ضمن هذه النافذة."
                            : "No open slots are currently available in this window."}
                        </div>
                        <p style={{ margin: "8px 0 0", fontSize: 13, color: "#667085" }}>
                          {isAr
                            ? "يرجى التواصل معنا على careers@hirzexa.com وسنقوم بإضافة أوقات تناسبك."
                            : "Please contact careers@hirzexa.com and our Talent Acquisition team will open additional times for you."}
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="hz-cand-step-label">
                          {isAr ? "1. اختر اليوم" : "1. Choose a Date"}
                        </div>
                        <div className="hz-cand-date-grid">
                          {sortedDateKeys.slice(0, 15).map((dateKey) => {
                            const lbl = formatDateButtonLabel(dateKey, locale);
                            const active = dateKey === selectedDateKey;
                            return (
                              <button
                                key={dateKey}
                                type="button"
                                className={`hz-cand-date-btn ${active ? "is-active" : ""}`}
                                onClick={() => {
                                  setSelectedDateKey(dateKey);
                                  setSelectedSlot(null);
                                }}
                              >
                                <span className="hz-cand-date-wk">{lbl.weekday}</span>
                                <span className="hz-cand-date-num">{lbl.day}</span>
                                <span className="hz-cand-date-mo">{lbl.month}</span>
                              </button>
                            );
                          })}
                        </div>

                        <div className="hz-cand-step-label">
                          {isAr ? "2. اختر الوقت" : "2. Choose a Time"}
                        </div>
                        <div className="hz-cand-slot-grid">
                          {activeDaySlots.map((slot) => {
                            const chosen = selectedSlot?.startUtc === slot.startUtc;
                            return (
                              <button
                                key={slot.startUtc}
                                type="button"
                                className={`hz-cand-slot-btn ${chosen ? "is-active" : ""}`}
                                onClick={() => setSelectedSlot(slot)}
                              >
                                {slot.labelCandidate}
                              </button>
                            );
                          })}
                        </div>

                        {selectedSlot ? (
                          <div className="hz-cand-confirm-bar">
                            <div>
                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  letterSpacing: "0.08em",
                                  textTransform: "uppercase",
                                  color: "#315cda",
                                }}
                              >
                                {isAr ? "مراجعة وتأكيد الموعد" : "Review & Confirm"}
                              </div>
                              <div
                                style={{
                                  fontSize: 15,
                                  fontWeight: 700,
                                  color: "#0f172a",
                                  marginTop: 4,
                                }}
                              >
                                {
                                  formatUtcInTimezone(selectedSlot.startUtc, timezone, locale)
                                    .fullLabel
                                }
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={submitting}
                              className="hz-cand-btn-primary"
                              onClick={handleConfirmBooking}
                            >
                              {submitting
                                ? isAr
                                  ? "جارٍ التأكيد..."
                                  : "Confirming..."
                                : rescheduleMode
                                  ? isAr
                                    ? "تأكيد الموعد الجديد"
                                    : "Confirm New Time"
                                  : isAr
                                    ? "تأكيد المقابلة"
                                    : "Confirm Interview"}
                            </button>
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                )}
              </section>
            </div>
          </div>
        ) : null}
      </main>

      <footer className="hz-cand-footer">
        <div className="hz-cand-footer-inner">
          <strong style={{ color: "#0f172a" }}>HIRZEXA — AI &amp; Software Engineering</strong>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <a href="mailto:careers@hirzexa.com">careers@hirzexa.com</a>
            <span>·</span>
            <a href="mailto:support@hirzexa.com">support@hirzexa.com</a>
            <span>·</span>
            <a href="https://hirzexa.com">hirzexa.com</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
