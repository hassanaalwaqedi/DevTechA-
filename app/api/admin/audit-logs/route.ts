import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth";
import { listAuditLogs } from "@/lib/intelligence/audit";
import { RbacDeniedError } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requirePermissionApi("audit", "view");
    const { searchParams } = new URL(request.url);
    const moduleFilter = searchParams.get("module") || "all";
    const outcomeFilter = searchParams.get("outcome") || "all";
    const limit = Number(searchParams.get("limit")) || 100;

    const logs = await listAuditLogs({
      module: moduleFilter,
      outcome: outcomeFilter,
      limit,
    });
    return NextResponse.json({ ok: true, logs });
  } catch (error) {
    if (error instanceof RbacDeniedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
