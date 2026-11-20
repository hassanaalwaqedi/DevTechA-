import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { SESSION_VERSION_COOKIE } from "@/lib/auth";
import { recordAuditLog } from "@/lib/intelligence/audit";
import { resolveOrBootstrapActor } from "@/lib/intelligence/employees";

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

  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const response = NextResponse.json({ ok: true });

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
            response.cookies.set(name, value, options)
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

  response.cookies.set(SESSION_VERSION_COOKIE, String(actor.sessionVersion), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 14,
  });

  await recordAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.roleKey,
    module: "auth",
    action: "login",
    entityType: "session",
    entityId: actor.employeeId,
    outcome: "allowed",
    summary: `Signed in as ${actor.roleLabel}.`,
  });

  return response;
}
