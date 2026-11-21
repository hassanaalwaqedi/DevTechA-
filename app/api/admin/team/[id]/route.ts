import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermissionApi } from "@/lib/auth";
import { recordAuditLog } from "@/lib/intelligence/audit";
import { listEmployees, updateEmployeeRecord } from "@/lib/intelligence/employees";
import { emitBusinessEvent } from "@/lib/intelligence/events";
import {
  ACCESS_SCOPES,
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  RbacDeniedError,
  ROLE_KEYS,
} from "@/lib/rbac";

export const runtime = "nodejs";

const patchEmployeeSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  jobTitle: z.string().trim().max(120).optional(),
  department: z.string().trim().max(80).optional(),
  roleKey: z.enum(ROLE_KEYS).optional(),
  scopeOverride: z.enum(ACCESS_SCOPES).nullable().optional(),
  permissionOverrides: z
    .record(z.enum(PERMISSION_MODULES), z.array(z.enum(PERMISSION_ACTIONS)))
    .optional(),
  status: z.enum(["invited", "active", "suspended"]).optional(),
  revokeSessions: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let actor;
  try {
    ({ actor } = await requirePermissionApi("team", "edit"));
  } catch (error) {
    if (error instanceof RbacDeniedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = patchEmployeeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  const allEmployees = await listEmployees();
  const target = allEmployees.find((e) => e.id === id);
  if (!target) {
    return NextResponse.json({ error: "Employee account not found." }, { status: 404 });
  }

  // Protect Super Admin accounts from modification by non-Super Admins
  if (target.roleKey === "super_admin" && !actor.isSuperAdmin) {
    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.roleKey,
      module: "team",
      action: "edit",
      entityType: "employee",
      entityId: target.id,
      outcome: "denied",
      summary: `Blocked non-Super Admin attempt to modify Super Admin account ${target.email}.`,
    });
    return NextResponse.json(
      { error: "Only a Super Admin can modify another Super Admin account." },
      { status: 403 }
    );
  }

  // Prevent privilege escalation to Super Admin
  if (parsed.data.roleKey === "super_admin" && !actor.isSuperAdmin) {
    return NextResponse.json(
      { error: "Only a Super Admin can assign the Super Admin role." },
      { status: 403 }
    );
  }

  // Prevent self-suspension or self-privilege modification
  if (id === actor.employeeId) {
    if (parsed.data.status === "suspended") {
      return NextResponse.json(
        { error: "You cannot suspend your own active account." },
        { status: 400 }
      );
    }
    if (
      parsed.data.roleKey !== undefined ||
      parsed.data.scopeOverride !== undefined ||
      parsed.data.permissionOverrides !== undefined
    ) {
      return NextResponse.json(
        { error: "You cannot modify your own role, scope, or permission overrides." },
        { status: 403 }
      );
    }
  }

  // Prevent non-Super Admins from granting privileged team/audit manage overrides
  if (!actor.isSuperAdmin && parsed.data.permissionOverrides) {
    const teamActs = parsed.data.permissionOverrides.team || [];
    const auditActs = parsed.data.permissionOverrides.audit || [];
    if (
      teamActs.includes("manage") ||
      teamActs.includes("delete") ||
      auditActs.includes("manage")
    ) {
      return NextResponse.json(
        { error: "Only a Super Admin can grant team or audit management overrides." },
        { status: 403 }
      );
    }
  }

  // Protect the organization from accidentally losing its last active Super Admin
  if (target.roleKey === "super_admin" && target.status === "active") {
    const wouldLoseSuperAdmin =
      (parsed.data.status && parsed.data.status !== "active") ||
      (parsed.data.roleKey && parsed.data.roleKey !== "super_admin");
    if (wouldLoseSuperAdmin) {
      const activeSuperAdmins = allEmployees.filter(
        (e) => e.roleKey === "super_admin" && e.status === "active"
      );
      if (activeSuperAdmins.length <= 1) {
        return NextResponse.json(
          {
            error:
              "Cannot suspend or downgrade the last active Super Admin account. Assign another active Super Admin first.",
          },
          { status: 400 }
        );
      }
    }
  }

  const updated = await updateEmployeeRecord(id, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "Employee account not found." }, { status: 404 });
  }

  await recordAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.roleKey,
    module: "team",
    action: parsed.data.revokeSessions ? "revoke_sessions" : "edit",
    entityType: "employee",
    entityId: updated.id,
    outcome: "allowed",
    summary: parsed.data.revokeSessions
      ? `Revoked active sessions for ${updated.email} (session_version=${updated.sessionVersion}).`
      : `Updated employee ${updated.email} (role=${updated.roleKey}, scope=${updated.scopeOverride || "default"}, status=${updated.status}).`,
    metadata: {
      previousRole: target.roleKey,
      roleKey: updated.roleKey,
      previousScope: target.scopeOverride || "default",
      scopeOverride: updated.scopeOverride || "default",
      previousStatus: target.status,
      status: updated.status,
      sessionVersion: updated.sessionVersion,
    },
  });

  try {
    await emitBusinessEvent({
      eventType: "employee.updated",
      module: "team",
      severity: updated.status === "suspended" ? "attention" : "info",
      actorRef: actor.email,
      entityType: "employee",
      entityId: updated.id,
      title: parsed.data.revokeSessions
        ? `Sessions revoked: ${updated.fullName}`
        : updated.status === "suspended" && target.status !== "suspended"
        ? `Account suspended: ${updated.fullName}`
        : `Access updated: ${updated.fullName}`,
      summary: `${updated.email} updated by ${actor.fullName} (role=${updated.roleKey}, status=${updated.status}).`,
      sourceHref: "/admin/team",
    });
  } catch {}

  return NextResponse.json({
    ok: true,
    employee: updated,
    sessionRevoked: updated.sessionVersion > target.sessionVersion,
  });
}
