import { NextRequest, NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth";
import { RbacDeniedError } from "@/lib/rbac";
import {
  getSettingsDiagnosticsSnapshot,
  runAiRuntimeHealthCheck,
  runContactWebhookHealthCheck,
  runDnsAndSenderVerification,
  sendSettingsDiagnosticEmail,
} from "@/lib/settings/diagnostics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { actor } = await requirePermissionApi("settings", "edit");

    let body: {
      action?: string;
      recipientEmail?: string;
      confirmed?: boolean;
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const action = String(body.action || "").trim();

    if (action === "test_ai") {
      const result = await runAiRuntimeHealthCheck(actor);
      const snapshot = await getSettingsDiagnosticsSnapshot(actor);
      return NextResponse.json({ ok: result.ok, result, snapshot });
    }

    if (action === "verify_email_dns") {
      const result = await runDnsAndSenderVerification(actor);
      const snapshot = await getSettingsDiagnosticsSnapshot(actor);
      return NextResponse.json({ ok: true, result, snapshot });
    }

    if (action === "test_contact_webhook") {
      const result = await runContactWebhookHealthCheck(actor);
      const snapshot = await getSettingsDiagnosticsSnapshot(actor);
      return NextResponse.json({ ok: result.ok, result, snapshot });
    }

    if (action === "send_test_email") {
      if (body.confirmed !== true) {
        return NextResponse.json(
          { error: "Explicit confirmation is required before sending a diagnostic test email." },
          { status: 400 }
        );
      }
      const recipient = String(body.recipientEmail || "").trim();
      if (!recipient) {
        return NextResponse.json({ error: "recipientEmail is required." }, { status: 400 });
      }
      const result = await sendSettingsDiagnosticEmail(actor, recipient);
      const snapshot = await getSettingsDiagnosticsSnapshot(actor);
      return NextResponse.json(
        { ok: result.ok, result, snapshot },
        { status: result.ok ? 200 : 400 }
      );
    }

    return NextResponse.json({ error: `Unsupported settings action: ${action}` }, { status: 400 });
  } catch (err) {
    if (err instanceof RbacDeniedError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const msg = err instanceof Error ? err.message : "";
    if (/unauthor|session|suspend|sign in|login/i.test(msg)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Settings action failed." }, { status: 500 });
  }
}
