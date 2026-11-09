import { getJobBySlug } from "@/lib/db";
import { buildJobCardInput, renderSocialCardBuffer } from "@/lib/social-card-renderer";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug: rawSlug } = await params;
  const isPng = rawSlug.toLowerCase().endsWith(".png");
  const cleanSlug = rawSlug.replace(/\.(jpg|jpeg|png)$/i, "");

  const job = await getJobBySlug(cleanSlug);
  if (!job) return new Response(null, { status: 404 });
  const buffer = await renderSocialCardBuffer(buildJobCardInput(job, isPng ? "png" : "jpeg"));

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
