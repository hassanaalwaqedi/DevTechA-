"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Globe,
  Link2,
  Mail,
  ShieldCheck,
  Sparkles,
  Video,
} from "lucide-react";
import { HirzexaLogoMark } from "@/components/navigation/SiteHeader";
import { COMPANY_EMAILS, companyMailto } from "@/lib/company-emails";
import {
  B2B_SERVICE_TRACKS,
  type AvailabilityResponse,
  type LeadType,
  type SynchronizedTimeSlot,
} from "@/lib/crm-types";

const BASE_TIMEZONES = [
  "Europe/Istanbul",
  "Asia/Riyadh",
  "Asia/Dubai",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "UTC",
] as const;

interface BookingConfirmationData {
  referenceId: string;
  leadType: LeadType;
  scheduledSlotIso: string | null;
  durationMinutes: 20 | 30;
  timezone: string;
  meetingLink?: string | null;
  meetProvisioningStatus?: "ready" | "failed" | "not_applicable";
  icsContent?: string | null;
  calendarLinks?: {
    googleUrl: string;
    outlookUrl: string;
    icsDownloadPath: string;
  } | null;
}

function getDateKeyInTimezone(iso: string, tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: tz,
    }).formatToParts(new Date(iso));
    const y = parts.find((p) => p.type === "year")?.value;
    const m = parts.find((p) => p.type === "month")?.value;
    const d = parts.find((p) => p.type === "day")?.value;
    if (y && m && d) return `${y}-${m}-${d}`;
  } catch {}
  return iso.slice(0, 10);
}

function parseYearMonth(dateKey: string): { year: number; month: number } {
  const [y, m] = dateKey.split("-").map(Number);
  if (Number.isFinite(y) && Number.isFinite(m) && m >= 1 && m <= 12) {
    return { year: y, month: m - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

function buildMonthGrid(year: number, monthIndex: number): Array<{
  dateKey: string;
  dayNumber: number;
  inCurrentMonth: boolean;
}> {
  // Monday-first calendar grid (matches enterprise scheduling convention & reference)
  const firstOfMonth = new Date(Date.UTC(year, monthIndex, 1));
  const startDow = (firstOfMonth.getUTCDay() + 6) % 7; // Mon=0 .. Sun=6
  const startDate = new Date(Date.UTC(year, monthIndex, 1 - startDow));
  const cells: Array<{ dateKey: string; dayNumber: number; inCurrentMonth: boolean }> = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate.getTime() + i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    cells.push({
      dateKey: key,
      dayNumber: d.getUTCDate(),
      inCurrentMonth: d.getUTCMonth() === monthIndex,
    });
  }
  // Drop trailing row if all 7 days belong to next month
  if (cells.slice(35).every((c) => !c.inCurrentMonth)) {
    return cells.slice(0, 35);
  }
  return cells;
}

function isVerifiedGoogleMeetUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /^https:\/\/meet\.google\.com\/.+$/i.test(url.trim());
}

function isVerifiedVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /^https?:\/\/.+$/i.test(url.trim()) && !/hirzexa\.com\/book/i.test(url);
}

function formatTimezoneOption(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    }).formatToParts(new Date());
    const offset = parts.find((p) => p.type === "timeZoneName")?.value;
    return offset ? `${tz} (${offset})` : tz;
  } catch {
    return tz;
  }
}

export function DiscoveryBookingSection({
  arabic = false,
  initialMode = "discovery_call",
  initialTrack = "",
  manageRef = "",
  standalone = true,
}: {
  arabic?: boolean;
  initialMode?: LeadType;
  initialTrack?: string;
  manageRef?: string;
  standalone?: boolean;
}) {
  void standalone;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [manageExistingRef, setManageExistingRef] = useState<string>(manageRef.trim());
  const [duration, setDuration] = useState<20 | 30>(30);
  const [timezone, setTimezone] = useState<string>("Europe/Istanbul");
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(true);
  const [selectedDateKey, setSelectedDateKey] = useState<string>("");
  const [selectedSlotIso, setSelectedSlotIso] = useState<string>("");
  const [useFallbackWindow, setUseFallbackWindow] = useState<boolean>(false);
  const [preferredWindow, setPreferredWindow] = useState<string>("");

  const now = new Date();
  const [viewMonth, setViewMonth] = useState<{ year: number; month: number }>({
    year: now.getFullYear(),
    month: now.getMonth(),
  });

  // Step 2 controlled state (preserved cleanly when navigating back to Step 1)
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [projectSummary, setProjectSummary] = useState("");
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [serviceTrack, setServiceTrack] = useState<string>(() => {
    if (initialTrack) {
      const matched = B2B_SERVICE_TRACKS.find(
        (t) => t.id === initialTrack || t.en.toLowerCase() === initialTrack.toLowerCase()
      );
      if (matched) return matched.en;
    }
    return B2B_SERVICE_TRACKS[0].en;
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmed, setConfirmed] = useState<BookingConfirmationData | null>(null);
  const [showManageDrawer, setShowManageDrawer] = useState(false);

  // Auto-detect browser timezone
  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) setTimezone(detected);
    } catch {}
  }, []);

  const timezoneOptions = useMemo(() => {
    const set = new Set<string>(BASE_TIMEZONES);
    if (timezone) set.add(timezone);
    return Array.from(set);
  }, [timezone]);

  const fetchSlots = useCallback(async (tz: string) => {
    setLoadingSlots(true);
    try {
      const response = await fetch(
        `/api/bookings/availability?tz=${encodeURIComponent(tz)}`,
        { cache: "no-store" }
      );
      if (!response.ok) throw new Error("Failed to load availability");
      const data = (await response.json()) as AvailabilityResponse;
      setAvailability(data);
      const openSlots = data.slots.filter((s) => s.available);

      if (data.mode === "fallback_only" || openSlots.length === 0) {
        setUseFallbackWindow(true);
        setSelectedSlotIso("");
      } else {
        setUseFallbackWindow(false);
        const firstOpen = openSlots[0];
        const firstDateKey = getDateKeyInTimezone(firstOpen.slotIso, tz);
        setSelectedDateKey((prev) =>
          openSlots.some((s) => getDateKeyInTimezone(s.slotIso, tz) === prev)
            ? prev
            : firstDateKey
        );
        setSelectedSlotIso((prev) =>
          openSlots.some((s) => s.slotIso === prev) ? prev : firstOpen.slotIso
        );
        setViewMonth(parseYearMonth(firstDateKey));
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

  // Group ONLY truly available slots by local calendar date in the user's selected timezone
  const openSlotsByDate = useMemo(() => {
    const map = new Map<string, SynchronizedTimeSlot[]>();
    if (!availability?.slots) return map;
    for (const slot of availability.slots) {
      if (!slot.available) continue;
      const localDateKey = getDateKeyInTimezone(slot.slotIso, timezone);
      const list = map.get(localDateKey) || [];
      list.push(slot);
      map.set(localDateKey, list);
    }
    return map;
  }, [availability, timezone]);

  const slotsForSelectedDate = useMemo(
    () => openSlotsByDate.get(selectedDateKey) || [],
    [openSlotsByDate, selectedDateKey]
  );

  const monthCells = useMemo(
    () => buildMonthGrid(viewMonth.year, viewMonth.month),
    [viewMonth.year, viewMonth.month]
  );

  const monthHeading = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(arabic ? "ar" : "en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(Date.UTC(viewMonth.year, viewMonth.month, 1)));
    } catch {
      return `${viewMonth.year}-${viewMonth.month + 1}`;
    }
  }, [arabic, viewMonth.month, viewMonth.year]);

  const weekdayLabels = useMemo(() => {
    // 2026-11-23 is a Monday
    const monday = Date.UTC(2026, 10, 23);
    return Array.from({ length: 7 }, (_, i) =>
      new Intl.DateTimeFormat(arabic ? "ar" : "en-US", {
        weekday: "short",
        timeZone: "UTC",
      }).format(new Date(monday + i * 86_400_000))
    );
  }, [arabic]);

  function formatSelectedDateLabel(dateKey: string): string {
    if (!dateKey) return "";
    try {
      const [y, m, d] = dateKey.split("-").map(Number);
      return new Intl.DateTimeFormat(arabic ? "ar" : "en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(new Date(Date.UTC(y, m - 1, d)));
    } catch {
      return dateKey;
    }
  }

  function formatTimeChip(slotIso: string): string {
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

  function formatFullSlot(slotIso: string, tz: string): string {
    try {
      return new Intl.DateTimeFormat(arabic ? "ar" : "en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: tz,
      }).format(new Date(slotIso));
    } catch {
      return slotIso;
    }
  }

  function shiftMonth(delta: number) {
    setViewMonth((prev) => {
      const d = new Date(Date.UTC(prev.year, prev.month + delta, 1));
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
    });
  }

  function toggleLocale() {
    document.cookie = `devtech_locale=${arabic ? "en" : "ar"}; Path=/; Max-Age=31536000; SameSite=Lax`;
    window.location.reload();
  }

  function handleSelectDate(dateKey: string) {
    const daySlots = openSlotsByDate.get(dateKey);
    if (!daySlots || daySlots.length === 0) return;
    setSelectedDateKey(dateKey);
    setSelectedSlotIso(daySlots[0].slotIso);
    setErrorMessage("");
  }

  function canProceedToDetails(): boolean {
    if (useFallbackWindow) return preferredWindow.trim().length >= 3;
    return Boolean(selectedSlotIso);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage("");

    const payload = {
      leadType: initialMode === "proposal_request" && !selectedSlotIso ? "proposal_request" : "discovery_call",
      fullName: fullName.trim(),
      email: email.trim(),
      company: company.trim(),
      serviceTrack,
      durationMinutes: duration,
      scheduledSlotIso: !useFallbackWindow && selectedSlotIso ? selectedSlotIso : null,
      preferredWindow: useFallbackWindow ? preferredWindow.trim() : undefined,
      timezone,
      projectSummary: projectSummary.trim(),
      consent,
      website: honeypot,
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
          setStep(1);
        }
        throw new Error(
          result.error ||
            (arabic ? "تعذر إتمام الحجز حالياً." : "Unable to complete your booking right now.")
        );
      }

      setConfirmed({
        referenceId: result.referenceId,
        leadType: result.leadType,
        scheduledSlotIso: result.scheduledSlotIso,
        durationMinutes: result.durationMinutes,
        timezone: result.timezone,
        meetingLink: result.meetingLink,
        meetProvisioningStatus: result.meetProvisioningStatus,
        icsContent: result.icsContent,
        calendarLinks: result.calendarLinks,
      });
      setStep(3);
      await fetchSlots(timezone);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : arabic
          ? "حدث خطأ غير متوقع أثناء تأكيد الحجز."
          : "Unexpected error confirming your booking."
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

  const DirectionalArrow = arabic ? ArrowLeft : ArrowRight;
  const PrevMonthIcon = arabic ? ChevronRight : ChevronLeft;
  const NextMonthIcon = arabic ? ChevronLeft : ChevronRight;

  return (
    <div className="hz-book-shell" dir={arabic ? "rtl" : "ltr"}>
      {/* Ambient Obsidian Backdrop + Subtle Desktop Engineering Horizon Wave */}
      <div className="hz-book-backdrop" aria-hidden="true">
        <svg
          className="hz-book-wave-svg"
          viewBox="0 0 820 320"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="hzWaveStroke" x1="0" y1="0" x2="820" y2="260" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.55" />
              <stop offset="52%" stopColor="#7C5CFF" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#6D4AFF" stopOpacity="0" />
            </linearGradient>
          </defs>
          {Array.from({ length: 12 }, (_, idx) => {
            const offset = idx * 14;
            const opacity = Math.max(0.08, 0.45 - idx * 0.03);
            return (
              <path
                key={idx}
                d={`M -40 ${250 - offset * 0.4} C 120 ${120 + offset * 0.65}, 240 ${290 - offset * 0.35}, 410 ${150 + offset * 0.55} C 560 ${40 + offset * 0.4}, 690 ${240 + offset * 0.25}, 860 ${295}`}
                stroke="url(#hzWaveStroke)"
                strokeWidth={idx === 0 ? "1.6" : "1"}
                strokeDasharray="2 7"
                strokeLinecap="round"
                opacity={opacity}
              />
            );
          })}
        </svg>
      </div>

      {/* Minimal Enterprise Header */}
      <header className="hz-book-header">
        <div className="hz-book-header-inner">
          <Link href="/" className="hz-book-brand" aria-label="HIRZEXA Home">
            <HirzexaLogoMark />
            <span className="hz-book-brand-wordmark">HIRZEXA</span>
          </Link>

          <div className="hz-book-header-actions">
            <button
              type="button"
              className="hz-book-lang-btn"
              onClick={toggleLocale}
              aria-label={arabic ? "Switch to English" : "التبديل إلى العربية"}
            >
              <Globe size={14} aria-hidden="true" />
              <span>{arabic ? "English" : "العربية"}</span>
            </button>
            <Link href="/contact" className="hz-book-contact-link">
              {arabic ? "تواصل مع المبيعات" : "Contact Sales"}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Booking Workspace */}
      <main className="hz-book-main">
        {manageExistingRef ? (
          /* Dedicated Manage Existing Booking View — NEVER redirects to new booking form */
          <div style={{ maxWidth: 560, width: "100%", margin: "0 auto" }}>
            <section className="hz-book-card" aria-labelledby="manage-booking-heading">
              <div className="hz-book-confirm-head">
                <div className="hz-book-confirm-icon">
                  <Calendar size={20} />
                </div>
                <div>
                  <h1 id="manage-booking-heading" style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
                    {arabic ? "إدارة حجزك القائم" : "Manage Your Booking"}
                  </h1>
                  <p>
                    {arabic ? "الرقم المرجعي:" : "Booking Reference:"}{" "}
                    <strong dir="ltr" style={{ color: "#e2e8f0" }}>
                      {manageExistingRef}
                    </strong>
                  </p>
                </div>
              </div>

              <div className="hz-book-manage-panel">
                <p>
                  {arabic
                    ? "لتعديل موعد جلسة الاكتشاف أو إلغائها مع الحفاظ على سجل مشروعك، اختر الإجراء المطلوب أدناه وسيتولى فريقنا التحديث فوراً."
                    : "To reschedule or cancel your confirmed Discovery Call, select an option below and our engineering team will update your calendar invitation immediately."}
                </p>
                <div className="hz-book-manage-actions">
                  <a
                    href={companyMailto("business", `Reschedule Request — ${manageExistingRef}`)}
                    className="hz-book-primary-btn"
                    style={{ width: "auto", flex: "1 1 180px" }}
                  >
                    <Calendar size={15} />
                    <span>{arabic ? "طلب إعادة جدولة" : "Request Reschedule"}</span>
                  </a>
                  <a
                    href={companyMailto("business", `Cancel Meeting — ${manageExistingRef}`)}
                    className="hz-book-secondary-btn"
                    style={{ flex: "1 1 160px" }}
                  >
                    <Mail size={15} />
                    <span>{arabic ? "إلغاء الموعد" : "Cancel Meeting"}</span>
                  </a>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="hz-book-change-btn"
                  onClick={() => setManageExistingRef("")}
                >
                  {arabic ? "حجز جلسة جديدة منفصلة" : "Book a separate call"}
                </button>
                <Link href="/contact" style={{ fontSize: 12.5, color: "#94a3b8", textDecoration: "none" }}>
                  {COMPANY_EMAILS.business}
                </Link>
              </div>
            </section>
          </div>
        ) : (
          <div className="hz-book-grid">
            {/* LEFT COLUMN: Concise Brand Introduction */}
            <section className="hz-book-intro" aria-labelledby="book-hero-title">
              <span className="hz-book-eyebrow-pill">
                <Calendar size={13} aria-hidden="true" />
                <span>{arabic ? "جلسة اكتشاف هندسية" : "Engineering Discovery Call"}</span>
              </span>

              <h1 id="book-hero-title" className="hz-book-headline">
                {arabic ? (
                  <>
                    احجز <span className="hz-book-headline-accent">جلسة اكتشاف</span>
                  </>
                ) : (
                  <>
                    Book a <span className="hz-book-headline-accent">Discovery Call</span>
                  </>
                )}
              </h1>

              <p className="hz-book-subtitle">
                {arabic
                  ? "ناقش مشروعك البرمجي أو حلول الذكاء الاصطناعي مع فريقنا الهندسي."
                  : "Discuss your software or AI project with our engineering team."}
              </p>

              {/* Single compact info row (visible on mobile & desktop) */}
              <div className="hz-book-meta-row" aria-label={arabic ? "تفاصيل الجلسة" : "Consultation details"}>
                <span className="hz-book-meta-item">
                  <Clock size={14} aria-hidden="true" />
                  <span>{arabic ? `${duration} دقيقة` : `${duration} minutes`}</span>
                </span>
                <span className="hz-book-meta-item">
                  <Video size={14} aria-hidden="true" />
                  <span>Google Meet</span>
                </span>
                <span className="hz-book-meta-item">
                  <Sparkles size={14} aria-hidden="true" />
                  <span>{arabic ? "استشارة مجانية" : "Free consultation"}</span>
                </span>
              </div>

              {/* Three concise statements — hidden on mobile (<768px) */}
              <ul className="hz-book-benefits">
                {(arabic
                  ? [
                      "فهم متطلبات مشروعك وأهدافك",
                      "استكشاف الحلول التقنية والجدوى الهندسية",
                      "تحديد الخطوات التالية بوضوح",
                    ]
                  : [
                      "Understand your requirements",
                      "Explore technical solutions",
                      "Define next steps",
                    ]
                ).map((statement) => (
                  <li key={statement} className="hz-book-benefit-item">
                    <span className="hz-book-benefit-icon" aria-hidden="true">
                      <Check size={13} />
                    </span>
                    <span>{statement}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* RIGHT COLUMN: Primary Scheduling Card */}
            <section className="hz-book-card" aria-label={arabic ? "واجهة حجز الموعد" : "Discovery Call Scheduler"}>
              {/* 3-Step Indicator */}
              <nav className="hz-book-stepper" aria-label={arabic ? "مراحل الحجز" : "Booking steps"}>
                <div className={`hz-book-step-item ${step === 1 ? "is-active" : step > 1 ? "is-done" : ""}`}>
                  <span className="hz-book-step-num">{step > 1 ? <Check size={12} /> : "1"}</span>
                  <span>{arabic ? "اختر الموعد" : "Book a Time"}</span>
                </div>
                <span className="hz-book-step-line" aria-hidden="true" />
                <div className={`hz-book-step-item ${step === 2 ? "is-active" : step > 2 ? "is-done" : ""}`}>
                  <span className="hz-book-step-num">{step > 2 ? <Check size={12} /> : "2"}</span>
                  <span>{arabic ? "بياناتك" : "Your Details"}</span>
                </div>
                <span className="hz-book-step-line" aria-hidden="true" />
                <div className={`hz-book-step-item ${step === 3 ? "is-active" : ""}`}>
                  <span className="hz-book-step-num">3</span>
                  <span>{arabic ? "التأكيد" : "Confirmation"}</span>
                </div>
              </nav>

              {/* ================= STEP 1: SELECT DATE & TIME ================= */}
              {step === 1 ? (
                <>
                  <div className="hz-book-step-head">
                    <h2 className="hz-book-card-title">
                      {arabic ? "اختر التاريخ والوقت" : "Select a Date & Time"}
                    </h2>

                    <div className="hz-book-controls-inline">
                      <div
                        className="hz-book-duration-toggle"
                        role="group"
                        aria-label={arabic ? "مدة الاجتماع" : "Meeting duration"}
                      >
                        {([20, 30] as const).map((mins) => (
                          <button
                            key={mins}
                            type="button"
                            className={`hz-book-duration-btn ${duration === mins ? "is-active" : ""}`}
                            aria-pressed={duration === mins}
                            onClick={() => setDuration(mins)}
                          >
                            {arabic ? `${mins} د` : `${mins}m`}
                          </button>
                        ))}
                      </div>

                      <div className="hz-book-tz-wrap">
                        <Globe size={13} className="hz-book-tz-icon" aria-hidden="true" />
                        <select
                          className="hz-book-tz-select"
                          value={timezone}
                          onChange={(e) => setTimezone(e.target.value)}
                          aria-label={arabic ? "المنطقة الزمنية" : "Timezone"}
                        >
                          {timezoneOptions.map((tz) => (
                            <option key={tz} value={tz}>
                              {formatTimezoneOption(tz)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {errorMessage ? (
                    <div className="hz-book-alert-error" role="alert">
                      {errorMessage}
                    </div>
                  ) : null}

                  {loadingSlots ? (
                    <div className="hz-book-picker-layout">
                      <div className="hz-book-skeleton" style={{ height: 248 }} />
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                        {Array.from({ length: 6 }, (_, i) => (
                          <div key={i} className="hz-book-skeleton" />
                        ))}
                      </div>
                    </div>
                  ) : !useFallbackWindow ? (
                    <div className="hz-book-picker-layout">
                      {/* Month Calendar Grid */}
                      <div className="hz-book-cal-box">
                        <div className="hz-book-cal-nav">
                          <button
                            type="button"
                            className="hz-book-cal-arrow"
                            onClick={() => shiftMonth(-1)}
                            aria-label={arabic ? "الشهر السابق" : "Previous month"}
                          >
                            <PrevMonthIcon size={16} />
                          </button>
                          <span className="hz-book-cal-month">{monthHeading}</span>
                          <button
                            type="button"
                            className="hz-book-cal-arrow"
                            onClick={() => shiftMonth(1)}
                            aria-label={arabic ? "الشهر التالي" : "Next month"}
                          >
                            <NextMonthIcon size={16} />
                          </button>
                        </div>

                        <div className="hz-book-cal-weekdays" aria-hidden="true">
                          {weekdayLabels.map((wd) => (
                            <div key={wd} className="hz-book-cal-weekday">
                              {wd}
                            </div>
                          ))}
                        </div>

                        <div
                          className="hz-book-cal-days"
                          role="grid"
                          aria-label={arabic ? "التقويم" : "Calendar"}
                        >
                          {monthCells.map((cell) => {
                            const hasOpen = (openSlotsByDate.get(cell.dateKey)?.length || 0) > 0;
                            const isSelected = selectedDateKey === cell.dateKey;
                            return (
                              <button
                                key={cell.dateKey}
                                type="button"
                                disabled={!hasOpen}
                                aria-pressed={isSelected}
                                aria-label={`${formatSelectedDateLabel(cell.dateKey)}${
                                  hasOpen
                                    ? arabic
                                      ? " — متاح"
                                      : " — available"
                                    : arabic
                                    ? " — غير متاح"
                                    : " — unavailable"
                                }`}
                                className={`hz-book-cal-day ${
                                  !cell.inCurrentMonth ? "is-outside" : ""
                                } ${hasOpen ? "is-available" : ""} ${
                                  isSelected ? "is-selected" : ""
                                }`}
                                onClick={() => handleSelectDate(cell.dateKey)}
                              >
                                <span>{cell.dayNumber}</span>
                                {hasOpen ? <span className="hz-book-cal-dot" aria-hidden="true" /> : null}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Available Time Slots (2-column grid) */}
                      <div className="hz-book-slots-col">
                        <p className="hz-book-slots-label">
                          {selectedDateKey
                            ? arabic
                              ? `الأوقات المتاحة — ${formatSelectedDateLabel(selectedDateKey)}`
                              : `Available times — ${formatSelectedDateLabel(selectedDateKey)}`
                            : arabic
                            ? "اختر يوماً متاحاً"
                            : "Select an available date"}
                        </p>

                        <div
                          className="hz-book-slots-grid"
                          role="radiogroup"
                          aria-label={arabic ? "الأوقات المتاحة" : "Available time slots"}
                        >
                          {slotsForSelectedDate.map((slot) => {
                            const isSelected = selectedSlotIso === slot.slotIso;
                            return (
                              <button
                                key={slot.slotIso}
                                type="button"
                                role="radio"
                                aria-checked={isSelected}
                                className={`hz-book-slot-btn ${isSelected ? "is-selected" : ""}`}
                                onClick={() => setSelectedSlotIso(slot.slotIso)}
                              >
                                <span dir="ltr">{formatTimeChip(slot.slotIso)}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Graceful Fallback when live slots are full/offline */
                    <div className="hz-book-field">
                      <label htmlFor="preferredWindow">
                        {arabic ? "الوقت المفضل للاتصال *" : "Preferred Date & Time Window *"}
                      </label>
                      <input
                        id="preferredWindow"
                        className="hz-book-input"
                        value={preferredWindow}
                        onChange={(e) => setPreferredWindow(e.target.value)}
                        placeholder={
                          arabic
                            ? "مثال: الثلاثاء أو الأربعاء بين 14:00 و 17:00"
                            : "e.g. Tuesday or Wednesday, 2:00 PM – 5:00 PM"
                        }
                      />
                    </div>
                  )}

                  {/* Subtle Trust Micro-Strip (Desktop/Tablet) */}
                  <div className="hz-book-trust-strip" aria-hidden="true">
                    <span className="hz-book-trust-item">
                      <Calendar size={13} />
                      <span>{arabic ? "دعوة تقويم" : "Calendar invite"}</span>
                    </span>
                    <span className="hz-book-trust-item">
                      <Link2 size={13} />
                      <span>{arabic ? "رابط Google Meet" : "Google Meet link"}</span>
                    </span>
                    <span className="hz-book-trust-item">
                      <Bell size={13} />
                      <span>{arabic ? "تذكيرات تلقائية" : "Automatic reminders"}</span>
                    </span>
                    <span className="hz-book-trust-item">
                      <ShieldCheck size={13} />
                      <span>{arabic ? "سرية تامة (NDA)" : "Confidential (NDA-ready)"}</span>
                    </span>
                  </div>

                  <button
                    type="button"
                    className="hz-book-primary-btn"
                    disabled={!canProceedToDetails()}
                    onClick={() => {
                      setErrorMessage("");
                      setStep(2);
                    }}
                  >
                    <span>{arabic ? "المتابعة لإدخال بياناتك" : "Continue to Your Details"}</span>
                    <DirectionalArrow size={16} aria-hidden="true" />
                  </button>
                </>
              ) : null}

              {/* ================= STEP 2: YOUR DETAILS ================= */}
              {step === 2 ? (
                <>
                  {/* Selected Meeting Summary */}
                  <div className="hz-book-summary-bar">
                    <div className="hz-book-summary-meta">
                      <strong>
                        {!useFallbackWindow && selectedSlotIso
                          ? formatFullSlot(selectedSlotIso, timezone)
                          : preferredWindow}
                      </strong>
                      <span>
                        {arabic
                          ? `${duration} دقيقة · Google Meet · ${timezone}`
                          : `${duration} min · Google Meet · ${timezone}`}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="hz-book-change-btn"
                      onClick={() => {
                        setErrorMessage("");
                        setStep(1);
                      }}
                    >
                      {arabic ? "تغيير الوقت" : "Change"}
                    </button>
                  </div>

                  {errorMessage ? (
                    <div className="hz-book-alert-error" role="alert">
                      {errorMessage}{" "}
                      <a href={companyMailto("business")}>{COMPANY_EMAILS.business}</a>
                    </div>
                  ) : null}

                  <form className="hz-book-form" onSubmit={handleSubmit}>
                    {/* Anti-spam honeypot */}
                    <div className="hz-book-hp" aria-hidden="true">
                      <label htmlFor="book-website-hp">Website</label>
                      <input
                        id="book-website-hp"
                        name="website"
                        tabIndex={-1}
                        autoComplete="off"
                        value={honeypot}
                        onChange={(e) => setHoneypot(e.target.value)}
                      />
                    </div>

                    <div className="hz-book-form-row">
                      <div className="hz-book-field">
                        <label htmlFor="book-full-name">
                          {arabic ? "الاسم الكامل *" : "Full Name *"}
                        </label>
                        <input
                          id="book-full-name"
                          name="fullName"
                          required
                          maxLength={100}
                          autoComplete="name"
                          className="hz-book-input"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder={arabic ? "الاسم الكامل" : "Alex Morgan"}
                        />
                      </div>

                      <div className="hz-book-field">
                        <label htmlFor="book-work-email">
                          {arabic ? "البريد الإلكتروني للعمل *" : "Work Email *"}
                        </label>
                        <input
                          id="book-work-email"
                          name="email"
                          type="email"
                          required
                          maxLength={254}
                          autoComplete="email"
                          dir="ltr"
                          className="hz-book-input"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@company.com"
                        />
                      </div>
                    </div>

                    <div className="hz-book-form-row">
                      <div className="hz-book-field">
                        <label htmlFor="book-company">
                          {arabic ? "الشركة / المؤسسة *" : "Company / Organization *"}
                        </label>
                        <input
                          id="book-company"
                          name="company"
                          required
                          maxLength={120}
                          autoComplete="organization"
                          className="hz-book-input"
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          placeholder={arabic ? "اسم الشركة" : "Acme Corp"}
                        />
                      </div>

                      <div className="hz-book-field">
                        <label htmlFor="book-track">
                          {arabic ? "المجال " : "Topic "}
                          <span>{arabic ? "(اختياري)" : "(Optional)"}</span>
                        </label>
                        <select
                          id="book-track"
                          className="hz-book-input"
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
                    </div>

                    <div className="hz-book-field">
                      <label htmlFor="book-description">
                        {arabic ? "وصف مختصر للمشروع " : "Project Description "}
                        <span>{arabic ? "(اختياري)" : "(Optional)"}</span>
                      </label>
                      <textarea
                        id="book-description"
                        name="projectSummary"
                        maxLength={4000}
                        rows={3}
                        className="hz-book-textarea"
                        value={projectSummary}
                        onChange={(e) => setProjectSummary(e.target.value)}
                        placeholder={
                          arabic
                            ? "نبذة سريعة عما ترغب في بنائه أو تطويره..."
                            : "Brief context on what you're building or looking to solve..."
                        }
                      />
                    </div>

                    <label className="hz-book-consent">
                      <input
                        type="checkbox"
                        required
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                      />
                      <span>
                        {arabic ? (
                          <>
                            أوافق على استخدام بياناتي لتأكيد وإدارة هذا الاجتماع وفق{" "}
                            <Link href="/privacy">سياسة الخصوصية</Link>.
                          </>
                        ) : (
                          <>
                            I agree to HIRZEXA using these details to schedule and coordinate this
                            call under our <Link href="/privacy">Privacy Policy</Link>.
                          </>
                        )}
                      </span>
                    </label>

                    <div className="hz-book-form-actions">
                      <button
                        type="button"
                        className="hz-book-secondary-btn"
                        onClick={() => setStep(1)}
                      >
                        {arabic ? "رجوع" : "Back"}
                      </button>
                      <button
                        type="submit"
                        className="hz-book-primary-btn"
                        disabled={submitting}
                      >
                        <span>
                          {submitting
                            ? arabic
                              ? "جارٍ تأكيد الحجز..."
                              : "Confirming..."
                            : arabic
                            ? "تأكيد الحجز"
                            : "Confirm Booking"}
                        </span>
                        {!submitting ? <DirectionalArrow size={16} aria-hidden="true" /> : null}
                      </button>
                    </div>
                  </form>
                </>
              ) : null}

              {/* ================= STEP 3: MINIMAL CONFIRMATION SCREEN ================= */}
              {step === 3 && confirmed ? (
                <div className="hz-book-confirm">
                  <div className="hz-book-confirm-head">
                    <div className="hz-book-confirm-icon">
                      <CheckCircle2 size={22} />
                    </div>
                    <div>
                      <h2>{arabic ? "تم تأكيد اجتماعك" : "Your Meeting Is Confirmed"}</h2>
                      <p dir="ltr">{confirmed.referenceId}</p>
                    </div>
                  </div>

                  <div className="hz-book-confirm-details">
                    <div className="hz-book-confirm-kv">
                      <span>{arabic ? "التاريخ والوقت" : "Date & Time"}</span>
                      <strong>
                        {confirmed.scheduledSlotIso
                          ? formatFullSlot(confirmed.scheduledSlotIso, confirmed.timezone)
                          : preferredWindow}
                      </strong>
                    </div>
                    <div className="hz-book-confirm-kv">
                      <span>{arabic ? "المدة والمنطقة الزمنية" : "Duration & Timezone"}</span>
                      <strong dir="ltr">
                        {confirmed.durationMinutes} min · {confirmed.timezone}
                      </strong>
                    </div>
                    <div className="hz-book-confirm-kv" style={{ gridColumn: "1 / -1" }}>
                      <span>{arabic ? "رابط Google Meet" : "Google Meet"}</span>
                      {isVerifiedVideoUrl(confirmed.meetingLink) ? (
                        <a
                          href={confirmed.meetingLink!}
                          target="_blank"
                          rel="noreferrer"
                          dir="ltr"
                          style={{
                            color: "#34d399",
                            fontWeight: 600,
                            fontSize: 13.5,
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            wordBreak: "break-all",
                          }}
                        >
                          <Video size={14} />
                          <span>{confirmed.meetingLink}</span>
                          <ExternalLink size={12} />
                        </a>
                      ) : (
                        <strong style={{ color: "#cbd5e1", fontWeight: 500, fontSize: 13 }}>
                          {arabic
                            ? "جارٍ تجهيز رابط Google Meet الفريد وسيصلك عبر البريد قريباً."
                            : "Your unique Google Meet link is being finalized and will be sent via email."}
                        </strong>
                      )}
                    </div>
                  </div>

                  {/* Primary Join Google Meet CTA if available */}
                  {isVerifiedVideoUrl(confirmed.meetingLink) ? (
                    <a
                      href={confirmed.meetingLink!}
                      target="_blank"
                      rel="noreferrer"
                      className="hz-book-primary-btn"
                    >
                      <Video size={16} />
                      <span>
                        {isVerifiedGoogleMeetUrl(confirmed.meetingLink)
                          ? arabic
                            ? "الانضمام عبر Google Meet"
                            : "Join Google Meet"
                          : arabic
                          ? "الانضمام للاجتماع"
                          : "Join Video Meeting"}
                      </span>
                    </a>
                  ) : null}

                  {/* Add to Calendar (Apple / iPhone, Google, Outlook) */}
                  {confirmed.calendarLinks ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 600,
                          color: "#94a3b8",
                          textTransform: arabic ? "none" : "uppercase",
                          letterSpacing: arabic ? 0 : "0.06em",
                        }}
                      >
                        {arabic ? "إضافة إلى التقويم" : "Add to Calendar"}
                      </span>
                      <div className="hz-book-cal-actions">
                        {confirmed.icsContent ? (
                          <button
                            type="button"
                            className="hz-book-secondary-btn"
                            onClick={downloadIcsBlob}
                          >
                            <Calendar size={14} />
                            <span>{arabic ? "Apple / iPhone" : "Apple / iPhone"}</span>
                          </button>
                        ) : (
                          <a
                            href={confirmed.calendarLinks.icsDownloadPath}
                            className="hz-book-secondary-btn"
                          >
                            <Calendar size={14} />
                            <span>{arabic ? "Apple / iPhone" : "Apple / iPhone"}</span>
                          </a>
                        )}
                        <a
                          href={confirmed.calendarLinks.googleUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hz-book-secondary-btn"
                        >
                          <Calendar size={14} />
                          <span>Google</span>
                        </a>
                        <a
                          href={confirmed.calendarLinks.outlookUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hz-book-secondary-btn"
                        >
                          <Calendar size={14} />
                          <span>Outlook</span>
                        </a>
                      </div>
                    </div>
                  ) : null}

                  {/* Manage Booking — Opens in-place panel (never redirects to new booking page) */}
                  <button
                    type="button"
                    className="hz-book-secondary-btn"
                    style={{ width: "100%" }}
                    aria-expanded={showManageDrawer}
                    onClick={() => setShowManageDrawer((v) => !v)}
                  >
                    <span>{arabic ? "إدارة الحجز" : "Manage Booking"}</span>
                  </button>

                  {showManageDrawer ? (
                    <div className="hz-book-manage-panel">
                      <p>
                        {arabic
                          ? `المرجع ${confirmed.referenceId}: يمكنك طلب تعديل الموعد أو إلغائه مباشرة وسنقوم بتحديث الدعوة فوراً.`
                          : `Reference ${confirmed.referenceId}: Request a reschedule or cancellation directly and our team will update your invite immediately.`}
                      </p>
                      <div className="hz-book-manage-actions">
                        <a
                          href={companyMailto("business", `Reschedule Request — ${confirmed.referenceId}`)}
                          className="hz-book-secondary-btn"
                          style={{ flex: "1 1 160px" }}
                        >
                          {arabic ? "طلب إعادة جدولة" : "Request Reschedule"}
                        </a>
                        <a
                          href={companyMailto("business", `Cancel Meeting — ${confirmed.referenceId}`)}
                          className="hz-book-secondary-btn"
                          style={{ flex: "1 1 140px" }}
                        >
                          {arabic ? "إلغاء الموعد" : "Cancel Meeting"}
                        </a>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>
          </div>
        )}
      </main>

      {/* Subtle Engineering Pillars Bar (Desktop only, inspired by reference) */}
      <div className="hz-book-desktop-pillars" aria-hidden="true">
        <span>{arabic ? "موثوق من فرق هندسية رائدة" : "Trusted by innovative teams"}</span>
        <div className="hz-book-pillars-list">
          <span>{arabic ? "منصات SaaS" : "SaaS"}</span>
          <span>{arabic ? "الأتمتة" : "Automation"}</span>
          <span>{arabic ? "الذكاء الاصطناعي والبيانات" : "AI & Data"}</span>
          <span>{arabic ? "السحابة والتكامل" : "Cloud & Integration"}</span>
          <span>{arabic ? "الأنظمة المؤسسية" : "Enterprise Systems"}</span>
        </div>
      </div>

      {/* Minimal Enterprise Footer (Privacy & Contact only) */}
      <footer className="hz-book-footer">
        <div className="hz-book-footer-inner">
          <span>© {new Date().getFullYear()} HIRZEXA</span>
          <div className="hz-book-footer-links">
            <Link href="/privacy">{arabic ? "الخصوصية" : "Privacy"}</Link>
            <Link href="/contact">{arabic ? "تواصل معنا" : "Contact"}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
