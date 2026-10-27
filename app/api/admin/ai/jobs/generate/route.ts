import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireAdminApi } from "@/lib/auth";
import { generateStructured, jobDraftSchema, jobPrompt } from "@/lib/ai";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    await requireAdminApi();
    const body = await request.json();
    if (typeof body.title !== "string" || !body.title.trim()) return NextResponse.json({error: "Job title is required."}, {status: 422});
    const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "admin";
    const draft = await generateStructured({key: `job:${ip}`, schema: jobDraftSchema, prompt: jobPrompt({title: body.title, department: String(body.department || ""), seniority: String(body.seniority || ""), employmentType: String(body.employmentType || ""), location: String(body.location || ""), workMode: String(body.workMode || ""), instructions: String(body.instructions || "").slice(0, 3000)})});
    return NextResponse.json({draft});
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate a job draft.";
    return NextResponse.json({error: message}, {status: message === "UNAUTHORIZED" ? 401 : 400});
  }
}
