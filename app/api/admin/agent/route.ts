import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermissionApi } from "@/lib/auth";
import { listActorConversations, runAgentTurn } from "@/lib/intelligence/agent";
import { listRegisteredToolsMetadata } from "@/lib/intelligence/tools";
import { hasPermission, RbacDeniedError } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const agentPostSchema = z.object({
  message: z.string().trim().min(1).max(1500),
  conversationId: z.string().trim().max(120).optional(),
  locale: z.enum(["en", "ar"]).optional(),
  inputChannel: z.enum(["text", "voice"]).optional(),
  pageContext: z
    .object({
      route: z.string().trim().max(200),
      entityType: z
        .enum(["lead", "booking", "application", "job", "employee", "dashboard"])
        .optional(),
      entityId: z.string().trim().max(120).optional(),
      entityLabel: z.string().trim().max(160).optional(),
    })
    .optional(),
});

export async function GET() {
  try {
    const { actor } = await requirePermissionApi("agent", "view");
    const conversations = await listActorConversations(actor);
    return NextResponse.json({
      ok: true,
      actor: {
        fullName: actor.fullName,
        email: actor.email,
        roleKey: actor.roleKey,
        roleLabel: actor.roleLabel,
        scope: actor.scope,
      },
      tools: listRegisteredToolsMetadata().filter((t) =>
        hasPermission(actor, t.module, t.action)
      ),
      conversations,
    });
  } catch (error) {
    if (error instanceof RbacDeniedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  let actor;
  try {
    ({ actor } = await requirePermissionApi("agent", "view"));
  } catch (error) {
    if (error instanceof RbacDeniedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = agentPostSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  try {
    const result = await runAgentTurn({
      actor,
      message: parsed.data.message,
      conversationId: parsed.data.conversationId,
      locale: parsed.data.locale,
      inputChannel: parsed.data.inputChannel || "text",
      pageContext: parsed.data.pageContext,
    });

    return NextResponse.json({
      ok: true,
      conversation: result.conversation,
      reply: result.reply,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to process Agent request.";
    return NextResponse.json({ error: message }, { status: 429 });
  }
}
