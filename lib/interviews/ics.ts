import { OFFICIAL_CAREERS_EMAIL, OFFICIAL_WEBSITE_URL } from "@/lib/email/transactional";
import {
  INTERVIEW_FORMAT_LABELS,
  INTERVIEW_TYPE_LABELS,
  type InterviewAppointmentRecord,
} from "@/lib/interviews/types";

function formatIcsUtc(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export function generateInterviewIcs(
  appointment: Pick<
    InterviewAppointmentRecord,
    | "id"
    | "applicationReferenceId"
    | "candidateName"
    | "candidateEmail"
    | "positionTitle"
    | "interviewType"
    | "interviewFormat"
    | "durationMinutes"
    | "interviewerName"
    | "interviewerEmail"
    | "scheduledStartUtc"
    | "scheduledEndUtc"
    | "meetingUrl"
    | "locationDetails"
  >,
  method: "REQUEST" | "CANCEL" = "REQUEST"
): string {
  const typeLabel = INTERVIEW_TYPE_LABELS[appointment.interviewType]?.en || "Interview";
  const formatLabel = INTERVIEW_FORMAT_LABELS[appointment.interviewFormat]?.en || "Interview";
  const summary = `HIRZEXA Interview — ${appointment.positionTitle} (${typeLabel})`;
  const location =
    appointment.meetingUrl ||
    appointment.locationDetails ||
    `${formatLabel} (details provided by HIRZEXA Talent Acquisition)`;

  const descriptionLines = [
    `HIRZEXA Talent Acquisition — ${typeLabel}`,
    `Position: ${appointment.positionTitle}`,
    `Candidate: ${appointment.candidateName}`,
    `Interviewer: ${appointment.interviewerName}`,
    `Format: ${formatLabel} (${appointment.durationMinutes} min)`,
    `Application Ref: ${appointment.applicationReferenceId}`,
    appointment.meetingUrl ? `Meeting Link: ${appointment.meetingUrl}` : null,
    appointment.locationDetails ? `Location / Instructions: ${appointment.locationDetails}` : null,
    `Contact: ${OFFICIAL_CAREERS_EMAIL}`,
  ].filter((l): l is string => Boolean(l));

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HIRZEXA//Talent Acquisition Scheduling//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${method}`,
    "BEGIN:VEVENT",
    `UID:interview-${appointment.id}@hirzexa.com`,
    `DTSTAMP:${formatIcsUtc(new Date().toISOString())}`,
    `DTSTART:${formatIcsUtc(appointment.scheduledStartUtc)}`,
    `DTEND:${formatIcsUtc(appointment.scheduledEndUtc)}`,
    `SUMMARY:${escapeIcs(summary)}`,
    `DESCRIPTION:${escapeIcs(descriptionLines.join("\n"))}`,
    `LOCATION:${escapeIcs(location)}`,
    `ORGANIZER;CN=HIRZEXA Careers:mailto:${OFFICIAL_CAREERS_EMAIL}`,
    `ATTENDEE;CN=${escapeIcs(appointment.candidateName)};RSVP=TRUE:mailto:${appointment.candidateEmail}`,
    `ATTENDEE;CN=${escapeIcs(appointment.interviewerName)};RSVP=TRUE:mailto:${appointment.interviewerEmail}`,
    `STATUS:${method === "CANCEL" ? "CANCELLED" : "CONFIRMED"}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT24H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Reminder: HIRZEXA Interview in 24 hours",
    "END:VALARM",
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Reminder: HIRZEXA Interview in 1 hour",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function buildInterviewCalendarLinks(appointment: InterviewAppointmentRecord) {
  const start = new Date(appointment.scheduledStartUtc);
  const end = new Date(appointment.scheduledEndUtc);
  const typeLabel = INTERVIEW_TYPE_LABELS[appointment.interviewType]?.en || "Interview";
  const formatLabel = INTERVIEW_FORMAT_LABELS[appointment.interviewFormat]?.en || "Interview";
  const title = `HIRZEXA Interview — ${appointment.positionTitle} (${typeLabel})`;
  const location = appointment.meetingUrl || appointment.locationDetails || OFFICIAL_WEBSITE_URL;
  const details = [
    `Position: ${appointment.positionTitle}`,
    `Stage: ${typeLabel}`,
    `Format: ${formatLabel} (${appointment.durationMinutes} min)`,
    `Interviewer: ${appointment.interviewerName}`,
    appointment.meetingUrl ? `Meeting Link: ${appointment.meetingUrl}` : null,
    appointment.locationDetails ? `Location: ${appointment.locationDetails}` : null,
    `Contact: ${OFFICIAL_CAREERS_EMAIL}`,
  ]
    .filter(Boolean)
    .join("\n");

  const googleParams = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${formatIcsUtc(start.toISOString())}/${formatIcsUtc(end.toISOString())}`,
    details,
    location,
  });

  const outlookParams = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: title,
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    body: details,
    location,
  });

  return {
    googleUrl: `https://calendar.google.com/calendar/render?${googleParams.toString()}`,
    outlookUrl: `https://outlook.live.com/calendar/0/deeplink/compose?${outlookParams.toString()}`,
  };
}
