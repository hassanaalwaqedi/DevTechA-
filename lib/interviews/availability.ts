import {
  isValidIanaTimezone,
  type AvailableInterviewSlot,
  type InterviewAppointmentRecord,
  type InterviewerAvailabilityException,
  type InterviewerAvailabilityRule,
} from "@/lib/interviews/types";

/**
 * Converts a local wall-clock date (YYYY-MM-DD) + minutes-since-midnight inside
 * any IANA time zone into an exact UTC Date, correctly handling Daylight Saving
 * Time (DST) transitions without external timezone libraries.
 */
export function zonedDateTimeToUtc(
  year: number,
  month: number, // 1..12
  day: number, // 1..31
  minutesFromMidnight: number,
  timeZone: string
): Date {
  const safeTz = isValidIanaTimezone(timeZone) ? timeZone : "UTC";
  const hour = Math.floor(minutesFromMidnight / 60);
  const minute = minutesFromMidnight % 60;

  // Initial UTC guess equal to the wall-clock fields
  const guessMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0);

  // Compute the timezone offset at `guessMs` (and refine once for DST boundaries)
  const getOffsetMs = (utcMs: number): number => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: safeTz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(new Date(utcMs));
    const num = (type: string) => {
      const v = Number(parts.find((p) => p.type === type)?.value ?? 0);
      return type === "hour" && v === 24 ? 0 : v;
    };
    const asUtc = Date.UTC(
      num("year"),
      num("month") - 1,
      num("day"),
      num("hour"),
      num("minute"),
      num("second")
    );
    return asUtc - utcMs;
  };

  const offset1 = getOffsetMs(guessMs);
  const refinedMs = guessMs - offset1;
  const offset2 = getOffsetMs(refinedMs);
  return new Date(guessMs - offset2);
}

function getDatePartsInTz(date: Date, timeZone: string): {
  year: number;
  month: number;
  day: number;
  dayOfWeek: number;
  dateKey: string;
} {
  const safeTz = isValidIanaTimezone(timeZone) ? timeZone : "UTC";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);

  const year = Number(parts.find((p) => p.type === "year")?.value || 2026);
  const month = Number(parts.find((p) => p.type === "month")?.value || 1);
  const day = Number(parts.find((p) => p.type === "day")?.value || 1);
  const wk = parts.find((p) => p.type === "weekday")?.value || "Mon";
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    year,
    month,
    day,
    dayOfWeek: dayMap[wk] ?? 1,
    dateKey: `${year}-${pad(month)}-${pad(day)}`,
  };
}

/**
 * Computes genuinely available interview slots strictly from:
 * - The interviewer's configured working-hour rules (returns [] if none configured — ZERO fictional slots!)
 * - Date exceptions (holidays, absences, custom day windows)
 * - Minimum notice hours, before/after buffers, and maximum advance window
 * - Invitation availability window start/end (if specified)
 * - Existing confirmed appointments for that interviewer (subtracting buffers)
 */
export function computeAvailableInterviewSlots(params: {
  rules: InterviewerAvailabilityRule[];
  exceptions: InterviewerAvailabilityException[];
  existingConfirmedAppointments: InterviewAppointmentRecord[];
  durationMinutes: number;
  candidateTimezone: string;
  windowStartDate?: string | null;
  windowEndDate?: string | null;
  excludeAppointmentId?: string | null;
  now?: Date;
  locale?: "en" | "ar";
}): AvailableInterviewSlot[] {
  const activeRules = params.rules.filter((r) => r.isActive);
  if (activeRules.length === 0) {
    return [];
  }

  const now = params.now || new Date();
  const safeCandidateTz = isValidIanaTimezone(params.candidateTimezone)
    ? params.candidateTimezone
    : "UTC";
  const primaryTz = isValidIanaTimezone(activeRules[0].timezone)
    ? activeRules[0].timezone
    : "UTC";
  const maxAdvanceDays = Math.min(
    90,
    Math.max(1, Math.max(...activeRules.map((r) => r.maxAdvanceDays || 21)))
  );
  const minNoticeMs = Math.max(0, activeRules[0].minNoticeHours ?? 12) * 3600_000;
  const bufferBeforeMs = Math.max(0, activeRules[0].bufferBeforeMinutes ?? 10) * 60_000;
  const bufferAfterMs = Math.max(0, activeRules[0].bufferAfterMinutes ?? 10) * 60_000;
  const durationMs = Math.max(15, params.durationMinutes) * 60_000;
  const stepMinutes = params.durationMinutes <= 20 ? 20 : 30;

  const busyIntervals = params.existingConfirmedAppointments
    .filter(
      (a) =>
        a.status === "confirmed" &&
        (!params.excludeAppointmentId || a.id !== params.excludeAppointmentId)
    )
    .map((a) => ({
      startMs: new Date(a.scheduledStartUtc).getTime() - bufferBeforeMs,
      endMs: new Date(a.scheduledEndUtc).getTime() + bufferAfterMs,
    }));

  const exceptionsByDate = new Map<string, InterviewerAvailabilityException[]>();
  for (const exc of params.exceptions) {
    const list = exceptionsByDate.get(exc.exceptionDate) || [];
    list.push(exc);
    exceptionsByDate.set(exc.exceptionDate, list);
  }

  const earliestAllowedMs = now.getTime() + minNoticeMs;
  const slots: AvailableInterviewSlot[] = [];
  const seenStarts = new Set<string>();
  const timeFormatter = new Intl.DateTimeFormat(
    params.locale === "ar" ? "ar-SA" : "en-US",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: safeCandidateTz,
    }
  );

  for (let dayOffset = 0; dayOffset <= maxAdvanceDays; dayOffset++) {
    const probeDate = new Date(now.getTime() + dayOffset * 86400_000);
    const { year, month, day, dayOfWeek, dateKey } = getDatePartsInTz(probeDate, primaryTz);

    if (params.windowStartDate && dateKey < params.windowStartDate) continue;
    if (params.windowEndDate && dateKey > params.windowEndDate) continue;

    const dayExceptions = exceptionsByDate.get(dateKey) || [];
    // If full-day unavailable exception exists, skip entire date
    if (
      dayExceptions.some(
        (e) => e.isUnavailable && (e.startMinute == null || e.endMinute == null)
      )
    ) {
      continue;
    }

    // Determine daily working windows (either custom override or recurring weekday rules)
    const customOpenWindows = dayExceptions
      .filter((e) => !e.isUnavailable && e.startMinute != null && e.endMinute != null)
      .map((e) => ({ startMinute: e.startMinute!, endMinute: e.endMinute! }));

    const dayRules =
      customOpenWindows.length > 0
        ? customOpenWindows
        : activeRules
            .filter((r) => r.dayOfWeek === dayOfWeek)
            .map((r) => ({ startMinute: r.startMinute, endMinute: r.endMinute }));

    const partialBlocks = dayExceptions
      .filter((e) => e.isUnavailable && e.startMinute != null && e.endMinute != null)
      .map((e) => ({ startMinute: e.startMinute!, endMinute: e.endMinute! }));

    for (const win of dayRules) {
      for (
        let minute = win.startMinute;
        minute + params.durationMinutes <= win.endMinute;
        minute += stepMinutes
      ) {
        const endMinute = minute + params.durationMinutes;
        const blockedByException = partialBlocks.some(
          (b) => minute < b.endMinute && endMinute > b.startMinute
        );
        if (blockedByException) continue;

        const startDate = zonedDateTimeToUtc(year, month, day, minute, primaryTz);
        const startMs = startDate.getTime();
        const endMs = startMs + durationMs;

        if (startMs < earliestAllowedMs) continue;

        const conflicts = busyIntervals.some(
          (busy) => startMs < busy.endMs && endMs > busy.startMs
        );
        if (conflicts) continue;

        const startIso = startDate.toISOString();
        if (seenStarts.has(startIso)) continue;
        seenStarts.add(startIso);

        const candParts = getDatePartsInTz(startDate, safeCandidateTz);
        slots.push({
          startUtc: startIso,
          endUtc: new Date(endMs).toISOString(),
          dateKeyCandidate: candParts.dateKey,
          labelCandidate: timeFormatter.format(startDate),
          dateKeyInterviewer: dateKey,
        });
      }
    }
  }

  return slots.sort(
    (a, b) => new Date(a.startUtc).getTime() - new Date(b.startUtc).getTime()
  );
}
