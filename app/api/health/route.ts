import { NextResponse } from "next/server";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({status: "error", database: "not_configured"}, {status: 503});
  const started = Date.now();
  try {
    const supabase = await createSupabaseServerClient();
    const {error: jobsError} = await supabase.from("jobs").select("id", {count: "exact", head: true});
    if (jobsError) return NextResponse.json({status: "error", database: "unreachable"}, {status: 503});
    const {error: applicationsError} = await supabase.from("job_applications").select("id,cv_path,cover_letter_path", {count: "exact", head: true});
    if (applicationsError) return NextResponse.json({status: "error", database: "schema_incomplete"}, {status: 503});
    return NextResponse.json({status: "ok", database: "connected", applications: "ready", latencyMs: Date.now() - started});
  } catch {
    return NextResponse.json({status: "error", database: "unreachable"}, {status: 503});
  }
}
