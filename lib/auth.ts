import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveOrBootstrapActor } from "@/lib/intelligence/employees";
import { recordAuditLog } from "@/lib/intelligence/audit";
import {
  evaluateMfaPolicy,
  type MfaAssuranceLevel,
  type MfaPolicyDecision,
} from "@/lib/mfa";
import {
  assertPermission,
  MfaRequiredError,
  RbacDeniedError,
  type AuthActor,
  type PermissionAction,
  type PermissionModule,
} from "@/lib/rbac";
import {
  SESSION_VERSION_COOKIE,
  signSessionVersionToken,
  verifySessionVersionCookie,
} from "@/lib/session-version";

export { SESSION_VERSION_COOKIE, signSessionVersionToken, verifySessionVersionCookie };

export async function getAuthenticatedAdminSession(options?: {
  allowPendingMfa?: boolean;
}) {
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
  let currentAal: MfaAssuranceLevel = "aal1";
  let nextAal: MfaAssuranceLevel = "aal1";
  try {
    const [{ data: factors }, { data: aalData }] = await Promise.all([
      supabase.auth.mfa.listFactors(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);
    mfaEnrolled = Boolean(
      factors?.totp?.some((f) => f.status === "verified") ||
        factors?.phone?.some((f) => f.status === "verified")
    );
    currentAal = (aalData?.currentLevel as MfaAssuranceLevel) || "aal1";
    nextAal = (aalData?.nextLevel as MfaAssuranceLevel) || (mfaEnrolled ? "aal2" : "aal1");
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

  // Enforce server-side session revocation via HMAC-signed session_version cookie.
  // Fails closed on missing, malformed (NaN), forged, or stale cookies when sessionVersion > 1.
  try {
    const cookieStore = await cookies();
    const svCookie = cookieStore.get(SESSION_VERSION_COOKIE)?.value;
    if (!verifySessionVersionCookie(svCookie, user.id, actor.sessionVersion)) {
      return null;
    }
  } catch {
    if (actor.sessionVersion > 1) {
      return null;
    }
  }

  const mfaPolicy: MfaPolicyDecision = evaluateMfaPolicy({
    actor,
    currentLevel: currentAal,
    nextLevel: nextAal,
    hasVerifiedFactor: mfaEnrolled,
  });

  if (!mfaPolicy.allowed && !options?.allowPendingMfa) {
    return {
      user,
      admin: admin || { id: user.id, role: actor.roleKey },
      actor,
      supabase,
      mfaPolicy,
      mfaSatisfied: false as const,
    };
  }

  return {
    user,
    admin: admin || { id: user.id, role: actor.roleKey },
    actor,
    supabase,
    mfaPolicy,
    mfaSatisfied: mfaPolicy.allowed,
  };
}

export async function getCurrentAdmin() {
  const session = await getAuthenticatedAdminSession();
  if (!session || !session.mfaSatisfied) return null;
  return session;
}

export async function requireAdmin() {
  const session = await getAuthenticatedAdminSession();
  if (!session) redirect("/admin/login");
  if (!session.mfaSatisfied) {
    const mode = session.mfaPolicy.requiresEnrollment ? "enroll" : "challenge";
    redirect(`/admin/mfa?mode=${mode}`);
  }
  return session;
}

export async function requireAdminApi() {
  const session = await getAuthenticatedAdminSession();
  if (!session) throw new Error("UNAUTHORIZED");
  if (!session.mfaSatisfied) {
    const mode = session.mfaPolicy.requiresEnrollment ? "enroll" : "challenge";
    await recordAuditLog({
      actorId: session.actor.id,
      actorEmail: session.actor.email,
      actorRole: session.actor.roleKey,
      module: "auth",
      action: "mfa_gate",
      entityType: "api",
      outcome: "denied",
      summary: `Blocked ${session.mfaPolicy.currentLevel || "aal1"} API request pending MFA (${mode}).`,
    });
    throw new MfaRequiredError(session.actor.roleKey, mode);
  }
  return session;
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
      redirect(`/admin?denied=${encodeURIComponent(module)}`);
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
