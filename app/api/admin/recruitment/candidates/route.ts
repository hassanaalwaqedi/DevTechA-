import { NextRequest, NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth";
import type { CandidateSource } from "@/lib/data";
import { getAdminJobs } from "@/lib/db";
import { RbacDeniedError } from "@/lib/rbac";
import {
  createExternalCandidate,
  findDuplicateCandidates,
} from "@/lib/recruitment/service";
import { CANDIDATE_SOURCES } from "@/lib/recruitment/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function handleAuthError(err: unknown, fallback: string) {
  if (err instanceof RbacDeniedError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  const msg = err instanceof Error ? err.message : "";
  if (/unauthor|session|suspend|sign in|login/i.test(msg)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function GET(request: NextRequest) {
  try {
    const { actor } = await requirePermissionApi("recruitment", "view");
    const email = request.nextUrl.searchParams.get("email")?.trim() || "";
    const jobId = request.nextUrl.searchParams.get("jobId")?.trim() || null;
    const includeJobs = request.nextUrl.searchParams.get("includeJobs") !== "false";

    const [duplicates, jobs] = await Promise.all([
      email ? findDuplicateCandidates(actor, { email, jobId }) : Promise.resolve([]),
      includeJobs ? getAdminJobs().catch(() => []) : Promise.resolve([]),
    ]);

    return NextResponse.json({
      duplicates,
      jobs: jobs.map((j) => ({
        id: j.id,
        title: j.title,
        department: j.department,
        status: j.status,
      })),
    });
  } catch (err) {
    return handleAuthError(err, "Unable to query candidate metadata.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { actor } = await requirePermissionApi("recruitment", "edit");
    const contentType = request.headers.get("content-type") || "";

    let fullName = "";
    let email = "";
    let phone: string | null = null;
    let jobId: string | null = null;
    let customPositionTitle: string | null = null;
    let source: CandidateSource = "linkedin";
    let linkedinUrl: string | null = null;
    let location: string | null = null;
    let country: string | null = null;
    let currentRole: string | null = null;
    let experience: string | null = null;
    let internalNotes: string | null = null;
    let cvFile: File | null = null;
    let dedupeAction: "check" | "merge" | "create_separate" = "check";
    let mergeTargetReferenceId: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      fullName = String(form.get("fullName") || "").trim();
      email = String(form.get("email") || "").trim();
      phone = form.get("phone") ? String(form.get("phone")).trim() : null;
      jobId = form.get("jobId") ? String(form.get("jobId")).trim() : null;
      customPositionTitle = form.get("customPositionTitle")
        ? String(form.get("customPositionTitle")).trim()
        : null;
      const rawSource = String(form.get("source") || "linkedin").trim() as CandidateSource;
      source = CANDIDATE_SOURCES.includes(rawSource) ? rawSource : "linkedin";
      linkedinUrl = form.get("linkedinUrl") ? String(form.get("linkedinUrl")).trim() : null;
      location = form.get("location") ? String(form.get("location")).trim() : null;
      country = form.get("country") ? String(form.get("country")).trim() : null;
      currentRole = form.get("currentRole") ? String(form.get("currentRole")).trim() : null;
      experience = form.get("experience") ? String(form.get("experience")).trim() : null;
      internalNotes = form.get("internalNotes") ? String(form.get("internalNotes")).trim() : null;
      const rawAction = String(form.get("dedupeAction") || "check");
      if (rawAction === "merge" || rawAction === "create_separate") {
        dedupeAction = rawAction;
      }
      mergeTargetReferenceId = form.get("mergeTargetReferenceId")
        ? String(form.get("mergeTargetReferenceId")).trim()
        : null;
      const rawCv = form.get("cv");
      if (rawCv instanceof File && rawCv.size > 0) {
        cvFile = rawCv;
      }
    } else {
      let body: Record<string, unknown>;
      try {
        body = (await request.json()) as Record<string, unknown>;
      } catch {
        return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
      }
      fullName = String(body.fullName || "").trim();
      email = String(body.email || "").trim();
      phone = body.phone ? String(body.phone).trim() : null;
      jobId = body.jobId ? String(body.jobId).trim() : null;
      customPositionTitle = body.customPositionTitle
        ? String(body.customPositionTitle).trim()
        : null;
      const rawSource = String(body.source || "linkedin").trim() as CandidateSource;
      source = CANDIDATE_SOURCES.includes(rawSource) ? rawSource : "linkedin";
      linkedinUrl = body.linkedinUrl ? String(body.linkedinUrl).trim() : null;
      location = body.location ? String(body.location).trim() : null;
      country = body.country ? String(body.country).trim() : null;
      currentRole = body.currentRole ? String(body.currentRole).trim() : null;
      experience = body.experience ? String(body.experience).trim() : null;
      internalNotes = body.internalNotes ? String(body.internalNotes).trim() : null;
      const rawAction = String(body.dedupeAction || "check");
      if (rawAction === "merge" || rawAction === "create_separate") {
        dedupeAction = rawAction;
      }
      mergeTargetReferenceId = body.mergeTargetReferenceId
        ? String(body.mergeTargetReferenceId).trim()
        : null;
    }

    const result = await createExternalCandidate(actor, {
      fullName,
      email,
      phone,
      jobId,
      customPositionTitle,
      source,
      linkedinUrl,
      location,
      country,
      currentRole,
      experience,
      internalNotes,
      cvFile,
      dedupeAction,
      mergeTargetReferenceId,
    });

    if (result.duplicateDetected) {
      return NextResponse.json(result, { status: 409 });
    }
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result, { status: result.merged ? 200 : 201 });
  } catch (err) {
    return handleAuthError(err, "Unable to add external candidate.");
  }
}
