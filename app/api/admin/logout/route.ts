import { NextResponse } from "next/server";
import { getCurrentAdmin, SESSION_VERSION_COOKIE } from "@/lib/auth";
import { recordAuditLog } from "@/lib/intelligence/audit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  try {
    const current = await getCurrentAdmin();
    if (current) {
      await recordAuditLog({
        actorId: current.actor.id,
        actorEmail: current.actor.email,
        actorRole: current.actor.roleKey,
        module: "auth",
        action: "logout",
        entityType: "session",
        entityId: current.actor.employeeId,
        outcome: "allowed",
        summary: "Signed out of HIRZEXA Intelligence.",
      });
    }
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {}

  const response = NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } }
  );
  response.cookies.set(SESSION_VERSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
  return response;
}
