import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth";
import {
  exchangeGoogleOAuthCodeAndStore,
  GOOGLE_OAUTH_STATE_COOKIE,
  verifyGoogleOAuthState,
} from "@/lib/integrations/google-calendar";
import { recordAuditLog } from "@/lib/intelligence/audit";
import { MfaRequiredError, RbacDeniedError } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectSettingsWithCleanup(
  request: Request,
  status: "connected" | "cancelled" | "error",
  reason?: string
) {
  const target = new URL("/admin/settings", request.url);
  target.searchParams.set("tab", "integrations");
  target.searchParams.set("gcal", status);
  if (reason) {
    target.searchParams.set("reason", reason.slice(0, 160));
  }
  const response = NextResponse.redirect(target, { status: 302 });
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/admin/integrations/google-calendar",
    maxAge: 0,
  });
  return response;
}

/**
 * Google Calendar OAuth 2.0 callback handler.
 * Authorized Redirect URI: https://hirzexa.com/api/admin/integrations/google-calendar/callback
 * Verifies active admin session, CSRF state (cookie + HMAC + actor binding + TTL),
 * exchanges authorization code server-side, and stores AES-256-GCM encrypted tokens.
 */
export async function GET(request: Request) {
  let actor;
  try {
    ({ actor } = await requirePermissionApi("settings", "edit"));
  } catch (error) {
    if (error instanceof MfaRequiredError) {
      return NextResponse.redirect(new URL("/admin/mfa", request.url));
    }
    if (error instanceof RbacDeniedError) {
      return redirectSettingsWithCleanup(request, "error", "Insufficient permissions.");
    }
    return NextResponse.redirect(
      new URL("/admin/login?next=/admin/settings", request.url)
    );
  }

  const url = new URL(request.url);
  const oauthError = url.searchParams.get("error");
  if (oauthError) {
    return redirectSettingsWithCleanup(
      request,
      oauthError === "access_denied" ? "cancelled" : "error",
      oauthError === "access_denied" ? "Authorization cancelled." : oauthError
    );
  }

  const code = (url.searchParams.get("code") || "").trim();
  const queryState = url.searchParams.get("state");
  const cookieStore = await cookies();
  const cookieState = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value || null;

  const stateCheck = verifyGoogleOAuthState({
    queryState,
    cookieState,
    actorId: actor.id,
  });

  if (!stateCheck.ok) {
    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.roleKey,
      module: "settings",
      action: "google_calendar_oauth_csrf_blocked",
      entityType: "integration",
      entityId: "google_calendar",
      outcome: "denied",
      summary: `Blocked Google Calendar OAuth callback: ${stateCheck.error || "invalid CSRF state"}`,
    }).catch(() => {});
    return redirectSettingsWithCleanup(
      request,
      "error",
      stateCheck.error || "CSRF state verification failed."
    );
  }

  if (!code) {
    return redirectSettingsWithCleanup(request, "error", "Missing OAuth authorization code.");
  }

  try {
    const result = await exchangeGoogleOAuthCodeAndStore({ code, actor });
    if (!result.ok) {
      return redirectSettingsWithCleanup(
        request,
        "error",
        result.error || "Google OAuth token exchange failed."
      );
    }
    return redirectSettingsWithCleanup(request, "connected");
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Unexpected error completing Google Calendar OAuth.";
    return redirectSettingsWithCleanup(request, "error", msg);
  }
}
