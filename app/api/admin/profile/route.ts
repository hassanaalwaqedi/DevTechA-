import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import { recordAuditLog } from "@/lib/intelligence/audit";
import { updateEmployeeRecord } from "@/lib/intelligence/employees";
import { hasPermission, RbacDeniedError } from "@/lib/rbac";

export const runtime = "nodejs";

const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  jobTitle: z.string().trim().max(120).optional(),
  department: z.string().trim().max(80).optional(),
});

export async function PATCH(request: Request) {
  let actor;
  try {
    ({ actor } = await requireAdminApi());
  } catch (error) {
    if (error instanceof RbacDeniedError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  // Department is an authorization scope boundary (`team` scope checks actor.department).
  // Non-privileged users must not self-modify their department to access another team's records.
  const canEditDepartment = actor.isSuperAdmin || hasPermission(actor, "team", "edit");
  const requestedDeptChange =
    parsed.data.department !== undefined &&
    parsed.data.department.trim().toLowerCase() !== actor.department.trim().toLowerCase();

  if (requestedDeptChange && !canEditDepartment) {
    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.roleKey,
      module: "settings",
      action: "update_profile",
      entityType: "employee",
      entityId: actor.employeeId,
      outcome: "denied",
      summary: `Blocked self-service department reassignment attempt ("${actor.department}" -> "${parsed.data.department}").`,
    });
    return NextResponse.json(
      { error: "Department changes require Team administration permission." },
      { status: 403 }
    );
  }

  const updated = await updateEmployeeRecord(actor.employeeId, {
    fullName: parsed.data.fullName,
    jobTitle: parsed.data.jobTitle,
    department: canEditDepartment ? parsed.data.department : undefined,
  });

  if (!updated) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  await recordAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.roleKey,
    module: "settings",
    action: "update_profile",
    entityType: "employee",
    entityId: updated.id,
    outcome: "allowed",
    summary: `Updated personal profile (${updated.fullName}).`,
  });

  return NextResponse.json({ ok: true, profile: updated });
}
