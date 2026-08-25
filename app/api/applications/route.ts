import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { optionalUrl, requiredText, validateCv, validateDocument } from "@/lib/validation";
import { getApplications } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth";
import { randomInt } from "node:crypto";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    await requireAdminApi();
    const url = new URL(request.url);
    return NextResponse.json({applications: await getApplications({status: url.searchParams.get("status") || undefined, query: url.searchParams.get("query") || undefined})});
  } catch (error) {
    return NextResponse.json({error: error instanceof Error ? error.message : "Request failed."}, {status: error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 400});
  }
}

export async function POST(request: Request) {
  let cvPath = "";
  let coverLetterPath = "";
  try {
    const headerStore = await headers();
    const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!checkRateLimit(`application:${ip}`)) return NextResponse.json({error: "Too many applications from this network. Try again later."}, {status: 429});
    const form = await request.formData();
    const supabase = await createSupabaseServerClient();
    const jobSlug = requiredText(form.get("jobSlug"), "Job");
    const {data: job, error: jobError} = await supabase.from("jobs").select("id,title,status,compensation_type,deadline").eq("slug", jobSlug).maybeSingle();
    if (jobError) throw jobError;
    if (!job || job.status !== "open") return NextResponse.json({error: "This position is no longer accepting applications."}, {status: 409});
    if (job.deadline && new Date(`${job.deadline}T23:59:59Z`).getTime() < Date.now()) return NextResponse.json({error: "Applications for this position are now closed."}, {status: 409});

    const cv = form.get("cv");
    if (!(cv instanceof File) || !cv.name) throw new Error("CV is required.");
    await validateCv(cv);
    const coverLetterFile = form.get("coverLetterFile");
    if (coverLetterFile instanceof File && coverLetterFile.name) await validateDocument(coverLetterFile, "Cover letter", 5 * 1024 * 1024);
    if (form.get("consent") !== "on") throw new Error("Please confirm that the information provided is accurate and may be used for recruitment.");
    if (job.compensation_type === "Unpaid" && form.get("compensationAcknowledged") !== "on") return NextResponse.json({error: "Please acknowledge the compensation status before applying."}, {status: 422});

    const email = requiredText(form.get("email"), "Email").toLowerCase();
    const {count} = await supabase.from("job_applications").select("id", {count: "exact", head: true}).eq("job_id", job.id).eq("email", email).gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    if ((count || 0) > 0) return NextResponse.json({error: "An application from this email was already received recently."}, {status: 409});

    const reference = `DEV-${new Date().getFullYear()}-${randomInt(10000, 99999)}`;
    const folder = `${job.id}/${reference}`;
    const safeName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "-");
    cvPath = `${folder}/cv-${safeName(cv.name)}`;
    const upload = await supabase.storage.from("cvs").upload(cvPath, cv, {contentType: cv.type, upsert: false});
    if (upload.error) throw upload.error;
    if (coverLetterFile instanceof File && coverLetterFile.name) {
      coverLetterPath = `${folder}/cover-letter-${safeName(coverLetterFile.name)}`;
      const coverUpload = await supabase.storage.from("cvs").upload(coverLetterPath, coverLetterFile, {contentType: coverLetterFile.type, upsert: false});
      if (coverUpload.error) throw coverUpload.error;
    }

    const {error} = await supabase.from("job_applications").insert({
      reference_id: reference,
      job_id: job.id,
      full_name: requiredText(form.get("name"), "Full name"),
      email,
      phone: form.get("phone") || null,
      country: requiredText(form.get("country"), "Country"),
      current_location: requiredText(form.get("location"), "Current location"),
      linkedin_url: optionalUrl(form.get("linkedin"), "LinkedIn"),
      github_url: optionalUrl(form.get("github"), "GitHub"),
      portfolio_url: optionalUrl(form.get("portfolio"), "Portfolio"),
      cv_path: cvPath,
      cover_letter_path: coverLetterPath || null,
      current_role: requiredText(form.get("role"), "Current role or education"),
      experience: requiredText(form.get("experience"), "Experience"),
      education: form.get("education") ? String(form.get("education")).trim() : null,
      technologies: requiredText(form.get("technologies"), "Technologies"),
      work_authorization: requiredText(form.get("workAuthorization"), "Work authorization"),
      sponsorship_required: form.get("sponsorshipRequired") === "yes",
      salary_expectation: form.get("salaryExpectation") ? String(form.get("salaryExpectation")).trim() : null,
      notice_period: form.get("noticePeriod") ? String(form.get("noticePeriod")).trim() : null,
      remote_preference: requiredText(form.get("remotePreference"), "Work preference"),
      why_join: requiredText(form.get("whyJoin"), "Why you want to join"),
      why_fit: requiredText(form.get("whyFit"), "Why you are suitable"),
      cover_letter_text: form.get("coverLetterText") ? String(form.get("coverLetterText")).trim() : null,
      availability: requiredText(form.get("availability"), "Availability"),
      expected_start_date: requiredText(form.get("startDate"), "Expected start date"),
      additional_message: form.get("additionalMessage") ? String(form.get("additionalMessage")).trim() : null,
      consent: true,
      status: "new",
    });
    if (error) throw error;
    return NextResponse.json({reference}, {status: 201});
  } catch (error) {
    const paths = [cvPath, coverLetterPath].filter(Boolean);
    if (paths.length) {
      try {
        const supabase = await createSupabaseServerClient();
        await supabase.storage.from("cvs").remove(paths);
      } catch {}
    }
    const message = error instanceof Error ? error.message : error && typeof error === "object" && "message" in error ? String((error as {message: unknown}).message) : "Unable to submit application.";
    console.error("[applications] submission failed", error);
    return NextResponse.json({error: message}, {status: 400});
  }
}
