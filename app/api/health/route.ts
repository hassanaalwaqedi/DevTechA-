import { NextResponse } from "next/server";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({status: "error", database: "not_configured"}, {status: 503});
  const started = Date.now();
  try {
    const supabase = await createSupabaseServerClient();
    const {error} = await supabase.from("jobs").select("id", {count: "exact", head: true});
    if (error) return NextResponse.json({status: "error", database: "unreachable"}, {status: 503});
    return NextResponse.json({status: "ok", database: "connected", latencyMs: Date.now() - started});
  } catch {
    return NextResponse.json({status: "error", database: "unreachable"}, {status: 503});
  }
}
