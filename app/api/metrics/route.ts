import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth";
import { getMetrics } from "@/lib/db";
import { RbacDeniedError } from "@/lib/rbac";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requirePermissionApi("dashboard", "view");
    return NextResponse.json(await getMetrics());
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
