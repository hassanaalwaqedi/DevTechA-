import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAdminApi } from "@/lib/auth";
import {
  getDemoConfigEnvelope,
  publishDemoConfig,
  resetDemoConfigToDefaults,
  saveDemoConfigDraft,
} from "@/lib/demo-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminApi();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const envelope = await getDemoConfigEnvelope();
  return NextResponse.json(envelope, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function PUT(request: Request) {
  let actorEmail = "Admin";
  try {
    const { user } = await requireAdminApi();
    if (user?.email) actorEmail = user.email;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { action?: string; config?: unknown };
  try {
    body = (await request.json()) as { action?: string; config?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!body.config || typeof body.config !== "object") {
    return NextResponse.json({ error: "Missing configuration object." }, { status: 400 });
  }

  try {
    const isPublish = body.action === "publish";
    const result = isPublish
      ? await publishDemoConfig(body.config, actorEmail)
      : await saveDemoConfigDraft(body.config, actorEmail);

    return NextResponse.json({
      ok: true,
      action: isPublish ? "published" : "saved_draft",
      persistedToDatabase: result.persistedToDatabase,
      envelope: result.envelope,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Configuration validation failed. Ensure all required English/Arabic labels and nodes are valid.",
          issues: error.issues.slice(0, 6),
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Unable to save interactive demonstration settings." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  let actorEmail = "Admin";
  try {
    const { user } = await requireAdminApi();
    if (user?.email) actorEmail = user.email;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let publishImmediately = true;
  try {
    const body = (await request.json()) as { publish?: boolean };
    if (typeof body.publish === "boolean") publishImmediately = body.publish;
  } catch {}

  const result = await resetDemoConfigToDefaults(publishImmediately, actorEmail);
  return NextResponse.json({
    ok: true,
    persistedToDatabase: result.persistedToDatabase,
    envelope: result.envelope,
  });
}
