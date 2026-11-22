import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import {
  generateDiscoveryIcs,
  getAuthorizedCrmLeadById,
  getCrmLeadByReference,
  verifyBookingIcsSignature,
} from "@/lib/crm";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { hasPermission } from "@/lib/rbac";
import { SITE_URL } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAFE_REF_PATTERN = /^[A-Za-z0-9_-]{4,64}$/;

export async function GET(request: Request) {
  const ip = getClientIp(request.headers);
  if (!checkRateLimit(`booking-ics:${ip}`, 30, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many calendar requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": "900", "Cache-Control": "no-store" } }
    );
  }

  const { searchParams } = new URL(request.url);
  const ref = (searchParams.get("ref") || "").trim();
  if (!ref || !SAFE_REF_PATTERN.test(ref)) {
    return NextResponse.json(
      { error: "Invalid or missing booking reference." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const sig = searchParams.get("sig");
  const hasValidSignature = verifyBookingIcsSignature(ref, sig);

  let authorizedAdmin = false;
  let adminActor = null;
  if (!hasValidSignature) {
    try {
      const current = await getCurrentAdmin();
      if (
        current &&
        (hasPermission(current.actor, "crm", "view") ||
          hasPermission(current.actor, "bookings", "view"))
      ) {
        authorizedAdmin = true;
        adminActor = current.actor;
      }
    } catch {
      authorizedAdmin = false;
    }
  }

  if (!hasValidSignature && !authorizedAdmin) {
    return NextResponse.json(
      { error: "A valid signed booking link or authorized session is required to download this calendar invite." },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }

  let lead = await getCrmLeadByReference(ref);
  if (lead && authorizedAdmin && adminActor) {
    const scoped = await getAuthorizedCrmLeadById(adminActor, lead.id);
    if (scoped.denied) {
      return NextResponse.json(
        { error: "Forbidden: booking falls outside your authorized scope." },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }
    lead = scoped.lead;
  }

  const rawSlot = searchParams.get("slot");
  const parsedSlot = rawSlot ? new Date(rawSlot) : null;
  const slotIso =
    lead?.scheduledSlotIso ||
    (parsedSlot && !Number.isNaN(parsedSlot.getTime())
      ? parsedSlot.toISOString()
      : new Date(Date.now() + 86400_000).toISOString());
  const duration = lead?.durationMinutes || (Number(searchParams.get("duration")) === 20 ? 20 : 30);

  const ics = generateDiscoveryIcs({
    referenceId: lead?.referenceId || ref,
    fullName: lead?.fullName || "Client",
    email: lead?.email || "business@hirzexa.com",
    company: lead?.company || "Discovery Call",
    serviceTrack: lead?.serviceTrack || "AI & Software Engineering",
    durationMinutes: duration,
    scheduledSlotIso: slotIso,
    meetingLink: lead?.meetingLink || `${SITE_URL}/book?ref=${encodeURIComponent(ref)}`,
    projectSummary: lead?.projectSummary || "HIRZEXA Engineering Discovery Call",
  });

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="hirzexa-discovery-${ref.replace(/[^a-zA-Z0-9_-]/g, "")}.ics"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
