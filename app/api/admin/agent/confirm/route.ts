import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermissionApi } from "@/lib/auth";
import { confirmAndExecutePendingAction } from "@/lib/intelligence/tools";
import { RbacDeniedError } from "@/lib/rbac";

export const runtime = "nodejs";

const confirmSchema = z.object({
  actionId: z.string().trim().min(4).max(120),
  decision: z.enum(["approve", "reject"]),
});

export async function POST(request: Request) {
  let actor;
  try {
    ({ actor } = await requirePermissionApi("agent", "view"));
  } catch (error) {
    if (error instanceof RbacDeniedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = confirmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid confirmation payload." }, { status: 400 });
  }

  try {
    const result = await confirmAndExecutePendingAction(
      actor,
      parsed.data.actionId,
      parsed.data.decision
    );
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    if (error instanceof RbacDeniedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Execution failed." },
      { status: 500 }
    );
  }
}
