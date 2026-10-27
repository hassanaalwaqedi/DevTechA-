import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { generateStructured, jobVisualPrompt, jobVisualSchema } from "@/lib/ai";
import { requireAdminApi } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireAdminApi();
    const body = await request.json();
    if (typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({error: "Add a job title before requesting a visual recommendation."}, {status: 422});
    }
    const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "admin";
    const classification = await generateStructured({
      key: `job-visual:${ip}`,
      limit: 16,
      schema: jobVisualSchema,
      prompt: jobVisualPrompt({
        title: body.title.trim().slice(0, 180),
        department: String(body.department || "").trim().slice(0, 120),
        description: String(body.description || "").trim().slice(0, 2500),
        skills: Array.isArray(body.skills) ? body.skills.slice(0, 16) : [],
      }),
    });
    return NextResponse.json({classification});
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to classify this role.";
    return NextResponse.json({error: message}, {status: message === "UNAUTHORIZED" ? 401 : 400});
  }
}
