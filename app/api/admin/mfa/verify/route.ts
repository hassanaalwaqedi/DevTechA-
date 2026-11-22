import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getAuthenticatedAdminSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/intelligence/audit";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  const session = await getAuthenticatedAdminSession({ allowPendingMfa: true });
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!checkRateLimit(`mfa-verify:${ip}:${session.actor.id}`, 10, 15 * 60 * 1000)) {
    await recordAuditLog({
      actorId: session.actor.id,
      actorEmail: session.actor.email,
      actorRole: session.actor.roleKey,
      module: "auth",
      action: "mfa_verify_rate_limited",
      entityType: "mfa_factor",
      outcome: "denied",
      summary: "Rate-limited repeated MFA verification attempts.",
    });
    return NextResponse.json(
      { error: "Too many verification attempts. Please wait 15 minutes and try again." },
      { status: 429, headers: { "Retry-After": "900", "Cache-Control": "no-store" } }
    );
  }

  const body = await request.json().catch(() => ({}));
  const factorId = typeof body.factorId === "string" ? body.factorId.trim() : "";
  const code = typeof body.code === "string" ? body.code.replace(/\s+/g, "") : "";

  if (!factorId || !/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { error: "Enter a valid 6-digit authenticator code." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const response = NextResponse.json(
    { ok: true, currentLevel: "aal2" },
    { headers: { "Cache-Control": "private, no-store" } }
  );

  // Use a response-bound Supabase SSR client so the upgraded AAL2 session cookies
  // are explicitly written to the HTTP response headers.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
            response.cookies.set(name, value, options)
          ),
      },
    }
  );

  const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({
    factorId,
  });
  if (challengeErr || !challengeData?.id) {
    return NextResponse.json(
      { error: challengeErr?.message || "Unable to start MFA verification challenge." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const { error: verifyErr } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeData.id,
    code,
  });

  if (verifyErr) {
    await recordAuditLog({
      actorId: session.actor.id,
      actorEmail: session.actor.email,
      actorRole: session.actor.roleKey,
      module: "auth",
      action: "mfa_verify",
      entityType: "mfa_factor",
      entityId: factorId,
      outcome: "denied",
      summary: "Invalid TOTP authenticator code submitted during AAL2 verification.",
    });
    return NextResponse.json(
      { error: "Invalid or expired 6-digit code. Check your authenticator app and try again." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  // Sync mfa_enrolled flag in public.employees (best-effort)
  try {
    await supabase
      .from("employees")
      .update({ mfa_enrolled: true, updated_at: new Date().toISOString() })
      .eq("auth_user_id", session.user.id);
  } catch {}

  await recordAuditLog({
    actorId: session.actor.id,
    actorEmail: session.actor.email,
    actorRole: session.actor.roleKey,
    module: "auth",
    action: "mfa_verify",
    entityType: "session",
    entityId: factorId,
    outcome: "allowed",
    summary: `Verified TOTP MFA factor — session upgraded to AAL2 for ${session.actor.email}.`,
  });

  return response;
}
