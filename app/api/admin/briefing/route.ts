import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { requirePermissionApi } from "@/lib/auth";
import { buildMorningBriefing, listBusinessEvents } from "@/lib/intelligence/events";
import { RbacDeniedError } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  let actor;
  try {
    ({ actor } = await requirePermissionApi("dashboard", "view"));
  } catch (error) {
    if (error instanceof RbacDeniedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const wantAi = searchParams.get("synthesize") === "1";
  const locale = searchParams.get("locale") === "ar" ? "ar" : "en";

  const [briefing, events] = await Promise.all([
    buildMorningBriefing(actor),
    listBusinessEvents(actor, { hoursBack: 72, limit: 12 }),
  ]);

  if (
    wantAi &&
    process.env.AI_FEATURES_ENABLED === "true" &&
    (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY)
  ) {
    try {
      const client = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      });
      const prompt = [
        `Write a crisp 2-sentence executive morning briefing in ${locale === "ar" ? "Arabic" : "English"} for ${actor.fullName} (${actor.roleLabel}) at HIRZEXA.`,
        "Base every statement strictly on the verified JSON metrics, alerts, and source references below. Cite concrete reference IDs when present and never invent numbers or names.",
        JSON.stringify({
          counts: briefing.counts,
          alerts: briefing.alerts.slice(0, 5),
          sources: briefing.sources.slice(0, 6).map((s) => ({ label: s.label, entityType: s.entityType })),
        }),
      ].join("\n");

      const res = await Promise.race([
        client.models.generateContent({
          model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
          contents: prompt,
          config: { temperature: 0.25, maxOutputTokens: 240 },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Briefing synthesis timeout")), 10_000)
        ),
      ]);
      briefing.aiSynthesis = res.text?.trim() || null;
    } catch {
      briefing.aiSynthesis = null;
    }
  }

  return NextResponse.json({ ok: true, briefing, events });
}
