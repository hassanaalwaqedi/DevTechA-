import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { SESSION_VERSION_COOKIE, signSessionVersionToken } from "@/lib/auth";
import { recordAuditLog } from "@/lib/intelligence/audit";
import { resolveOrBootstrapActor } from "@/lib/intelligence/employees";
import { evaluateMfaPolicy, type MfaAssuranceLevel } from "@/lib/mfa";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  const ip = getClientIp(request.headers);
  if (!checkRateLimit(`admin-login-ip:${ip}`, 30, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many sign-in attempts from this network. Please wait 15 minutes and try again." },
      { status: 429, headers: { "Retry-After": "900", "Cache-Control": "no-store" } }
    );
  }

  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase().slice(0, 254);
  const password = String(body.password || "");

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!checkRateLimit(`admin-login-acct:${ip}:${email}`, 10, 15 * 60 * 1000)) {
    await recordAuditLog({
      actorId: "anonymous",
      actorEmail: email,
      actorRole: "anonymous",
      module: "auth",
      action: "login_rate_limited",
      entityType: "session",
      outcome: "denied",
      summary: "Rate-limited repeated failed sign-in attempts.",
    });
    return NextResponse.json(
      { error: "Too many sign-in attempts for this account. Please wait 15 minutes and try again." },
      { status: 429, headers: { "Retry-After": "900", "Cache-Control": "no-store" } }
    );
  }

  const pendingCookies: Array<{ name: string; value: string; options?: Record<string, unknown> }> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () =>
          request.headers
            .get("cookie")
            ?.split("; ")
            .map((value) => {
              const [name, ...rest] = value.split("=");
              return { name, value: rest.join("=") };
            }) || [],
        setAll: (cookiesToSet) =>
          cookiesToSet.forEach(({ name, value, options }) =>
            pendingCookies.push({ name, value, options: options as Record<string, unknown> })
          ),
      },
    }
  );

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !authData.user || !authData.session) {
    await recordAuditLog({
      actorId: "anonymous",
      actorEmail: email || "unknown",
      actorRole: "anonymous",
      module: "auth",
      action: "login",
      entityType: "session",
      outcome: "denied",
      summary: "Failed sign-in attempt with invalid credentials.",
    });
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  await adminClient.auth.setSession({
    access_token: authData.session.access_token,
    refresh_token: authData.session.refresh_token,
  });

  const { data: admin } = await adminClient
    .from("admin_users")
    .select("id, role")
    .eq("id", authData.user.id)
    .maybeSingle();

  const actor = await resolveOrBootstrapActor({
    authUserId: authData.user.id,
    email: authData.user.email || email,
    adminRow: admin,
    supabaseClient: adminClient,
  });

  if (!actor || actor.status !== "active") {
    await recordAuditLog({
      actorId: authData.user.id,
      actorEmail: authData.user.email || email,
      actorRole: actor?.roleKey || "unauthorized",
      module: "auth",
      action: "login",
      entityType: "session",
      outcome: "denied",
      summary:
        actor?.status === "suspended"
          ? "Blocked login for suspended employee account."
          : "Blocked login for non-authorized account.",
    });
    return NextResponse.json(
      {
        error:
          actor?.status === "suspended"
            ? "This account has been suspended. Contact your Super Admin."
            : "This account is not configured for HIRZEXA Intelligence access.",
      },
      { status: 403 }
    );
  }

  let hasVerifiedFactor = false;
  let currentAal: MfaAssuranceLevel = "aal1";
  let nextAal: MfaAssuranceLevel = "aal1";
  try {
    const [{ data: factors }, { data: aalData }] = await Promise.all([
      adminClient.auth.mfa.listFactors(),
      adminClient.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);
    hasVerifiedFactor = Boolean(
      factors?.totp?.some((f) => f.status === "verified") ||
        factors?.phone?.some((f) => f.status === "verified")
    );
    currentAal = (aalData?.currentLevel as MfaAssuranceLevel) || "aal1";
    nextAal = (aalData?.nextLevel as MfaAssuranceLevel) || (hasVerifiedFactor ? "aal2" : "aal1");
  } catch {}

  const mfaPolicy = evaluateMfaPolicy({
    actor,
    currentLevel: currentAal,
    nextLevel: nextAal,
    hasVerifiedFactor,
  });

  const response = NextResponse.json(
    {
      ok: true,
      mfaRequired: mfaPolicy.requiresChallenge,
      mfaEnrollmentRequired: mfaPolicy.requiresEnrollment,
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );

  for (const cookie of pendingCookies) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }

  response.cookies.set(
    SESSION_VERSION_COOKIE,
    signSessionVersionToken(authData.user.id, actor.sessionVersion),
    {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 14,
    }
  );

  await recordAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.roleKey,
    module: "auth",
    action: "login",
    entityType: "session",
    entityId: actor.employeeId,
    outcome: "allowed",
    summary: mfaPolicy.allowed
      ? `Signed in as ${actor.roleLabel}.`
      : `Password verified for ${actor.roleLabel}; awaiting MFA (${mfaPolicy.requiresEnrollment ? "enroll" : "aal2 challenge"}).`,
  });

  return response;
}
