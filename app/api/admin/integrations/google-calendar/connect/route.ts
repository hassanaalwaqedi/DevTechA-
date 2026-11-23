import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth";
import {
  buildGoogleOAuthAuthorizationUrl,
  createGoogleOAuthState,
  GOOGLE_OAUTH_STATE_COOKIE,
} from "@/lib/integrations/google-calendar";
import { MfaRequiredError, RbacDeniedError } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Initiates server-side Google Calendar OAuth 2.0 flow for authorized administrators only.
 * Never alters user login authentication; sets an HttpOnly SameSite=Lax CSRF state cookie
 * bound to the active admin actor ID.
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
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.redirect(
      new URL("/admin/login?next=/admin/settings", request.url)
    );
  }

  let state: string;
  try {
    state = createGoogleOAuthState(actor.id);
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.message
        : "Google OAuth token encryption key is not configured.";
    return NextResponse.redirect(
      new URL(
        `/admin/settings?tab=integrations&gcal=error&reason=${encodeURIComponent(msg.slice(0, 140))}`,
        request.url
      )
    );
  }

  const authUrl = buildGoogleOAuthAuthorizationUrl(state);
  if (!authUrl.ok || !authUrl.url) {
    return NextResponse.redirect(
      new URL(
        `/admin/settings?tab=integrations&gcal=error&reason=${encodeURIComponent(
          (authUrl.error || "Google Calendar OAuth is not configured.").slice(0, 140)
        )}`,
        request.url
      )
    );
  }

  const response = NextResponse.redirect(authUrl.url, { status: 302 });
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/admin/integrations/google-calendar",
    maxAge: 600,
  });
  return response;
}
