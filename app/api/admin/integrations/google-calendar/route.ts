import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermissionApi } from "@/lib/auth";
import {
  disconnectGoogleCalendar,
  getGoogleCalendarConnectionStatus,
  testGoogleCalendarConnection,
} from "@/lib/integrations/google-calendar";
import { MfaRequiredError, RbacDeniedError } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const postSchema = z.object({
  action: z.enum(["test", "test_meet_event"]),
});

function authErrorResponse(error: unknown) {
  if (error instanceof MfaRequiredError) {
    return NextResponse.json(
      { error: error.message, code: "MFA_REQUIRED" },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }
  if (error instanceof RbacDeniedError) {
    return NextResponse.json(
      { error: error.message },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }
  return NextResponse.json(
    { error: "Unauthorized" },
    { status: 401, headers: { "Cache-Control": "no-store" } }
  );
}

/**
 * Admin-only Google Calendar connection status (strictly non-secret metadata).
 */
export async function GET() {
  try {
    await requirePermissionApi("settings", "view");
  } catch (error) {
    return authErrorResponse(error);
  }

  const status = await getGoogleCalendarConnectionStatus();
  return NextResponse.json(
    { ok: true, status },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

/**
 * Admin-only diagnostic probe for Google Calendar connectivity or temporary Meet link creation.
 */
export async function POST(request: Request) {
  let actor;
  try {
    ({ actor } = await requirePermissionApi("settings", "edit"));
  } catch (error) {
    return authErrorResponse(error);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  const result = await testGoogleCalendarConnection(actor, {
    verifyMeetCreation: parsed.data.action === "test_meet_event",
  });
  const status = await getGoogleCalendarConnectionStatus();

  return NextResponse.json(
    { ok: result.ok, result, status },
    { status: result.ok ? 200 : 502, headers: { "Cache-Control": "no-store" } }
  );
}

/**
 * Admin-only disconnect: revokes refresh token with Google and deletes encrypted DB record.
 */
export async function DELETE() {
  let actor;
  try {
    ({ actor } = await requirePermissionApi("settings", "edit"));
  } catch (error) {
    return authErrorResponse(error);
  }

  const res = await disconnectGoogleCalendar(actor);
  const status = await getGoogleCalendarConnectionStatus();
  return NextResponse.json(
    { ok: res.ok, revokedRemote: res.revokedRemote, status },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
