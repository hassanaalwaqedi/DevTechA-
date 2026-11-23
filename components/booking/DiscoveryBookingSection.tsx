"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Globe,
  ShieldCheck,
  Sparkles,
  Video,
} from "lucide-react";
import {
  B2B_BUDGET_RANGES,
  B2B_SERVICE_TRACKS,
  B2B_TIMELINES,
  type AvailabilityResponse,
  type LeadType,
  type SynchronizedTimeSlot,
} from "@/lib/crm-types";
import { COMPANY_EMAILS, companyMailto } from "@/lib/company-emails";

const COMMON_TIMEZONES = [
  "Europe/Istanbul",
  "Asia/Riyadh",
  "Asia/Dubai",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "UTC",
] as const;

interface BookingConfirmationData {
  referenceId: string;
  leadType: LeadType;
  scheduledSlotIso: string | null;
  durationMinutes: 20 | 30;
  timezone: string;
  meetingLink?: string;
  icsContent?: string | null;
  calendarLinks?: {
    googleUrl: string;
    outlookUrl: string;
    icsDownloadPath: string;
  } | null;
}

export function DiscoveryBookingSection({
  arabic = false,
  initialMode = "discovery_call",
  initialTrack = "",
  standalone = false,
}: {
  arabic?: boolean;
  initialMode?: LeadType;
  initialTrack?: string;
  standalone?: boolean;
}) {
  const [mode, setMode] = useState<LeadType>(initialMode);
  const [duration, setDuration] = useState<20 | 30>(30);
  const [timezone, setTimezone] = useState<string>("Europe/Istanbul");
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(true);
  const [selectedDateKey, setSelectedDateKey] = useState<string>("");
  const [selectedSlotIso, setSelectedSlotIso] = useState<string>("");
  const [useFallbackWindow, setUseFallbackWindow] = useState<boolean>(false);
  const [preferredWindow, setPreferredWindow] = useState<string>("");
  const [serviceTrack, setServiceTrack] = useState<string>(
    initialTrack || B2B_SERVICE_TRACKS[0].en
  );

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmed, setConfirmed] = useState<BookingConfirmationData | null>(null);

  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) setTimezone(detected);
    } catch {}
  }, []);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (!initialTrack) return;
    const matched = B2B_SERVICE_TRACKS.find(
      (t) => t.id === initialTrack || t.en.toLowerCase() === initialTrack.toLowerCase()
    );
    if (matched) setServiceTrack(matched.en);
  }, [initialTrack]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const urlMode = params.get("mode");
    if (urlMode === "proposal" || urlMode === "proposal_request") {
      setMode("proposal_request");
    } else if (urlMode === "discovery" || urlMode === "discovery_call") {
      setMode("discovery_call");
    }
    const urlTrack = params.get("track");
    if (urlTrack) {
      const matched = B2B_SERVICE_TRACKS.find(
        (t) => t.id === urlTrack || t.en.toLowerCase() === urlTrack.toLowerCase()
      );
      if (matched) setServiceTrack(matched.en);
    }
  }, []);

  const fetchSlots = useCallback(async (tz: string) => {
    setLoadingSlots(true);
    try {
      const response = await fetch(
        `/api/bookings/availability?tz=${encodeURIComponent(tz)}`,
        { cache: "no-store" }
      );
      if (!response.ok) throw new Error("Failed to load schedule");
      const data = (await response.json()) as AvailabilityResponse;
      setAvailability(data);
      const openSlots = data.slots.filter((s) => s.available);
      if (data.mode === "fallback_only" || openSlots.length === 0) {
        setUseFallbackWindow(true);
        setSelectedSlotIso("");
      } else {
        setUseFallbackWindow(false);
        const firstOpen = openSlots[0];
        setSelectedDateKey((prev) =>
          openSlots.some((s) => s.dateKey === prev) ? prev : firstOpen.dateKey
        );
        setSelectedSlotIso((prev) =>
          openSlots.some((s) => s.slotIso === prev) ? prev : firstOpen.slotIso
        );
      }
    } catch {
      setUseFallbackWindow(true);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    void fetchSlots(timezone);
  }, [fetchSlots, timezone]);

  const groupedDates = useMemo(() => {
    const map = new Map<string, SynchronizedTimeSlot[]>();
    if (!availability?.slots) return map;
    for (const slot of availability.slots) {
      const list = map.get(slot.dateKey) || [];
      list.push(slot);
      map.set(slot.dateKey, list);
    }
    return map;
  }, [availability]);

  const dateKeys = useMemo(() => Array.from(groupedDates.keys()), [groupedDates]);
  const slotsForSelectedDate = useMemo(
    () => groupedDates.get(selectedDateKey) || [],
    [groupedDates, selectedDateKey]
  );

  function formatDateButton(dateKey: string) {
    try {
      const d = new Date(`${dateKey}T12:00:00Z`);
      return new Intl.DateTimeFormat(arabic ? "ar" : "en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(d);
    } catch {
      return dateKey;
    }
  }

  function formatTimeChip(slotIso: string) {
    try {
      return new Intl.DateTimeFormat(arabic ? "ar" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: timezone,
      }).format(new Date(slotIso));
    } catch {
      return slotIso.slice(11, 16);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      leadType: mode,
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      company: formData.get("company"),
      roleTitle: formData.get("roleTitle"),
      serviceTrack,
      budgetRange: formData.get("budgetRange"),
      timeline: formData.get("timeline"),
      durationMinutes: duration,
      scheduledSlotIso:
        mode === "discovery_call" && !useFallbackWindow ? selectedSlotIso : null,
      preferredWindow:
        mode === "discovery_call" && useFallbackWindow ? preferredWindow : undefined,
      timezone,
      projectSummary: formData.get("projectSummary"),
      currentStack: formData.get("currentStack"),
      consent: formData.get("consent") === "on",
      website: formData.get("website"),
      locale: arabic ? "ar" : "en",
    };

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.code === "SLOT_ALREADY_RESERVED") {
          await fetchSlots(timezone);
        }
        throw new Error(
          result.error ||
            (arabic
              ? "تعذر إتمام الطلب حالياً."
              : "Unable to complete your request.")
        );
      }

      setConfirmed({
        referenceId: result.referenceId,
        leadType: result.leadType,
        scheduledSlotIso: result.scheduledSlotIso,
        durationMinutes: result.durationMinutes,
        timezone: result.timezone,
        meetingLink: result.meetingLink,
        icsContent: result.icsContent,
        calendarLinks: result.calendarLinks,
      });
      form.reset();
      await fetchSlots(timezone);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : arabic
          ? "حدث خطأ غير متوقع."
          : "An unexpected error occurred."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function downloadIcsBlob() {
    if (!confirmed?.icsContent) return;
    const blob = new Blob([confirmed.icsContent], {
      type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hirzexa-discovery-${confirmed.referenceId}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const timezoneOptions = useMemo(() => {
    const set = new Set<string>(COMMON_TIMEZONES);
    if (timezone) set.add(timezone);
    return Array.from(set);
  }, [timezone]);

  return (
    <section
      id="book-discovery"
      className={`dt-booking-section ${standalone ? "dt-booking-standalone" : ""}`}
      aria-labelledby="dt-booking-heading"
    >
      <div className="container">
        <div className="dt-booking-shell">
          {/* Left Column: Value Proposition, Consultation Agenda & Process */}
          <div className="dt-booking-info">
            <span className="dt-section-eyebrow">
              {arabic
                ? "استشارة هندسية مباشرة · B2B"
                : "DIRECT ENGINEERING CONSULTATION · B2B"}
            </span>
            <h2 id="dt-booking-heading" className="dt-booking-title">
              {arabic
                ? mode === "discovery_call"
                  ? "احجز جلسة اكتشاف هندسية (20–30 دقيقة)."
                  : "اطلب عرضاً فنياً ومالياً لمشروعك."
                : mode === "discovery_call"
                ? "Book a 20–30 Minute Engineering Discovery Call."
                : "Request a Structured Technical & Commercial Proposal."}
            </h2>
            <p className="dt-booking-lead">
              {arabic
                ? "تحدث مباشرة مع مهندسي الأنظمة والذكاء الاصطناعي في HIRZEXA لمناقشة تحديات عملك، وتقييم المعمارية المناسبة، وتحديد خارطة التنفيذ والتكلفة بوضوح."
                : "Speak directly with HIRZEXA's systems and AI engineers—not generic sales reps. We review your operational bottleneck, scope the technical architecture, and outline a clear delivery roadmap."}
            </p>

            <div className="dt-booking-agenda">
              <h3>
                {arabic
                  ? "ما الذي سننجزه في جلسة الاكتشاف؟"
                  : "What happens during and after your session:"}
              </h3>
              <ul>
                <li>
                  <CheckCircle2 size={18} />
                  <div>
                    <strong>
                      {arabic
                        ? "1. تشخيص المشكلة التشغيلية والقيود التقنية"
                        : "1. Bottleneck & Architecture Assessment"}
                    </strong>
                    <span>
                      {arabic
                        ? "مراجعة مسار العمل الحالي، مصادر البيانات، الأنظمة المترابطة، وأهداف الكفاءة."
                        : "We evaluate your workflow, existing stack, data boundaries, and target ROI."}
                    </span>
                  </div>
                </li>
                <li>
                  <CheckCircle2 size={18} />
                  <div>
                    <strong>
                      {arabic
                        ? "2. تحديد المعمارية المقترحة ونطاق التنفيذ"
                        : "2. Technical Blueprint & Feasibility"}
                    </strong>
                    <span>
                      {arabic
                        ? "توضيح الحل الهندسي الأنسب (وكلاء ذكاء اصطناعي، أتمتة، منصة مخصصة، أو تكامل سحابي)."
                        : "Clear recommendation on AI agents, workflow automation, custom platform, or cloud integration."}
                    </span>
                  </div>
                </li>
                <li>
                  <CheckCircle2 size={18} />
                  <div>
                    <strong>
                      {arabic
                        ? "3. عرض فني ومالي واضح بمراحل تسليم محددة"
                        : "3. Written Scope, Milestones & Proposal"}
                    </strong>
                    <span>
                      {arabic
                        ? "تستلم وثيقة نطاق عمل ومراحل تنفيذ واضحة قبل التعاقد وبدء المشروع."
                        : "Receive a structured milestone breakdown, timeline, and commercial proposal."}
                    </span>
                  </div>
                </li>
              </ul>
            </div>

            <div className="dt-booking-guarantees">
              <div className="dt-booking-guarantee-pill">
                <ShieldCheck size={16} />
                <span>
                  {arabic
                    ? "سرية تامة لبياناتك · دعوة تقويم فورية (.ics) · تذكير تلقائي"
                    : "Strict NDA-ready confidentiality · Instant .ics invite · Automated reminders"}
                </span>
              </div>
              <p className="dt-booking-direct-mail">
                {arabic ? "للتواصل المباشر مع فريق الأعمال: " : "Direct business desk: "}
                <a dir="ltr" href={companyMailto("business", "B2B Discovery & Project Inquiry")}>
                  {COMPANY_EMAILS.business} <ArrowUpRight size={14} />
                </a>
              </p>
            </div>
          </div>

          {/* Right Column: Interactive Booking & Proposal Workspace */}
          <div className="dt-booking-card">
            {/* Mode Switcher: Book Discovery Call vs Request a Proposal */}
            <div className="dt-booking-tabs" role="tablist" aria-label={arabic ? "نوع الطلب" : "Consultation mode"}>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "discovery_call"}
                className={`dt-booking-tab ${mode === "discovery_call" ? "active" : ""}`}
                onClick={() => {
                  setMode("discovery_call");
                  setConfirmed(null);
                }}
              >
                <Calendar size={16} />
                <span>{arabic ? "احجز جلسة اكتشاف" : "Book a Discovery Call"}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "proposal_request"}
                className={`dt-booking-tab ${mode === "proposal_request" ? "active" : ""}`}
                onClick={() => {
                  setMode("proposal_request");
                  setConfirmed(null);
                }}
              >
                <FileText size={16} />
                <span>{arabic ? "اطلب عرضاً فنياً" : "Request a Proposal"}</span>
              </button>
            </div>

            {confirmed ? (
              <div className="dt-booking-confirmation" role="status" aria-live="polite">
                <div className="dt-booking-confirm-badge">
                  <CheckCircle2 size={22} />
                  <span>
                    {arabic
                      ? confirmed.leadType === "discovery_call"
                        ? "تم تأكيد حجز جلسة الاكتشاف"
                        : "تم استلام طلب العرض الفني"
                      : confirmed.leadType === "discovery_call"
                      ? "Discovery Call Reserved"
                      : "Proposal Request Received"}
                  </span>
                </div>

                <h3>
                  {arabic
                    ? `الرقم المرجعي: ${confirmed.referenceId}`
                    : `Reference: ${confirmed.referenceId}`}
                </h3>

                <p>
                  {arabic
                    ? confirmed.scheduledSlotIso
                      ? `تم حجز جلستك (${confirmed.durationMinutes} دقيقة) بنجاح وتسجيل تذكير البريد الإلكتروني تلقائياً.`
                      : "تم تسجيل تفاصيل مشروعك في نظام إدارة العملاء (CRM) لدى HIRZEXA، وسيتواصل معك مهندس مختص خلال يوم عمل واحد."
                    : confirmed.scheduledSlotIso
                    ? `Your ${confirmed.durationMinutes}-minute engineering consultation is locked in and automated email reminders are scheduled.`
                    : "Your scope has been logged in HIRZEXA's engineering CRM. A senior architect will respond within 1 business day."}
                </p>

                {confirmed.scheduledSlotIso ? (
                  <div className="dt-booking-confirm-details">
                    <div>
                      <span>{arabic ? "الموعد المؤكد" : "Scheduled Slot"}</span>
                      <strong>
                        {new Intl.DateTimeFormat(arabic ? "ar" : "en-US", {
                          dateStyle: "full",
                          timeStyle: "short",
                          timeZone: confirmed.timezone,
                        }).format(new Date(confirmed.scheduledSlotIso))}
                      </strong>
                      <small dir="ltr">
                        {confirmed.timezone} · {confirmed.durationMinutes} min
                      </small>
                    </div>
                    {confirmed.meetingLink &&
                    !/hirzexa\.com\/book/i.test(confirmed.meetingLink) ? (
                      <div>
                        <span>
                          {confirmed.meetingLink.includes("meet.google.com")
                            ? arabic
                              ? "رابط Google Meet"
                              : "Join Google Meet"
                            : arabic
                            ? "رابط الاجتماع"
                            : "Video Meeting Link"}
                        </span>
                        <a
                          dir="ltr"
                          href={confirmed.meetingLink}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Video size={14} /> {confirmed.meetingLink}
                        </a>
                      </div>
                    ) : (
                      <div>
                        <span>{arabic ? "رابط الاجتماع المرئي" : "Video Conferencing"}</span>
                        <small>
                          {arabic
                            ? "تم تأكيد موعدك. جارٍ تجهيز رابط Google Meet الفريد وسيصلك عبر البريد الإلكتروني فور اعتماده."
                            : "Your slot is confirmed. Your unique Google Meet joining link is being finalized and will be sent via email shortly."}
                        </small>
                      </div>
                    )}
                  </div>
                ) : null}

                {confirmed.calendarLinks ? (
                  <div className="dt-booking-calendar-actions">
                    {confirmed.icsContent ? (
                      <button
                        type="button"
                        className="dt-btn dt-btn-primary"
                        onClick={downloadIcsBlob}
                      >
                        <Download size={16} />
                        <span>
                          {arabic
                            ? "إضافة إلى تقويم Apple / iPhone"
                            : "Apple / iPhone Calendar (.ics)"}
                        </span>
                      </button>
                    ) : (
                      <a
                        href={confirmed.calendarLinks.icsDownloadPath}
                        className="dt-btn dt-btn-primary"
                      >
                        <Download size={16} />
                        <span>
                          {arabic
                            ? "إضافة إلى تقويم Apple / iPhone"
                            : "Apple / iPhone Calendar (.ics)"}
                        </span>
                      </a>
                    )}
                    <a
                      href={confirmed.calendarLinks.googleUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="dt-btn dt-btn-secondary"
                    >
                      <Calendar size={15} />
                      <span>{arabic ? "إضافة إلى تقويم Google" : "Add to Google Calendar"}</span>
                    </a>
                    <a
                      href={confirmed.calendarLinks.outlookUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="dt-btn dt-btn-secondary"
                    >
                      <Calendar size={15} />
                      <span>{arabic ? "إضافة إلى Outlook" : "Add to Outlook"}</span>
                    </a>
                  </div>
                ) : null}

                <button
                  type="button"
                  className="dt-booking-reset-btn"
                  onClick={() => setConfirmed(null)}
                >
                  {arabic ? "حجز موعد آخر أو إرسال طلب إضافي" : "Book another session or submit another request"}
                </button>
              </div>
            ) : (
              <form className="dt-booking-form" onSubmit={handleSubmit}>
                {/* Step 1 (Discovery Call only): Synchronized Slot Picker */}
                {mode === "discovery_call" ? (
                  <div className="dt-booking-schedule-box">
                    <div className="dt-booking-schedule-header">
                      <div className="dt-booking-duration-group">
                        <span>
                          <Clock size={14} />{" "}
                          {arabic ? "مدة الجلسة:" : "Consultation Duration:"}
                        </span>
                        <div className="dt-booking-duration-pills">
                          {([20, 30] as const).map((mins) => (
                            <button
                              key={mins}
                              type="button"
                              className={duration === mins ? "active" : ""}
                              onClick={() => setDuration(mins)}
                            >
                              {mins} {arabic ? "دقيقة" : "min"}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="dt-booking-tz-select">
                        <Globe size={14} />
                        <select
                          value={timezone}
                          onChange={(e) => setTimezone(e.target.value)}
                          aria-label={arabic ? "المنطقة الزمنية" : "Timezone"}
                        >
                          {timezoneOptions.map((tz) => (
                            <option key={tz} value={tz}>
                              {tz}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <p className="dt-booking-sync-notice">
                      <Sparkles size={13} />
                      <span>
                        {arabic
                          ? availability?.scheduleNoticeAr ||
                            "جارٍ مزامنة المواعيد المتاحة..."
                          : availability?.scheduleNoticeEn ||
                            "Synchronizing live appointment availability..."}
                      </span>
                    </p>

                    {!loadingSlots && !useFallbackWindow && dateKeys.length > 0 ? (
                      <>
                        <div
                          className="dt-booking-dates-rail"
                          role="radiogroup"
                          aria-label={arabic ? "اختر اليوم" : "Select day"}
                        >
                          {dateKeys.map((dateKey) => {
                            const hasOpen = (groupedDates.get(dateKey) || []).some(
                              (s) => s.available
                            );
                            return (
                              <button
                                key={dateKey}
                                type="button"
                                disabled={!hasOpen}
                                className={`dt-booking-date-btn ${
                                  selectedDateKey === dateKey ? "active" : ""
                                }`}
                                onClick={() => {
                                  setSelectedDateKey(dateKey);
                                  const firstOpen = (
                                    groupedDates.get(dateKey) || []
                                  ).find((s) => s.available);
                                  if (firstOpen) setSelectedSlotIso(firstOpen.slotIso);
                                }}
                              >
                                {formatDateButton(dateKey)}
                              </button>
                            );
                          })}
                        </div>

                        <div
                          className="dt-booking-times-grid"
                          role="radiogroup"
                          aria-label={arabic ? "اختر الوقت" : "Select time slot"}
                        >
                          {slotsForSelectedDate.map((slot) => (
                            <button
                              key={slot.slotIso}
                              type="button"
                              disabled={!slot.available}
                              className={`dt-booking-time-btn ${
                                selectedSlotIso === slot.slotIso ? "active" : ""
                              }`}
                              onClick={() => setSelectedSlotIso(slot.slotIso)}
                            >
                              <span>{formatTimeChip(slot.slotIso)}</span>
                              {!slot.available ? (
                                <small>{arabic ? "محجوز" : "Booked"}</small>
                              ) : null}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          className="dt-booking-fallback-toggle"
                          onClick={() => setUseFallbackWindow(true)}
                        >
                          {arabic
                            ? "لا يناسبك أي من هذه الأوقات؟ اطلب وقتاً مخصصاً ←"
                            : "Need a custom time outside these slots? Request priority scheduling →"}
                        </button>
                      </>
                    ) : (
                      <div className="dt-booking-fallback-box">
                        <label htmlFor="preferredWindow">
                          {arabic
                            ? "اليوم والوقت المفضل للتواصل (تنسّق الدعوة خلال يوم عمل واحد)"
                            : "Preferred Day & Time Window (Priority Calendar Coordination)"}
                        </label>
                        <input
                          id="preferredWindow"
                          value={preferredWindow}
                          onChange={(e) => setPreferredWindow(e.target.value)}
                          placeholder={
                            arabic
                              ? "مثال: الثلاثاء أو الأربعاء القادم، بين 11 صباحاً و3 عصراً"
                              : "e.g. Next Tuesday or Wednesday afternoon (14:00–17:00)"
                          }
                        />
                        {dateKeys.length > 0 ? (
                          <button
                            type="button"
                            className="dt-booking-fallback-toggle"
                            onClick={() => setUseFallbackWindow(false)}
                          >
                            {arabic
                              ? "العودة إلى جدول المواعيد المتزامنة"
                              : "← Return to synchronized calendar slots"}
                          </button>
                        ) : null}
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Step 2: Qualified Lead Details */}
                <div className="dt-booking-fields-grid">
                  <div className="dt-booking-field">
                    <label htmlFor="booking-fullName">
                      {arabic ? "الاسم الكامل *" : "Full Name *"}
                    </label>
                    <input
                      id="booking-fullName"
                      name="fullName"
                      required
                      maxLength={100}
                      autoComplete="name"
                      placeholder={arabic ? "اسمك الكامل" : "Your full name"}
                    />
                  </div>

                  <div className="dt-booking-field">
                    <label htmlFor="booking-email">
                      {arabic ? "البريد الإلكتروني للعمل *" : "Work Email *"}
                    </label>
                    <input
                      id="booking-email"
                      name="email"
                      type="email"
                      required
                      maxLength={254}
                      autoComplete="email"
                      dir="ltr"
                      placeholder="name@company.com"
                    />
                  </div>

                  <div className="dt-booking-field">
                    <label htmlFor="booking-company">
                      {arabic ? "الشركة / المؤسسة *" : "Company / Organization *"}
                    </label>
                    <input
                      id="booking-company"
                      name="company"
                      required
                      maxLength={120}
                      autoComplete="organization"
                      placeholder={arabic ? "اسم الشركة" : "Company name"}
                    />
                  </div>

                  <div className="dt-booking-field">
                    <label htmlFor="booking-roleTitle">
                      {arabic ? "المسمى الوظيفي" : "Role / Title"}
                    </label>
                    <input
                      id="booking-roleTitle"
                      name="roleTitle"
                      maxLength={100}
                      placeholder={
                        arabic
                          ? "مثال: المدير التنفيذي، مدير التقنية، مدير العمليات"
                          : "e.g. CTO, Founder, VP Operations"
                      }
                    />
                  </div>

                  <div className="dt-booking-field">
                    <label htmlFor="booking-serviceTrack">
                      {arabic ? "المجال الهندسي المطلوب *" : "Primary Engineering Track *"}
                    </label>
                    <select
                      id="booking-serviceTrack"
                      value={serviceTrack}
                      onChange={(e) => setServiceTrack(e.target.value)}
                    >
                      {B2B_SERVICE_TRACKS.map((track) => (
                        <option key={track.id} value={track.en}>
                          {arabic ? track.ar : track.en}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="dt-booking-field">
                    <label htmlFor="booking-budgetRange">
                      {arabic ? "الميزانية التقديرية" : "Estimated Budget / Scope"}
                    </label>
                    <select id="booking-budgetRange" name="budgetRange" defaultValue="">
                      <option value="">
                        {arabic ? "اختر النطاق التقديري" : "Select estimated scope"}
                      </option>
                      {B2B_BUDGET_RANGES.map((b) => (
                        <option key={b.value} value={b.value}>
                          {arabic ? b.ar : b.en}
                        </option>
                      ))}
                    </select>
                  </div>

                  {mode === "proposal_request" ? (
                    <>
                      <div className="dt-booking-field">
                        <label htmlFor="booking-timeline">
                          {arabic ? "الجدول الزمني المستهدف" : "Target Delivery Timeline"}
                        </label>
                        <select id="booking-timeline" name="timeline" defaultValue="">
                          <option value="">
                            {arabic ? "اختر الجدول الزمني" : "Select target timeline"}
                          </option>
                          {B2B_TIMELINES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {arabic ? t.ar : t.en}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="dt-booking-field">
                        <label htmlFor="booking-currentStack">
                          {arabic ? "الأنظمة أو التقنيات الحالية" : "Current Stack / Integrations"}
                        </label>
                        <input
                          id="booking-currentStack"
                          name="currentStack"
                          maxLength={200}
                          placeholder={
                            arabic
                              ? "مثال: HubSpot، أنظمة داخلية، PostgreSQL، AWS"
                              : "e.g. HubSpot, ERP, PostgreSQL, AWS, Next.js"
                          }
                        />
                      </div>
                    </>
                  ) : null}
                </div>

                <div className="dt-booking-field dt-booking-field-full">
                  <label htmlFor="booking-projectSummary">
                    {arabic
                      ? "ما المشكلة التشغيلية أو النظام الذي ترغب في بنائه؟ *"
                      : "What business problem or software system are you looking to build? *"}
                  </label>
                  <textarea
                    id="booking-projectSummary"
                    name="projectSummary"
                    required
                    minLength={15}
                    maxLength={4000}
                    rows={3}
                    placeholder={
                      arabic
                        ? "صف بإيجاز سير العمل الحالي، النتيجة التجارية المطلوبة، أو المتطلبات الفنية الأساسية."
                        : "Briefly describe the operational bottleneck, desired business outcome, or key technical requirements."
                    }
                  />
                </div>

                {/* Honeypot */}
                <div className="honeypot" aria-hidden="true" style={{ display: "none" }}>
                  <label htmlFor="booking-website">Website</label>
                  <input id="booking-website" name="website" tabIndex={-1} autoComplete="off" />
                </div>

                <label className="dt-booking-consent">
                  <input type="checkbox" name="consent" required defaultChecked />
                  <span>
                    {arabic
                      ? "أوافق على معالجة HIRZEXA لهذه البيانات لجدولة الاستشارة وإرسال دعوة التقويم والتذكيرات وفق سياسة الخصوصية."
                      : "I consent to HIRZEXA processing these details to schedule this consultation, send calendar invitations/reminders, and prepare a tailored technical response."}
                  </span>
                </label>

                {errorMessage ? (
                  <p className="dt-booking-error" role="alert">
                    {errorMessage}{" "}
                    <a dir="ltr" href={companyMailto("business")}>
                      {COMPANY_EMAILS.business}
                    </a>
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={submitting}
                  className="dt-btn dt-btn-primary dt-booking-submit"
                >
                  <span>
                    {submitting
                      ? arabic
                        ? "جارٍ تأكيد الحجز..."
                        : "Confirming reservation..."
                      : mode === "discovery_call"
                      ? arabic
                        ? "احجز جلسة الاكتشاف الآن"
                        : "Book Discovery Call"
                      : arabic
                      ? "إرسال طلب العرض الفني"
                      : "Submit Proposal Request"}
                  </span>
                  <ArrowRight size={18} />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
