import { NextRequest, NextResponse } from "next/server";
import { getPublicInterviewIcsByToken } from "@/lib/interviews/service";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";
  if (!checkRateLimit(`interview-public-ics:${ip}`, 60, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  const token = request.nextUrl.searchParams.get("token") || "";
  const result = await getPublicInterviewIcsByToken(token);
  if (!result.ok || !result.ics) {
    return NextResponse.json({ error: "Calendar file unavailable." }, { status: 404 });
  }

  return new NextResponse(result.ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${result.filename || "hirzexa-interview.ics"}"`,
      "Cache-Control": "no-store",
    },
  });
}
