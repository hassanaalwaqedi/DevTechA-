import "server-only";
import type { AuthActor, RoleKey } from "@/lib/rbac";

export type MfaAssuranceLevel = "aal1" | "aal2" | null;
export type MfaEnforcementMode = "enrolled_only" | "required";

export const PRIVILEGED_MFA_ROLES: ReadonlySet<RoleKey> = new Set<RoleKey>([
  "super_admin",
  "administrator",
  "hr_manager",
]);

export function getMfaEnforcementMode(): MfaEnforcementMode {
  const raw = process.env.ADMIN_MFA_ENFORCEMENT?.trim().toLowerCase();
  if (raw === "required" || raw === "strict" || raw === "enforced") {
    return "required";
  }
  // Safe rollout default: strictly enforce AAL2 for every user with a verified factor enrolled,
  // preventing administrator lockout before initial TOTP enrollment.
  return "enrolled_only";
}

export function isPrivilegedMfaActor(
  actor: Pick<AuthActor, "roleKey" | "isSuperAdmin" | "permissions">
): boolean {
  if (actor.isSuperAdmin || PRIVILEGED_MFA_ROLES.has(actor.roleKey)) {
    return true;
  }
  const teamPerms = actor.permissions.team || [];
  const settingsPerms = actor.permissions.settings || [];
  const auditPerms = actor.permissions.audit || [];
  return (
    teamPerms.includes("edit") ||
    teamPerms.includes("manage") ||
    settingsPerms.includes("edit") ||
    settingsPerms.includes("manage") ||
    auditPerms.includes("view") ||
    auditPerms.includes("manage")
  );
}

export interface MfaPolicyDecision {
  allowed: boolean;
  reason: "aal2_verified" | "not_required_rollout" | "mfa_challenge_required" | "mfa_enrollment_required";
  enforcementMode: MfaEnforcementMode;
  currentLevel: MfaAssuranceLevel;
  nextLevel: MfaAssuranceLevel;
  hasVerifiedFactor: boolean;
  requiresChallenge: boolean;
  requiresEnrollment: boolean;
}

/**
 * Pure server-side MFA assurance evaluator.
 *
 * Security invariants:
 * 1. If a user has ANY verified MFA factor enrolled, an AAL1 session is ALWAYS denied
 *    (must complete TOTP challenge to reach AAL2), regardless of rollout mode.
 * 2. Under ADMIN_MFA_ENFORCEMENT=required, privileged actors without a verified factor
 *    are denied privileged API access and guided to /admin/mfa?mode=enroll (zero lockout).
 * 3. Only sessions verified by Supabase Auth as currentLevel === "aal2" pass when MFA is required.
 */
export function evaluateMfaPolicy(input: {
  actor: Pick<AuthActor, "roleKey" | "isSuperAdmin" | "permissions">;
  currentLevel: MfaAssuranceLevel;
  nextLevel: MfaAssuranceLevel;
  hasVerifiedFactor: boolean;
  enforcementMode?: MfaEnforcementMode;
}): MfaPolicyDecision {
  const enforcementMode = input.enforcementMode ?? getMfaEnforcementMode();
  const isAal2 = input.currentLevel === "aal2";

  if (isAal2) {
    return {
      allowed: true,
      reason: "aal2_verified",
      enforcementMode,
      currentLevel: input.currentLevel,
      nextLevel: input.nextLevel,
      hasVerifiedFactor: input.hasVerifiedFactor,
      requiresChallenge: false,
      requiresEnrollment: false,
    };
  }

  // Rule 1: Enrolled MFA factor MUST be satisfied to reach AAL2 (blocks AAL1 bypass)
  if (input.hasVerifiedFactor || input.nextLevel === "aal2") {
    return {
      allowed: false,
      reason: "mfa_challenge_required",
      enforcementMode,
      currentLevel: input.currentLevel,
      nextLevel: input.nextLevel,
      hasVerifiedFactor: input.hasVerifiedFactor,
      requiresChallenge: true,
      requiresEnrollment: false,
    };
  }

  // Rule 2: Privileged roles must enroll MFA when ADMIN_MFA_ENFORCEMENT=required
  if (enforcementMode === "required" && isPrivilegedMfaActor(input.actor)) {
    return {
      allowed: false,
      reason: "mfa_enrollment_required",
      enforcementMode,
      currentLevel: input.currentLevel,
      nextLevel: input.nextLevel,
      hasVerifiedFactor: false,
      requiresChallenge: false,
      requiresEnrollment: true,
    };
  }

  return {
    allowed: true,
    reason: "not_required_rollout",
    enforcementMode,
    currentLevel: input.currentLevel,
    nextLevel: input.nextLevel,
    hasVerifiedFactor: false,
    requiresChallenge: false,
    requiresEnrollment: false,
  };
}

/**
 * Prevents open redirects via `?next=` parameters on login and MFA pages.
 * Allows strictly relative internal `/admin...` paths.
 */
export function sanitizeAdminNextPath(raw: string | null | undefined): string {
  const value = (raw || "").trim();
  if (!value.startsWith("/admin")) return "/admin";
  if (value.startsWith("//") || value.includes("\\") || value.includes("\r") || value.includes("\n")) {
    return "/admin";
  }
  return value;
}
