import { NextResponse } from "next/server";
import { COMPANY_EMAILS } from "@/lib/company-emails";
import {
  buildCalendarLinks,
  createCrmLead,
  generateDiscoveryIcs,
  isVerifiedVideoMeetingUrl,
} from "@/lib/crm";
import {
  handleDiscoveryBookingCreated,
  provisionGoogleMeetForBooking,
} from "@/lib/crm-meetings/service";
import { emitBusinessEvent } from "@/lib/intelligence/events";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const emailPattern =
  /^[^\s@<>()[\]\\,;:\s@"]+@[^\s@<>()[\]\\,;:\s@"]+\.[^\s@<>()[\]\\,;:\s@"]{2,}$/;
const maxBodyLength = 18_000;
const maxUrlsInSummary = 4;

function singleLine(value: unknown) {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim()
    : "";
}

function multiLine(value: unknown) {
  return typeof value === "string"
    ? value.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "").trim()
    : "";
}

export async function POST(request: Request) {
  const ip = (
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "unknown"
  )
    .trim()
    .slice(0, 64);

  if (!checkRateLimit(`booking:${ip}`, 6, 60 * 60 * 1000)) {
    return NextResponse.json(
      {
        error: "Too many booking requests from this network. Please try again later.",
        fallbackEmail: COMPANY_EMAILS.business,
      },
      { status: 429, headers: { "Retry-After": "3600" } }
    );
  }

  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json(
      { error: "Invalid request format.", fallbackEmail: COMPANY_EMAILS.business },
      { status: 415 }
    );
  }

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > maxBodyLength) {
      return NextResponse.json(
        { error: "Submission is too large.", fallbackEmail: COMPANY_EMAILS.business },
        { status: 413 }
      );
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json(
        { error: "Invalid booking payload.", fallbackEmail: COMPANY_EMAILS.business },
        { status: 400 }
      );
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Invalid booking payload.", fallbackEmail: COMPANY_EMAILS.business },
      { status: 400 }
    );
  }

  // Honeypot anti-spam trap
  if (singleLine(body.website)) {
    return NextResponse.json(
      { error: "Invalid submission.", fallbackEmail: COMPANY_EMAILS.business },
      { status: 400 }
    );
  }

  const leadType = body.leadType === "proposal_request" ? "proposal_request" : "discovery_call";
  const fullName = singleLine(body.fullName || body.name);
  const email = singleLine(body.email).toLowerCase();
  const phone = singleLine(body.phone);
  const company = singleLine(body.company);
  const roleTitle = singleLine(body.roleTitle);
  const serviceTrack = singleLine(body.serviceTrack) || "AI Engineering & Intelligent Agents";
  const budgetRange = singleLine(body.budgetRange);
  const timeline = singleLine(body.timeline);
  const durationMinutes = Number(body.durationMinutes) === 20 ? 20 : 30;
  const scheduledSlotIso = singleLine(body.scheduledSlotIso) || null;
  const preferredWindow = singleLine(body.preferredWindow);
  const timezone = singleLine(body.timezone) || "UTC";
  const projectSummary = multiLine(body.projectSummary || body.overview);
  const currentStack = singleLine(body.currentStack);
  const consent = body.consent === true;
  const locale = body.locale === "ar" ? "ar" : "en";

  if (
    !fullName ||
    fullName.length < 2 ||
    fullName.length > 100 ||
    !emailPattern.test(email) ||
    email.length > 254 ||
    company.length > 120 ||
    roleTitle.length > 100 ||
    phone.length > 40 ||
    projectSummary.length < 15 ||
    projectSummary.length > 4000 ||
    !consent
  ) {
    return NextResponse.json(
      {
        error:
          locale === "ar"
            ? "يرجى إدخال الاسم وبريد العمل وملخص التحدي أو المشروع (15 حرفاً على الأقل) والموافقة على سياسة الخصوصية."
            : "Please provide your name, a valid work email, a project summary (at least 15 characters), and privacy consent.",
        fallbackEmail: COMPANY_EMAILS.business,
      },
      { status: 400 }
    );
  }

  const urlMatches = projectSummary.match(/https?:\/\/|www\./gi);
  if (urlMatches && urlMatches.length > maxUrlsInSummary) {
    return NextResponse.json(
      {
        error:
          locale === "ar"
            ? "تحتوي الرسالة على روابط كثيرة. يرجى وصف مشروعك مباشرة."
            : "Your message contains too many links. Please describe your project directly.",
        fallbackEmail: COMPANY_EMAILS.business,
      },
      { status: 400 }
    );
  }

  try {
    const result = await createCrmLead({
      leadType,
      fullName,
      email,
      phone: phone || undefined,
      company,
      roleTitle: roleTitle || undefined,
      serviceTrack,
      budgetRange: budgetRange || undefined,
      timeline: timeline || undefined,
      durationMinutes,
      scheduledSlotIso,
      preferredWindow: preferredWindow || undefined,
      timezone,
      projectSummary,
      currentStack: currentStack || undefined,
      consent,
      locale,
    });

    try {
      await emitBusinessEvent({
        eventType:
          result.lead.leadType === "discovery_call"
            ? "booking.created"
            : "proposal.created",
        module: result.lead.leadType === "discovery_call" ? "bookings" : "crm",
        severity: result.lead.scheduledSlotIso ? "attention" : "info",
        actorRef: result.lead.fullName,
        entityType: "lead",
        entityId: result.lead.id,
        title:
          result.lead.leadType === "discovery_call"
            ? `New discovery call: ${result.lead.company || result.lead.fullName}`
            : `New proposal request: ${result.lead.company || result.lead.fullName}`,
        summary: `${result.lead.referenceId} · ${result.lead.serviceTrack}${
          result.lead.scheduledSlotIso
            ? ` · ${new Date(result.lead.scheduledSlotIso).toUTCString()}`
            : ""
        }`,
        sourceHref: `/admin/crm?lead=${encodeURIComponent(result.lead.id)}`,
        idempotencyKey: `lead-created:${result.lead.id}`,
      });
    } catch {}

    let finalLead = result.lead;
    let finalIcs = result.icsContent;
    let finalCalendarLinks = result.calendarLinks;
    let meetStatus: "ready" | "failed" | "not_applicable" = "not_applicable";

    // Provision a verified unique Google Meet link via server-side Google Calendar OAuth.
    // On failure: booking is preserved, actionable error + admin alert + persistent retry job are recorded,
    // and NO fallback to /book?ref=... is used as a video meeting link.
    if (finalLead.leadType === "discovery_call" && finalLead.scheduledSlotIso) {
      const meetRes = await provisionGoogleMeetForBooking(finalLead);
      finalLead = meetRes.lead;
      meetStatus = meetRes.ok ? "ready" : "failed";

      finalIcs = generateDiscoveryIcs({
        referenceId: finalLead.referenceId,
        fullName: finalLead.fullName,
        email: finalLead.email,
        company: finalLead.company,
        serviceTrack: finalLead.serviceTrack,
        durationMinutes: finalLead.durationMinutes,
        scheduledSlotIso: finalLead.scheduledSlotIso!,
        meetingLink: isVerifiedVideoMeetingUrl(finalLead.meetingLink)
          ? finalLead.meetingLink
          : undefined,
        projectSummary: finalLead.projectSummary,
      });
      finalCalendarLinks = buildCalendarLinks(finalLead);
    }

    // Never send an automated confirmation email claiming a Meet link exists if Meet creation failed.
    // Automatic customer confirmation emails also remain gated behind DISCOVERY_AUTO_EMAILS_ENABLED=true.
    let confirmationStatus: string = "not_applicable";
    let scheduledRemindersCount = 0;
    if (finalLead.leadType === "discovery_call" && finalLead.scheduledSlotIso) {
      if (process.env.DISCOVERY_AUTO_EMAILS_ENABLED !== "true") {
        confirmationStatus = "manual_review_pending";
      } else if (!isVerifiedVideoMeetingUrl(finalLead.meetingLink)) {
        confirmationStatus = "held_pending_meet_link";
      } else {
        try {
          const commRes = await handleDiscoveryBookingCreated(finalLead);
          confirmationStatus = commRes.confirmation?.status || "not_sent";
          scheduledRemindersCount = commRes.scheduledReminders.length;
        } catch {
          confirmationStatus = "failed";
        }
      }
    }

    return NextResponse.json(
      {
        ok: true,
        referenceId: finalLead.referenceId,
        stage: finalLead.stage,
        leadType: finalLead.leadType,
        scheduledSlotIso: finalLead.scheduledSlotIso,
        durationMinutes: finalLead.durationMinutes,
        timezone: finalLead.timezone,
        meetingLink: isVerifiedVideoMeetingUrl(finalLead.meetingLink)
          ? finalLead.meetingLink
          : null,
        meetProvisioningStatus: meetStatus,
        calendarLinks: finalCalendarLinks,
        icsContent: finalIcs,
        routedTo: COMPANY_EMAILS.business,
        confirmationStatus,
        scheduledRemindersCount,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "SLOT_ALREADY_RESERVED") {
      return NextResponse.json(
        {
          error:
            locale === "ar"
              ? "تم حجز هذا الموعد للتو. يرجى اختيار وقت آخر من القائمة المتاحة."
              : "This time slot was just reserved. Please select another available slot.",
          code: "SLOT_ALREADY_RESERVED",
          fallbackEmail: COMPANY_EMAILS.business,
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error:
          locale === "ar"
            ? "تعذر تسجيل الحجز حالياً. يمكنك مراسلتنا مباشرة على:"
            : "Could not complete your booking right now. Please contact us directly at:",
        fallbackEmail: COMPANY_EMAILS.business,
      },
      { status: 500 }
    );
  }
}
