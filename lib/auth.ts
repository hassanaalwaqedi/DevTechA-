import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveOrBootstrapActor } from "@/lib/intelligence/employees";
import { recordAuditLog } from "@/lib/intelligence/audit";
import {
  assertPermission,
  RbacDeniedError,
  type AuthActor,
  type PermissionAction,
  type PermissionModule,
} from "@/lib/rbac";

export const SESSION_VERSION_COOKIE = "hirzexa_sv";

export async function getCurrentAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: admin } = await supabase
    .from("admin_users")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  let mfaEnrolled = false;
  try {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    mfaEnrolled = Boolean(
      factors?.totp?.some((f) => f.status === "verified") ||
        factors?.phone?.some((f) => f.status === "verified")
    );
  } catch {
    mfaEnrolled = false;
  }

  const actor = await resolveOrBootstrapActor({
    authUserId: user.id,
    email: user.email || `${user.id}@hirzexa.com`,
    adminRow: admin,
    mfaEnrolled,
    supabaseClient: supabase,
  });

  if (!actor || actor.status !== "active") {
    return null;
  }

  // Enforce server-side session revocation via session_version cookie if set
  try {
    const cookieStore = await cookies();
    const svCookie = cookieStore.get(SESSION_VERSION_COOKIE)?.value;
    if (svCookie && Number(svCookie) < actor.sessionVersion) {
      return null;
    }
  } catch {}

  return { user, admin: admin || { id: user.id, role: actor.roleKey }, actor, supabase };
}

export async function requireAdmin() {
  const current = await getCurrentAdmin();
  if (!current) redirect("/admin/login");
  return current;
}

export async function requireAdminApi() {
  const current = await getCurrentAdmin();
  if (!current) throw new Error("UNAUTHORIZED");
  return current;
}

export async function requirePermission(
  module: PermissionModule,
  action: PermissionAction
) {
  const current = await requireAdmin();
  try {
    assertPermission(current.actor, module, action);
  } catch (err) {
    if (err instanceof RbacDeniedError) {
      await recordAuditLog({
        actorId: current.actor.id,
        actorEmail: current.actor.email,
        actorRole: current.actor.roleKey,
        module,
        action,
        entityType: "page",
        outcome: "denied",
        summary: err.message,
      });
      redirect("/admin?denied=1");
    }
    throw err;
  }
  return current;
}

export async function requirePermissionApi(
  module: PermissionModule,
  action: PermissionAction
): Promise<{
  user: NonNullable<Awaited<ReturnType<typeof getCurrentAdmin>>>["user"];
  actor: AuthActor;
  supabase: NonNullable<Awaited<ReturnType<typeof getCurrentAdmin>>>["supabase"];
}> {
  const current = await requireAdminApi();
  try {
    assertPermission(current.actor, module, action);
  } catch (err) {
    if (err instanceof RbacDeniedError) {
      await recordAuditLog({
        actorId: current.actor.id,
        actorEmail: current.actor.email,
        actorRole: current.actor.roleKey,
        module,
        action,
        entityType: "api",
        outcome: "denied",
        summary: err.message,
      });
    }
    throw err;
  }
  return { user: current.user, actor: current.actor, supabase: current.supabase };
}
