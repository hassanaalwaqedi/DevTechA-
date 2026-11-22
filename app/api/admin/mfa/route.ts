import { NextResponse } from "next/server";
import { getAuthenticatedAdminSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/intelligence/audit";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAuthenticatedAdminSession({ allowPendingMfa: true });
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const { data: factorsData } = await session.supabase.auth.mfa.listFactors();
  const totpFactors = (factorsData?.totp || []).map((f) => ({
    id: f.id,
    friendlyName: f.friendly_name || "Authenticator App",
    status: f.status,
    createdAt: f.created_at,
  }));

  return NextResponse.json(
    {
      ok: true,
      actor: {
        email: session.actor.email,
        fullName: session.actor.fullName,
        roleKey: session.actor.roleKey,
        roleLabel: session.actor.roleLabel,
      },
      policy: session.mfaPolicy,
      mfaSatisfied: session.mfaSatisfied,
      factors: totpFactors,
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  if (!checkRateLimit(`mfa-enroll:${ip}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many MFA enrollment attempts. Please wait 15 minutes." },
      { status: 429, headers: { "Retry-After": "900", "Cache-Control": "no-store" } }
    );
  }

  const session = await getAuthenticatedAdminSession({ allowPendingMfa: true });
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  // If user already has a verified factor and is NOT yet at AAL2, block enrolling a rogue second factor!
  if (session.mfaPolicy.hasVerifiedFactor && session.mfaPolicy.currentLevel !== "aal2") {
    await recordAuditLog({
      actorId: session.actor.id,
      actorEmail: session.actor.email,
      actorRole: session.actor.roleKey,
      module: "auth",
      action: "mfa_enroll",
      entityType: "mfa_factor",
      outcome: "denied",
      summary: "Blocked AAL1 attempt to enroll additional MFA factor while verified factor exists.",
    });
    return NextResponse.json(
      { error: "Verify your existing authenticator factor (AAL2) before enrolling another device." },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }

  // Clean up any stale unverified TOTP factors so enrollment succeeds cleanly
  try {
    const { data: existing } = await session.supabase.auth.mfa.listFactors();
    const unverified = (existing?.all || []).filter(
      (f) => f.factor_type === "totp" && f.status === "unverified"
    );
    for (const stale of unverified) {
      await session.supabase.auth.mfa.unenroll({ factorId: stale.id }).catch(() => {});
    }
  } catch {}

  const body = await request.json().catch(() => ({}));
  const friendlyName =
    typeof body.friendlyName === "string" && body.friendlyName.trim()
      ? body.friendlyName.trim().slice(0, 60)
      : "HIRZEXA Authenticator";

  const { data, error } = await session.supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName,
    issuer: "HIRZEXA",
  });

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Unable to initiate TOTP enrollment." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  await recordAuditLog({
    actorId: session.actor.id,
    actorEmail: session.actor.email,
    actorRole: session.actor.roleKey,
    module: "auth",
    action: "mfa_enroll_started",
    entityType: "mfa_factor",
    entityId: data.id,
    outcome: "allowed",
    summary: `Initiated TOTP MFA enrollment (${friendlyName}).`,
  });

  return NextResponse.json(
    {
      ok: true,
      factorId: data.id,
      friendlyName,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
      uri: data.totp.uri,
    },
    { status: 201, headers: { "Cache-Control": "private, no-store" } }
  );
}

export async function DELETE(request: Request) {
  const session = await getAuthenticatedAdminSession({ allowPendingMfa: true });
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const { searchParams } = new URL(request.url);
  const factorId = (searchParams.get("factorId") || "").trim();
  if (!factorId) {
    return NextResponse.json(
      { error: "factorId is required." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const { data: factors } = await session.supabase.auth.mfa.listFactors();
  const target = (factors?.all || []).find((f) => f.id === factorId);
  if (!target) {
    return NextResponse.json(
      { error: "MFA factor not found." },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  // Strictly require AAL2 before unenrolling any verified factor!
  if (target.status === "verified" && session.mfaPolicy.currentLevel !== "aal2") {
    await recordAuditLog({
      actorId: session.actor.id,
      actorEmail: session.actor.email,
      actorRole: session.actor.roleKey,
      module: "auth",
      action: "mfa_unenroll",
      entityType: "mfa_factor",
      entityId: factorId,
      outcome: "denied",
      summary: "Blocked AAL1 attempt to remove a verified MFA factor.",
    });
    return NextResponse.json(
      { error: "AAL2 verification is required to remove an active authenticator factor." },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }

  const { error } = await session.supabase.auth.mfa.unenroll({ factorId });
  if (error) {
    return NextResponse.json(
      { error: error.message || "Unable to remove MFA factor." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  await recordAuditLog({
    actorId: session.actor.id,
    actorEmail: session.actor.email,
    actorRole: session.actor.roleKey,
    module: "auth",
    action: "mfa_unenroll",
    entityType: "mfa_factor",
    entityId: factorId,
    outcome: "allowed",
    summary: `Removed ${target.status} MFA factor (${target.friendly_name || factorId}).`,
  });

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
