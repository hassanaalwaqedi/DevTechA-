import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { isMissingJobVisualColumns, normalizeVisualAccent, normalizeVisualCategory, normalizeVisualKeywords, normalizeVisualVariant } from "@/lib/job-visuals";

export const runtime = "nodejs";

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) return String(error.message);
  return "Request failed.";
}

function errorResponse(error: unknown) {
  const message = errorMessage(error);
  return NextResponse.json({error: message}, {status: message === "UNAUTHORIZED" ? 401 : 400});
}

export async function PATCH(request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const {supabase} = await requireAdminApi();
    const {id} = await params;
    const body = await request.json();
    const patch: Record<string, unknown> = {};
    const fields: Record<string, string> = {
      title: "title",
      slug: "slug",
      department: "department",
      description: "description",
      location: "location",
      workMode: "work_mode",
      employmentType: "employment_type",
      duration: "duration",
      compensationType: "compensation_type",
      compensationText: "compensation_text",
      deadline: "deadline",
      status: "status",
    };
    Object.entries(fields).forEach(([key, column]) => {
      if (body[key] !== undefined) patch[column] = body[key];
    });
    if (body.responsibilities !== undefined) patch.responsibilities = body.responsibilities;
    if (body.requirements !== undefined) patch.requirements = body.requirements;
    if (body.niceToHave !== undefined) patch.nice_to_have = body.niceToHave;
    if (body.skills !== undefined) patch.skills = body.skills;
    if (body.visualCategory !== undefined) patch.visual_category = normalizeVisualCategory(body.visualCategory);
    if (body.visualVariant !== undefined) patch.visual_variant = normalizeVisualVariant(body.visualVariant);
    if (body.accentColor !== undefined) patch.accent_color = normalizeVisualAccent(body.accentColor);
    if (body.visualKeywords !== undefined) patch.visual_keywords = normalizeVisualKeywords(body.visualKeywords);
    if (body.status === "open") patch.published_at = body.publishedAt || new Date().toISOString().slice(0, 10);

    let {data, error} = await supabase.from("jobs").update(patch).eq("id", id).select().single();
    let visualIdentityPending = false;
    if (isMissingJobVisualColumns(error)) {
      visualIdentityPending = true;
      delete patch.visual_category;
      delete patch.visual_variant;
      delete patch.accent_color;
      delete patch.visual_keywords;
      ({data, error} = await supabase.from("jobs").update(patch).eq("id", id).select().single());
    }
    if (error) throw error;
    return NextResponse.json({job: data, visualIdentityPending});
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const {supabase} = await requireAdminApi();
    const {id} = await params;
    const {error} = await supabase.from("jobs").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ok: true});
  } catch (error) {
    return errorResponse(error);
  }
}
