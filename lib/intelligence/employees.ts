import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  isLocalFallbackAllowed,
  readLocalCollection,
  writeLocalCollection,
} from "@/lib/intelligence/store";
import {
  isValidRoleKey,
  resolveEffectivePermissions,
  ROLE_TEMPLATES,
  type AccessScope,
  type AuthActor,
  type ModulePermissionMap,
  type RoleKey,
} from "@/lib/rbac";
import type {
  EmployeeInvitationRecord,
  EmployeeInvitationSummary,
  EmployeeRecord,
  InvitationDeliveryStatus,
} from "@/lib/intelligence/types";

const INVITE_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours
const memoryEmployees = new Map<string, EmployeeRecord>();
const memoryInvites = new Map<string, EmployeeInvitationRecord>();

export function hashInvitationToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

function mapSupabaseEmployee(row: Record<string, unknown>): EmployeeRecord {
  const roleKey: RoleKey = isValidRoleKey(row.role_key) ? row.role_key : "engineer";
  return {
    id: String(row.id),
    authUserId: row.auth_user_id ? String(row.auth_user_id) : null,
    fullName: String(row.full_name || ""),
    email: String(row.email || "").toLowerCase(),
    jobTitle: String(row.job_title || ""),
    department: String(row.department || "Operations"),
    roleKey,
    scopeOverride: (row.scope_override as AccessScope | null) || null,
    permissionOverrides:
      row.permission_overrides && typeof row.permission_overrides === "object"
        ? (row.permission_overrides as ModulePermissionMap)
        : {},
    status: (row.status as EmployeeRecord["status"]) || "active",
    mfaEnrolled: Boolean(row.mfa_enrolled),
    sessionVersion: Number(row.session_version) || 1,
    lastActiveAt: row.last_active_at ? String(row.last_active_at) : null,
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || new Date().toISOString()),
  };
}

export async function listEmployees(
  supabaseClient?: SupabaseClient
): Promise<EmployeeRecord[]> {
  const map = new Map<string, EmployeeRecord>();

  if (isLocalFallbackAllowed()) {
    const disk = await readLocalCollection<EmployeeRecord>("employees");
    for (const item of disk) {
      map.set(item.id, item);
      memoryEmployees.set(item.id, item);
    }
    for (const item of memoryEmployees.values()) {
      map.set(item.id, item);
    }
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = supabaseClient || (await createSupabaseServerClient());
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("created_at", { ascending: true });
      if (!error && Array.isArray(data)) {
        for (const row of data) {
          const mapped = mapSupabaseEmployee(row as Record<string, unknown>);
          map.set(mapped.id, mapped);
          if (isLocalFallbackAllowed()) {
            memoryEmployees.set(mapped.id, mapped);
          }
        }
      }
    } catch {
      // Table not migrated yet; local mirror remains active if allowed.
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

async function saveEmployee(
  record: EmployeeRecord,
  supabaseClient?: SupabaseClient
): Promise<void> {
  if (isLocalFallbackAllowed()) {
    memoryEmployees.set(record.id, record);
    const existing = await readLocalCollection<EmployeeRecord>("employees");
    const next = [record, ...existing.filter((x) => x.id !== record.id)];
    await writeLocalCollection("employees", next);
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = supabaseClient || (await createSupabaseServerClient());
      await supabase.from("employees").upsert({
        id: record.id,
        auth_user_id: record.authUserId || null,
        full_name: record.fullName,
        email: record.email.toLowerCase(),
        job_title: record.jobTitle,
        department: record.department,
        role_key: record.roleKey,
        scope_override: record.scopeOverride || null,
        permission_overrides: record.permissionOverrides || {},
        status: record.status,
        mfa_enrolled: record.mfaEnrolled,
        session_version: record.sessionVersion,
        last_active_at: record.lastActiveAt || null,
        created_by: record.createdBy || null,
        created_at: record.createdAt,
        updated_at: record.updatedAt,
      });
    } catch {
      // Handled safely.
    }
  }
}

export async function findEmployeeByAuthOrEmail(
  authUserId: string,
  email?: string | null,
  supabaseClient?: SupabaseClient
): Promise<EmployeeRecord | null> {
  const all = await listEmployees(supabaseClient);
  const normalizedEmail = email?.trim().toLowerCase();
  return (
    all.find((e) => e.authUserId === authUserId) ||
    (normalizedEmail ? all.find((e) => e.email.toLowerCase() === normalizedEmail) : undefined) ||
    null
  );
}

export function buildActorFromEmployee(
  employee: EmployeeRecord,
  authUserId: string,
  mfaEnrolled = false
): AuthActor {
  const template = ROLE_TEMPLATES[employee.roleKey] || ROLE_TEMPLATES.engineer;
  const permissions = resolveEffectivePermissions(
    employee.roleKey,
    employee.permissionOverrides
  );
  return {
    id: authUserId,
    employeeId: employee.id,
    email: employee.email,
    fullName: employee.fullName,
    department: employee.department,
    roleKey: employee.roleKey,
    roleLabel: template.label,
    status: employee.status,
    scope: employee.scopeOverride || template.defaultScope,
    permissions,
    mfaEnrolled: employee.mfaEnrolled || mfaEnrolled,
    sessionVersion: employee.sessionVersion,
    isSuperAdmin: employee.roleKey === "super_admin",
  };
}

function isLegacySuperAdminAllowed(email: string): boolean {
  const allowlistRaw = process.env.SUPER_ADMIN_ALLOWLIST?.trim();
  if (!allowlistRaw) return true;
  const allowed = allowlistRaw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}

/**
 * Ensures the existing authenticated Supabase admin_user (Founder / Super Admin)
 * always resolves cleanly into a normalized EmployeeRecord + AuthActor without
 * breaking any pre-existing login or losing data. If SUPER_ADMIN_ALLOWLIST is
 * configured, legacy admin_users not on the allowlist resolve as "administrator"
 * rather than automatically elevating to "super_admin".
 */
export async function resolveOrBootstrapActor(options: {
  authUserId: string;
  email: string;
  adminRow?: { id: string; role?: string } | null;
  mfaEnrolled?: boolean;
  supabaseClient?: SupabaseClient;
}): Promise<AuthActor | null> {
  const existing = await findEmployeeByAuthOrEmail(
    options.authUserId,
    options.email,
    options.supabaseClient
  );
  if (existing) {
    if (existing.status === "suspended") {
      return null;
    }
    const enforcedRole: RoleKey =
      options.adminRow && isLegacySuperAdminAllowed(options.email)
        ? "super_admin"
        : existing.roleKey;
    const nowIso = new Date().toISOString();
    if (
      !existing.authUserId ||
      existing.status === "invited" ||
      existing.roleKey !== enforcedRole
    ) {
      const linked: EmployeeRecord = {
        ...existing,
        authUserId: options.authUserId,
        roleKey: enforcedRole,
        status: "active",
        mfaEnrolled: existing.mfaEnrolled || Boolean(options.mfaEnrolled),
        lastActiveAt: nowIso,
        updatedAt: nowIso,
      };
      await saveEmployee(linked, options.supabaseClient);
      return buildActorFromEmployee(linked, options.authUserId, options.mfaEnrolled);
    }
    return buildActorFromEmployee(existing, options.authUserId, options.mfaEnrolled);
  }

  // Legacy admin_users bootstrap -> grants super_admin only when allowlisted (or unset)
  if (options.adminRow) {
    const nowIso = new Date().toISOString();
    const mappedRole: RoleKey = isLegacySuperAdminAllowed(options.email)
      ? "super_admin"
      : "administrator";
    const displayName = options.email.split("@")[0].replace(/[._-]+/g, " ");
    const formattedName =
      displayName
        .split(" ")
        .filter(Boolean)
        .map((p) => p[0].toUpperCase() + p.slice(1))
        .join(" ") || "HIRZEXA Founder";

    const bootstrapped: EmployeeRecord = {
      id: randomUUID(),
      authUserId: options.authUserId,
      fullName: formattedName,
      email: options.email.toLowerCase(),
      jobTitle: mappedRole === "super_admin" ? "Founder & Executive Admin" : "Administrator",
      department: "Executive",
      roleKey: mappedRole,
      scopeOverride: null,
      permissionOverrides: {},
      status: "active",
      mfaEnrolled: Boolean(options.mfaEnrolled),
      sessionVersion: 1,
      lastActiveAt: nowIso,
      createdBy: options.authUserId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await saveEmployee(bootstrapped, options.supabaseClient);
    return buildActorFromEmployee(bootstrapped, options.authUserId, options.mfaEnrolled);
  }

  return null;
}

export async function createEmployeeWithInvitation(input: {
  fullName: string;
  email: string;
  jobTitle: string;
  department: string;
  roleKey: RoleKey;
  scopeOverride?: AccessScope | null;
  permissionOverrides?: ModulePermissionMap;
  createdBy: string;
}): Promise<{
  employee: EmployeeRecord;
  invitationId: string;
  invitationToken: string;
  expiresAt: string;
}> {
  const email = input.email.trim().toLowerCase();
  const existing = (await listEmployees()).find((e) => e.email.toLowerCase() === email);
  if (existing) {
    throw new Error("An employee account with this email already exists.");
  }

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const expiresAt = new Date(now + INVITE_TTL_MS).toISOString();
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = hashInvitationToken(rawToken);

  const employee: EmployeeRecord = {
    id: randomUUID(),
    authUserId: null,
    fullName: input.fullName.trim(),
    email,
    jobTitle: input.jobTitle.trim() || ROLE_TEMPLATES[input.roleKey].label,
    department: input.department.trim() || "Operations",
    roleKey: input.roleKey,
    scopeOverride: input.scopeOverride || null,
    permissionOverrides: input.permissionOverrides || {},
    status: "invited",
    mfaEnrolled: false,
    sessionVersion: 1,
    lastActiveAt: null,
    createdBy: input.createdBy,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await saveEmployee(employee);

  const invite: EmployeeInvitationRecord = {
    id: randomUUID(),
    employeeId: employee.id,
    email,
    roleKey: input.roleKey,
    tokenHash,
    expiresAt,
    consumedAt: null,
    revokedAt: null,
    deliveryStatus: "created",
    emailProvider: null,
    providerMessageId: null,
    deliveryError: null,
    sentAt: null,
    deliveredAt: null,
    lastWebhookEvent: null,
    lastWebhookAt: null,
    createdBy: input.createdBy,
    createdAt: nowIso,
  };

  if (isLocalFallbackAllowed()) {
    memoryInvites.set(invite.id, invite);
    const diskInvites = await readLocalCollection<EmployeeInvitationRecord>(
      "employee-invitations"
    );
    await writeLocalCollection("employee-invitations", [
      invite,
      ...diskInvites.filter((i) => i.id !== invite.id),
    ]);
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const { error: richErr } = await supabase.from("employee_invitations").insert({
        id: invite.id,
        employee_id: invite.employeeId,
        email: invite.email,
        role_key: invite.roleKey,
        token_hash: invite.tokenHash,
        expires_at: invite.expiresAt,
        delivery_status: "created",
        created_by: invite.createdBy,
        created_at: invite.createdAt,
      });
      if (richErr) {
        // Pre-migration fallback: insert core columns cleanly if 20261121 delivery columns are not applied yet.
        await supabase.from("employee_invitations").insert({
          id: invite.id,
          employee_id: invite.employeeId,
          email: invite.email,
          role_key: invite.roleKey,
          token_hash: invite.tokenHash,
          expires_at: invite.expiresAt,
          created_by: invite.createdBy,
          created_at: invite.createdAt,
        });
      }
    } catch {
      // Handled safely.
    }
  }

  return { employee, invitationId: invite.id, invitationToken: rawToken, expiresAt };
}

/**
 * Revokes all previous unconsumed invitations for an invited employee and generates
 * a fresh single-use 48-hour SHA-256 invitation token.
 */
export async function reissueEmployeeInvitation(input: {
  employeeId: string;
  createdBy: string;
}): Promise<{
  employee: EmployeeRecord;
  invitationId: string;
  invitationToken: string;
  expiresAt: string;
  revokedCount: number;
}> {
  const all = await listEmployees();
  const employee = all.find((e) => e.id === input.employeeId);
  if (!employee) {
    throw new Error("Employee account not found.");
  }
  if (employee.status !== "invited") {
    throw new Error(
      `Cannot resend invitation: account status is "${employee.status}". Only pending invitations can be resent.`
    );
  }

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const expiresAt = new Date(now + INVITE_TTL_MS).toISOString();
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = hashInvitationToken(rawToken);
  let revokedCount = 0;

  if (isLocalFallbackAllowed()) {
    const diskInvites = await readLocalCollection<EmployeeInvitationRecord>(
      "employee-invitations"
    );
    const updatedDisk = diskInvites.map((inv) => {
      if (inv.employeeId === employee.id && !inv.consumedAt && !inv.revokedAt) {
        revokedCount += 1;
        return { ...inv, revokedAt: nowIso };
      }
      return inv;
    });
    for (const [key, inv] of memoryInvites.entries()) {
      if (inv.employeeId === employee.id && !inv.consumedAt && !inv.revokedAt) {
        memoryInvites.set(key, { ...inv, revokedAt: nowIso });
      }
    }
    await writeLocalCollection("employee-invitations", updatedDisk);
  }

  const invite: EmployeeInvitationRecord = {
    id: randomUUID(),
    employeeId: employee.id,
    email: employee.email.toLowerCase(),
    roleKey: employee.roleKey,
    tokenHash,
    expiresAt,
    consumedAt: null,
    revokedAt: null,
    deliveryStatus: "created",
    emailProvider: null,
    providerMessageId: null,
    deliveryError: null,
    sentAt: null,
    deliveredAt: null,
    lastWebhookEvent: null,
    lastWebhookAt: null,
    createdBy: input.createdBy,
    createdAt: nowIso,
  };

  if (isLocalFallbackAllowed()) {
    memoryInvites.set(invite.id, invite);
    const diskInvites = await readLocalCollection<EmployeeInvitationRecord>(
      "employee-invitations"
    );
    await writeLocalCollection("employee-invitations", [
      invite,
      ...diskInvites.filter((i) => i.id !== invite.id),
    ]);
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data: revokedRows } = await supabase
        .from("employee_invitations")
        .update({ revoked_at: nowIso })
        .eq("employee_id", employee.id)
        .is("consumed_at", null)
        .is("revoked_at", null)
        .select("id");

      if (Array.isArray(revokedRows)) {
        revokedCount = Math.max(revokedCount, revokedRows.length);
      }

      const { error: richErr } = await supabase.from("employee_invitations").insert({
        id: invite.id,
        employee_id: invite.employeeId,
        email: invite.email,
        role_key: invite.roleKey,
        token_hash: invite.tokenHash,
        expires_at: invite.expiresAt,
        delivery_status: "created",
        created_by: invite.createdBy,
        created_at: invite.createdAt,
      });
      if (richErr) {
        await supabase.from("employee_invitations").insert({
          id: invite.id,
          employee_id: invite.employeeId,
          email: invite.email,
          role_key: invite.roleKey,
          token_hash: invite.tokenHash,
          expires_at: invite.expiresAt,
          created_by: invite.createdBy,
          created_at: invite.createdAt,
        });
      }
    } catch {}
  }

  return {
    employee,
    invitationId: invite.id,
    invitationToken: rawToken,
    expiresAt,
    revokedCount,
  };
}

export async function updateInvitationDeliveryStatus(
  invitationId: string,
  patch: {
    deliveryStatus: InvitationDeliveryStatus;
    emailProvider?: string | null;
    providerMessageId?: string | null;
    deliveryError?: string | null;
    sentAt?: string | null;
    deliveredAt?: string | null;
  }
): Promise<void> {
  if (isLocalFallbackAllowed()) {
    const mem = memoryInvites.get(invitationId);
    if (mem) {
      memoryInvites.set(invitationId, {
        ...mem,
        deliveryStatus: patch.deliveryStatus,
        emailProvider: patch.emailProvider ?? mem.emailProvider ?? null,
        providerMessageId: patch.providerMessageId ?? mem.providerMessageId ?? null,
        deliveryError: patch.deliveryError !== undefined ? patch.deliveryError : mem.deliveryError ?? null,
        sentAt: patch.sentAt ?? mem.sentAt ?? null,
        deliveredAt: patch.deliveredAt ?? mem.deliveredAt ?? null,
      });
    }
    const diskInvites = await readLocalCollection<EmployeeInvitationRecord>(
      "employee-invitations"
    );
    await writeLocalCollection(
      "employee-invitations",
      diskInvites.map((inv) =>
        inv.id === invitationId
          ? {
              ...inv,
              deliveryStatus: patch.deliveryStatus,
              emailProvider: patch.emailProvider ?? inv.emailProvider ?? null,
              providerMessageId: patch.providerMessageId ?? inv.providerMessageId ?? null,
              deliveryError:
                patch.deliveryError !== undefined ? patch.deliveryError : inv.deliveryError ?? null,
              sentAt: patch.sentAt ?? inv.sentAt ?? null,
              deliveredAt: patch.deliveredAt ?? inv.deliveredAt ?? null,
            }
          : inv
      )
    );
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const updatePayload: Record<string, unknown> = {
        delivery_status: patch.deliveryStatus,
      };
      if (patch.emailProvider !== undefined) updatePayload.email_provider = patch.emailProvider;
      if (patch.providerMessageId !== undefined)
        updatePayload.provider_message_id = patch.providerMessageId;
      if (patch.deliveryError !== undefined)
        updatePayload.delivery_error = patch.deliveryError
          ? patch.deliveryError.slice(0, 500)
          : null;
      if (patch.sentAt !== undefined) updatePayload.sent_at = patch.sentAt;
      if (patch.deliveredAt !== undefined) updatePayload.delivered_at = patch.deliveredAt;

      await supabase
        .from("employee_invitations")
        .update(updatePayload)
        .eq("id", invitationId);
    } catch {
      // Safe no-op if optional 20261121 delivery columns have not been migrated yet.
    }
  }
}

export async function recordInvitationWebhookUpdate(params: {
  providerMessageId: string;
  deliveryStatus: InvitationDeliveryStatus;
  eventType: string;
  error?: string | null;
}): Promise<{
  matched: boolean;
  invitationId?: string;
  employeeId?: string;
  email?: string;
}> {
  let matchedResult: {
    matched: boolean;
    invitationId?: string;
    employeeId?: string;
    email?: string;
  } = { matched: false };

  const nowIso = new Date().toISOString();

  if (isLocalFallbackAllowed()) {
    const diskInvites = await readLocalCollection<EmployeeInvitationRecord>(
      "employee-invitations"
    );
    const nextDisk = diskInvites.map((inv) => {
      if (inv.providerMessageId !== params.providerMessageId) return inv;
      matchedResult = {
        matched: true,
        invitationId: inv.id,
        employeeId: inv.employeeId,
        email: inv.email,
      };
      return {
        ...inv,
        deliveryStatus: params.deliveryStatus,
        deliveredAt: params.deliveryStatus === "delivered" ? inv.deliveredAt || nowIso : inv.deliveredAt,
        deliveryError: params.error ?? (params.deliveryStatus === "delivered" ? null : inv.deliveryError),
        lastWebhookEvent: params.eventType,
        lastWebhookAt: nowIso,
      };
    });
    if (matchedResult.matched) {
      await writeLocalCollection("employee-invitations", nextDisk);
    }
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase.rpc("record_invitation_webhook_event", {
        p_provider_message_id: params.providerMessageId,
        p_delivery_status: params.deliveryStatus,
        p_event_type: params.eventType,
        p_error: params.error || null,
      });
      const row = Array.isArray(data) ? data[0] : null;
      if (!error && row && row.invitation_id) {
        return {
          matched: true,
          invitationId: String(row.invitation_id),
          employeeId: String(row.employee_id),
          email: String(row.email),
        };
      }
    } catch {}
  }

  return matchedResult;
}

export async function listLatestInvitationsByEmployee(): Promise<
  Record<string, EmployeeInvitationSummary>
> {
  const byEmployee = new Map<string, EmployeeInvitationSummary>();

  const consider = (summary: EmployeeInvitationSummary) => {
    const prev = byEmployee.get(summary.employeeId);
    if (
      !prev ||
      new Date(summary.createdAt).getTime() >= new Date(prev.createdAt).getTime()
    ) {
      byEmployee.set(summary.employeeId, summary);
    }
  };

  if (isLocalFallbackAllowed()) {
    const diskInvites = await readLocalCollection<EmployeeInvitationRecord>(
      "employee-invitations"
    );
    for (const inv of [...diskInvites, ...memoryInvites.values()]) {
      consider({
        id: inv.id,
        employeeId: inv.employeeId,
        email: inv.email,
        expiresAt: inv.expiresAt,
        consumedAt: inv.consumedAt || null,
        revokedAt: inv.revokedAt || null,
        deliveryStatus: inv.deliveryStatus || "created",
        emailProvider: inv.emailProvider || null,
        providerMessageId: inv.providerMessageId || null,
        deliveryError: inv.deliveryError || null,
        sentAt: inv.sentAt || null,
        deliveredAt: inv.deliveredAt || null,
        lastWebhookEvent: inv.lastWebhookEvent || null,
        lastWebhookAt: inv.lastWebhookAt || null,
        createdAt: inv.createdAt,
      });
    }
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase
        .from("employee_invitations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (!error && Array.isArray(data)) {
        for (const raw of data) {
          const row = raw as Record<string, unknown>;
          consider({
            id: String(row.id),
            employeeId: String(row.employee_id),
            email: String(row.email || "").toLowerCase(),
            expiresAt: String(row.expires_at),
            consumedAt: row.consumed_at ? String(row.consumed_at) : null,
            revokedAt: row.revoked_at ? String(row.revoked_at) : null,
            deliveryStatus:
              (row.delivery_status as InvitationDeliveryStatus) || "created",
            emailProvider: row.email_provider ? String(row.email_provider) : null,
            providerMessageId: row.provider_message_id
              ? String(row.provider_message_id)
              : null,
            deliveryError: row.delivery_error ? String(row.delivery_error) : null,
            sentAt: row.sent_at ? String(row.sent_at) : null,
            deliveredAt: row.delivered_at ? String(row.delivered_at) : null,
            lastWebhookEvent: row.last_webhook_event
              ? String(row.last_webhook_event)
              : null,
            lastWebhookAt: row.last_webhook_at ? String(row.last_webhook_at) : null,
            createdAt: String(row.created_at),
          });
        }
      }
    } catch {}
  }

  return Object.fromEntries(byEmployee.entries());
}

export async function updateEmployeeRecord(
  employeeId: string,
  patch: {
    fullName?: string;
    jobTitle?: string;
    department?: string;
    roleKey?: RoleKey;
    scopeOverride?: AccessScope | null;
    permissionOverrides?: ModulePermissionMap;
    status?: EmployeeRecord["status"];
    revokeSessions?: boolean;
  }
): Promise<EmployeeRecord | null> {
  const all = await listEmployees();
  const target = all.find((e) => e.id === employeeId);
  if (!target) return null;

  const updated: EmployeeRecord = {
    ...target,
    fullName: patch.fullName !== undefined ? patch.fullName.trim() || target.fullName : target.fullName,
    jobTitle: patch.jobTitle !== undefined ? patch.jobTitle.trim() : target.jobTitle,
    department: patch.department !== undefined ? patch.department.trim() || target.department : target.department,
    roleKey: patch.roleKey && isValidRoleKey(patch.roleKey) ? patch.roleKey : target.roleKey,
    scopeOverride: patch.scopeOverride !== undefined ? patch.scopeOverride : target.scopeOverride,
    permissionOverrides:
      patch.permissionOverrides !== undefined
        ? patch.permissionOverrides
        : target.permissionOverrides,
    status: patch.status || target.status,
    sessionVersion:
      patch.revokeSessions || patch.status === "suspended"
        ? target.sessionVersion + 1
        : target.sessionVersion,
    updatedAt: new Date().toISOString(),
  };

  await saveEmployee(updated);
  return updated;
}

export async function verifyInvitationToken(rawToken: string): Promise<{
  invitation: EmployeeInvitationRecord;
  employee: EmployeeRecord;
} | null> {
  const hash = hashInvitationToken(rawToken.trim());
  let matched: EmployeeInvitationRecord | null = null;
  if (isLocalFallbackAllowed()) {
    const diskInvites = await readLocalCollection<EmployeeInvitationRecord>(
      "employee-invitations"
    );
    const allInvites = [...memoryInvites.values(), ...diskInvites];
    matched = allInvites.find((i) => i.tokenHash === hash) || null;
  }

  if (!matched && isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data: rpcRows } = await supabase.rpc("verify_employee_invitation", {
        p_token_hash: hash,
      });
      const rpcRow = Array.isArray(rpcRows) ? rpcRows[0] : null;
      if (rpcRow && rpcRow.invitation_id && rpcRow.employee_id) {
        const roleKey: RoleKey = isValidRoleKey(rpcRow.role_key)
          ? rpcRow.role_key
          : "engineer";
        const nowIso = new Date().toISOString();
        return {
          invitation: {
            id: String(rpcRow.invitation_id),
            employeeId: String(rpcRow.employee_id),
            email: String(rpcRow.email),
            roleKey,
            tokenHash: hash,
            expiresAt: String(rpcRow.expires_at),
            consumedAt: null,
            revokedAt: null,
            createdAt: nowIso,
          },
          employee: {
            id: String(rpcRow.employee_id),
            authUserId: null,
            fullName: String(rpcRow.full_name || ""),
            email: String(rpcRow.email || "").toLowerCase(),
            jobTitle: "",
            department: String(rpcRow.department || "Operations"),
            roleKey,
            scopeOverride: null,
            permissionOverrides: {},
            status: "invited",
            mfaEnrolled: false,
            sessionVersion: 1,
            createdAt: nowIso,
            updatedAt: nowIso,
          },
        };
      }

      const { data } = await supabase
        .from("employee_invitations")
        .select("*")
        .eq("token_hash", hash)
        .maybeSingle();
      if (data) {
        matched = {
          id: String(data.id),
          employeeId: String(data.employee_id),
          email: String(data.email),
          roleKey: isValidRoleKey(data.role_key) ? data.role_key : "engineer",
          tokenHash: String(data.token_hash),
          expiresAt: String(data.expires_at),
          consumedAt: data.consumed_at ? String(data.consumed_at) : null,
          revokedAt: data.revoked_at ? String(data.revoked_at) : null,
          createdAt: String(data.created_at),
        };
      }
    } catch {}
  }

  if (!matched) return null;
  if (matched.consumedAt || matched.revokedAt) return null;
  if (new Date(matched.expiresAt).getTime() < Date.now()) return null;

  const employees = await listEmployees();
  const employee = employees.find((e) => e.id === matched!.employeeId);
  if (!employee || employee.status === "suspended") return null;

  return { invitation: matched, employee };
}

export async function markInvitationConsumed(
  invitationId: string,
  employeeId: string,
  authUserId?: string | null,
  rawToken?: string | null
): Promise<void> {
  const nowIso = new Date().toISOString();
  const diskInvites = await readLocalCollection<EmployeeInvitationRecord>("employee-invitations");
  const nextInvites = diskInvites.map((inv) =>
    inv.id === invitationId ? { ...inv, consumedAt: nowIso } : inv
  );
  await writeLocalCollection("employee-invitations", nextInvites);
  const mem = memoryInvites.get(invitationId);
  if (mem) memoryInvites.set(invitationId, { ...mem, consumedAt: nowIso });

  const all = await listEmployees();
  const emp = all.find((e) => e.id === employeeId);
  if (emp) {
    await saveEmployee({
      ...emp,
      authUserId: authUserId || emp.authUserId || null,
      status: "active",
      updatedAt: nowIso,
    });
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      if (rawToken) {
        const { error: rpcError } = await supabase.rpc("consume_employee_invitation", {
          p_token_hash: hashInvitationToken(rawToken.trim()),
          p_auth_user_id: authUserId || null,
        });
        if (!rpcError) return;
      }
      await supabase
        .from("employee_invitations")
        .update({ consumed_at: nowIso })
        .eq("id", invitationId);
    } catch {}
  }
}
