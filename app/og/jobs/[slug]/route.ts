import { getJobBySlug } from "@/lib/db";
import { renderSocialCardBuffer } from "@/lib/social-card-renderer";

export const runtime = "nodejs";

function socialExcerpt(value: string, limit = 135) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;
  const clipped = clean.slice(0, limit + 1).replace(/\s+\S*$/, "").trim();
  return `${clipped || clean.slice(0, limit).trim()}…`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug: rawSlug } = await params;
  const isPng = rawSlug.toLowerCase().endsWith(".png");
  const cleanSlug = rawSlug.replace(/\.(jpg|jpeg|png)$/i, "");

  const job = await getJobBySlug(cleanSlug);
  const title = job?.title || "Engineer the Systems Behind Intelligent Vision";
  const isArabic = /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/.test(title);
  const summary = socialExcerpt(
    job?.responsibilities[0] ||
      job?.description ||
      "Join DevTech AI in building computer vision models, Edge AI inference systems, and intelligent devices."
  );

  const buffer = await renderSocialCardBuffer({
    mode: "job",
    title,
    department: job?.department || "DEVTECH AI CAREERS",
    summary,
    location: job ? `${job.location} · ${job.workMode}` : "Remote · Global",
    employment: job?.employmentType || "Full-time",
    skill: job?.skills[0] || "Computer Vision & AI",
    category: job?.visualCategory || "computer-vision",
    accent: job?.accentColor || "blue",
    arabic: isArabic,
    format: isPng ? "png" : "jpeg",
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": isPng ? "image/png" : "image/jpeg",
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
      "CDN-Cache-Control": "public, max-age=604800",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

