import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { briefPrompt, generateStructured, technicalBriefSchema } from "@/lib/ai";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const description = typeof body.description === "string" ? body.description.trim() : "";
    if (description.length < 25 || description.length > 8000) return NextResponse.json({error: "Describe the project in 25–8,000 characters."}, {status: 422});
    const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const brief = await generateStructured({key: `architect:${ip}`, limit: 5, schema: technicalBriefSchema, prompt: briefPrompt({category: String(body.category || "General intelligent systems"), description, answers: Array.isArray(body.answers) ? body.answers.slice(0, 6) : []})});
    return NextResponse.json({brief});
  } catch (error) { return NextResponse.json({error: error instanceof Error ? error.message : "AI Architect is temporarily unavailable."}, {status: 400}); }
}
