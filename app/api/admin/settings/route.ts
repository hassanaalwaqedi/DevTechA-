import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth";
import { RbacDeniedError } from "@/lib/rbac";
import { getSettingsDiagnosticsSnapshot } from "@/lib/settings/diagnostics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { actor } = await requirePermissionApi("settings", "view");
    const snapshot = await getSettingsDiagnosticsSnapshot(actor);
    return NextResponse.json(
      { ok: true, snapshot },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    if (err instanceof RbacDeniedError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const msg = err instanceof Error ? err.message : "";
    if (/unauthor|session|suspend|sign in|login/i.test(msg)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unable to load workspace settings." }, { status: 500 });
  }
}
