import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { extractCvProfile } from "@/lib/ai";
import { validateCv } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const headerStore = await headers();
    const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    const form = await request.formData();
    const cv = form.get("cv");
    if (!(cv instanceof File) || !cv.name) {
      return NextResponse.json({error: "Please select a CV file (PDF or DOCX)."}, {status: 422});
    }

    await validateCv(cv);

    const jobTitle = typeof form.get("jobTitle") === "string" ? String(form.get("jobTitle")).trim().slice(0, 160) : "";
    const jobDepartment = typeof form.get("jobDepartment") === "string" ? String(form.get("jobDepartment")).trim().slice(0, 120) : "";
    const locale = form.get("locale") === "ar" ? "ar" : "en";

    const fileBuffer = Buffer.from(await cv.arrayBuffer());
    const profile = await extractCvProfile({
      key: ip,
      fileBuffer,
      fileName: cv.name,
      mimeType: cv.type,
      jobTitle,
      jobDepartment,
      locale,
    });

    return NextResponse.json({profile});
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to parse CV right now.";
    return NextResponse.json({error: message}, {status: 400});
  }
}

