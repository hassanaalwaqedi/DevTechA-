import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { buildAccountActivatedEmail } from "@/lib/email-templates";
import {
  getInvitationReplyToAddress,
  getInvitationSenderAddress,
  isResendConfigured,
  resolvePublicInvitationBaseUrl,
  sendTransactionalEmail,
} from "@/lib/email/transactional";
import { recordAuditLog } from "@/lib/intelligence/audit";
import {
  markInvitationConsumed,
  verifyInvitationToken,
} from "@/lib/intelligence/employees";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { ROLE_TEMPLATES } from "@/lib/rbac";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const activateSchema = z.object({
  token: z.string().trim().min(16).max(200),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters.")
    .max(128)
    .regex(/[A-Z]/, "Password must include an uppercase letter.")
    .regex(/[a-z]/, "Password must include a lowercase letter.")
    .regex(/[0-9]/, "Password must include a number."),
});

export async function GET(request: Request) {
  const ip = getClientIp(request.headers);
  if (!checkRateLimit(`activate-lookup:${ip}`, 30, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many invitation verification attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": "900", "Cache-Control": "no-store" } }
    );
  }

  const { searchParams } = new URL(request.url);
  const token = (searchParams.get("token") || "").trim();
  if (!token) {
    return NextResponse.json(
      { error: "Missing invitation token." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const verified = await verifyInvitationToken(token);
  if (!verified) {
    return NextResponse.json(
      { error: "This invitation link is invalid, expired, or has already been used." },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      employee: {
        fullName: verified.employee.fullName,
        email: verified.employee.email,
        department: verified.employee.department,
        roleLabel: ROLE_TEMPLATES[verified.employee.roleKey].label,
        expiresAt: verified.invitation.expiresAt,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  if (!checkRateLimit(`activate:${ip}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many activation attempts. Please try again later." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsed = activateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(" ") },
      { status: 400 }
    );
  }

  const verified = await verifyInvitationToken(parsed.data.token);
  if (!verified) {
    return NextResponse.json(
      { error: "This invitation link is invalid, expired, or already used." },
      { status: 404 }
    );
  }

  try {
    let createdUserId: string | null = null;
    let instantEmailConfirmed = false;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    if (supabaseUrl && serviceRoleKey) {
      // Because the employee already proved inbox ownership via the single-use Resend
      // invitation link, creating via Admin API with email_confirm: true avoids sending
      // a redundant duplicate Supabase confirmation email.
      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: adminData, error: adminErr } = await adminClient.auth.admin.createUser({
        email: verified.employee.email,
        password: parsed.data.password,
        email_confirm: true,
        user_metadata: {
          full_name: verified.employee.fullName,
          role_key: verified.employee.roleKey,
        },
      });
      if (adminErr && !/already been registered|already exists/i.test(adminErr.message)) {
        return NextResponse.json({ error: adminErr.message }, { status: 400 });
      }
      createdUserId = adminData?.user?.id || null;
      instantEmailConfirmed = true;
    } else {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase.auth.signUp({
        email: verified.employee.email,
        password: parsed.data.password,
        options: {
          data: {
            full_name: verified.employee.fullName,
            role_key: verified.employee.roleKey,
          },
        },
      });

      if (error && !/already registered/i.test(error.message)) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      createdUserId = data?.user?.id || null;
    }

    await markInvitationConsumed(
      verified.invitation.id,
      verified.employee.id,
      createdUserId,
      parsed.data.token
    );

    await recordAuditLog({
      actorId: createdUserId || verified.employee.id,
      actorEmail: verified.employee.email,
      actorRole: verified.employee.roleKey,
      module: "auth",
      action: "activate_invitation",
      entityType: "employee",
      entityId: verified.employee.id,
      outcome: "allowed",
      summary: `Single-use activation completed for ${verified.employee.email}.`,
    });

    // Best-effort account activation confirmation email (non-blocking)
    const baseCheck = resolvePublicInvitationBaseUrl();
    if (isResendConfigured() && baseCheck.ok && baseCheck.baseUrl) {
      try {
        const welcomeEmail = buildAccountActivatedEmail({
          employeeName: verified.employee.fullName,
          employeeEmail: verified.employee.email,
          roleLabel: ROLE_TEMPLATES[verified.employee.roleKey].label,
          publicBaseUrl: baseCheck.baseUrl,
          fromAddress: getInvitationSenderAddress(),
          replyToAddress: getInvitationReplyToAddress(),
        });
        await sendTransactionalEmail(welcomeEmail, {
          idempotencyKey: `activated-${verified.invitation.id}`,
          tags: [
            { name: "category", value: "account_activated" },
            { name: "employee_id", value: verified.employee.id },
          ],
        });
      } catch { }
    }

    return NextResponse.json({
      ok: true,
      message: instantEmailConfirmed
        ? "Account activated and verified. You may now sign in immediately at /admin/login."
        : "Account activated. You may now sign in at /admin/login with your email and new password (confirm your email first if Supabase email confirmation is enabled).",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Activation failed." },
      { status: 500 }
    );
  }
}
