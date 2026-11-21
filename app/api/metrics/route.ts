import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth";
import { getScopedMetrics } from "@/lib/authorization";
import { RbacDeniedError } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { actor } = await requirePermissionApi("dashboard", "view");
    const metrics = await getScopedMetrics(actor);
    return NextResponse.json(
      metrics || {
        totalVisitors: null,
        visitorsToday: null,
        totalApplications: null,
        applicationsToday: null,
        activeJobs: null,
        newApplications: null,
        shortlisted: null,
        interviews: null,
      }
    );
  } catch (error) {
    if (error instanceof RbacDeniedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed." },
      { status: 401 }
    );
  }
}
