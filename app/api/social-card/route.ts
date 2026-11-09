import { createHash } from "node:crypto";
import { normalizeVisualCategory } from "@/lib/job-visuals";
import {
  renderSocialCardBuffer,
  resolveSceneForCategory,
  type SceneKey,
} from "@/lib/social-card-renderer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanParam(url: URL, key: string, fallback: string, limit: number) {
  return (url.searchParams.get(key) || fallback)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const etag = `"${createHash("sha1").update(`2027-v4:${url.search}`).digest("hex")}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  const mode = url.searchParams.get("mode") === "page" ? "page" : "job";
  const title = cleanParam(
    url,
    "title",
    mode === "page" ? "Intelligence that sees the world." : "Build what comes next",
    110
  );
  const department = cleanParam(
    url,
    "department",
    mode === "page" ? "DEVTECH AI · COMPUTER VISION & EDGE AI" : "DEVTECH AI CAREERS",
    80
  );
  const summary = cleanParam(
    url,
    "summary",
    "Computer vision models, low-latency Edge AI inference, smart devices, and vision software platforms.",
    165
  );
  const location = cleanParam(url, "location", mode === "page" ? "Computer Vision" : "Remote", 38);
  const employment = cleanParam(
    url,
    "employment",
    mode === "page" ? "On-Device Edge AI" : "Full-time",
    38
  );
  const skill = cleanParam(
    url,
    "skill",
    mode === "page" ? "AEGIS AI & Smart Devices" : "Vision & AI",
    38
  );
  const category = normalizeVisualCategory(url.searchParams.get("category"));
  const accent = url.searchParams.get("accent") || "blue";
  const arabic = url.searchParams.get("lang") === "ar" || /[\u0600-\u06ff]/.test(title);
  const scene: SceneKey = resolveSceneForCategory(url.searchParams.get("scene"), category);
  const badge = url.searchParams.get("badge") || undefined;
  const telemetry = url.searchParams.get("telemetry") || undefined;
  const format = url.searchParams.get("format") === "png" ? "png" : "jpeg";

  const buffer = await renderSocialCardBuffer({
    mode,
    title,
    department,
    badge,
    summary,
    location,
    employment,
    skill,
    category,
    accent,
    arabic,
    scene,
    telemetry,
    format,
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": format === "png" ? "image/png" : "image/jpeg",
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
      "CDN-Cache-Control": "public, max-age=604800",
      "X-Content-Type-Options": "nosniff",
      ETag: etag,
    },
  });
}
