import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { isMissingExtendedProductColumns, isProductPolicyError, productErrorMessage, sanitizeColor, sanitizeOptionalUrl, sanitizeStringList } from "@/lib/product-admin";

export const runtime = "nodejs";

function responseError(error: unknown) {
  const message = productErrorMessage(error);
  return NextResponse.json({error: message}, {status: message === "UNAUTHORIZED" ? 401 : 400});
}

function policyError() {
  return new Error("Supabase is blocking product changes. Run the updated products policies from supabase/schema.sql, then try again.");
}

export async function PATCH(request: Request, {params}: {params: Promise<{slug: string}>}) {
  try {
    const {supabase} = await requireAdminApi();
    const {slug} = await params;
    const body = await request.json();
    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) patch.name = String(body.name).trim();
    if (body.slug !== undefined) {
      const nextSlug = String(body.slug).trim().toLowerCase();
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(nextSlug)) return NextResponse.json({error: "Slug may only contain lowercase letters, numbers, and hyphens."}, {status: 422});
      patch.slug = nextSlug;
    }
    if (body.description !== undefined) patch.description = String(body.description).trim();
    if (body.longDescription !== undefined) patch.long_description = String(body.longDescription).trim();
    if (body.eyebrow !== undefined) patch.eyebrow = String(body.eyebrow).trim().slice(0, 120);
    if (body.status !== undefined) patch.status = String(body.status).trim().slice(0, 80);
    if (body.platform !== undefined) patch.platforms = sanitizeStringList(body.platform);
    if (body.color !== undefined) patch.color = sanitizeColor(body.color);
    if (body.imageUrl !== undefined) {
      const imageUrl = sanitizeOptionalUrl(body.imageUrl, true);
      if (body.imageUrl && !imageUrl) return NextResponse.json({error: "Image URL must be an http(s) URL or a local path beginning with /."}, {status: 422});
      patch.image_url = imageUrl;
    }
    if (body.featured !== undefined) patch.featured = Boolean(body.featured);
    if (body.gallery !== undefined) patch.gallery_urls = sanitizeStringList(body.gallery, 8).map((value) => sanitizeOptionalUrl(value, true)).filter((value): value is string => Boolean(value));
    if (body.launchUrl !== undefined) {
      const launchUrl = sanitizeOptionalUrl(body.launchUrl);
      if (body.launchUrl && !launchUrl) return NextResponse.json({error: "Launch URL must be a valid http(s) URL."}, {status: 422});
      patch.launch_url = launchUrl;
    }
    if (body.published !== undefined) patch.is_published = Boolean(body.published);

    let {data, error} = await supabase.from("products").update(patch).eq("slug", slug).select().single();
    let extendedFieldsPending = false;
    if (isMissingExtendedProductColumns(error)) {
      extendedFieldsPending = true;
      delete patch.gallery_urls;
      delete patch.launch_url;
      delete patch.is_published;
      ({data, error} = await supabase.from("products").update(patch).eq("slug", slug).select().single());
    }
    if (isProductPolicyError(error)) throw policyError();
    if (error) throw error;
    return NextResponse.json({product: data, extendedFieldsPending});
  } catch (error) {
    return responseError(error);
  }
}

export async function DELETE(_request: Request, {params}: {params: Promise<{slug: string}>}) {
  try {
    const {supabase} = await requireAdminApi();
    const {slug} = await params;
    const {error} = await supabase.from("products").delete().eq("slug", slug);
    if (isProductPolicyError(error)) throw policyError();
    if (error) throw error;
    return NextResponse.json({ok: true});
  } catch (error) {
    return responseError(error);
  }
}
