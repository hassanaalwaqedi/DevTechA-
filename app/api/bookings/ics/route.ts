import { NextResponse } from "next/server";
import { generateDiscoveryIcs, getCrmLeadByReference } from "@/lib/crm";
import { SITE_URL } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ref = (searchParams.get("ref") || "").trim();
  if (!ref) {
    return NextResponse.json({ error: "Missing booking reference." }, { status: 400 });
  }

  const lead = await getCrmLeadByReference(ref);
  const slotIso = lead?.scheduledSlotIso || searchParams.get("slot") || new Date(Date.now() + 86400_000).toISOString();
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
      "Cache-Control": "no-store",
    },
  });
}
