import { NextResponse } from "next/server";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const visitorIdPattern = /^[a-z0-9-]{20,80}$/i;
const pathPattern = /^\/(?!\/)[^\u0000-\u001f\s]{1,200}$/;
const jobPathPattern = /^\/careers\/([a-z0-9]+(?:-[a-z0-9]+)*)$/i;

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return new NextResponse(null, {status: 204});

  try {
    const body = await request.json() as {path?: unknown; visitorId?: unknown};
    const path = typeof body.path === "string" ? body.path : "";
    const visitorId = typeof body.visitorId === "string" ? body.visitorId : "";
    if (!pathPattern.test(path) || !visitorIdPattern.test(visitorId)) return new NextResponse(null, {status: 204});
    if (!checkRateLimit(`visitor:${visitorId}`, 120, 10 * 60 * 1000)) return new NextResponse(null, {status: 204});

    const jobMatch = path.match(jobPathPattern);
    const supabase = await createSupabaseServerClient();
    const {error} = await supabase.from("visitor_events").insert({
      path,
      visitor_id: visitorId,
      job_slug: jobMatch?.[1].toLowerCase() || null,
    });
    if (error) throw error;
    return new NextResponse(null, {status: 204});
  } catch (error) {
    console.error("[analytics] page view failed", error);
    return new NextResponse(null, {status: 204});
  }
}
