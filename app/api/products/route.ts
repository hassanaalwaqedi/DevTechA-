import { NextResponse } from "next/server";
import { getAdminProducts, getProducts } from "@/lib/db";
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

export async function GET(request: Request) {
  try {
    const admin = new URL(request.url).searchParams.get("admin") === "true";
    if (admin) {
      await requireAdminApi();
      return NextResponse.json({products: await getAdminProducts()});
    }
    return NextResponse.json({products: await getProducts()});
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: Request) {
  try {
    const {supabase} = await requireAdminApi();
    const body = await request.json();
    const name = String(body.name || "").trim();
    const slug = String(body.slug || "").trim().toLowerCase();
    const description = String(body.description || "").trim();
    if (!name || !slug || !description) return NextResponse.json({error: "Name, slug, and description are required."}, {status: 422});
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return NextResponse.json({error: "Slug may only contain lowercase letters, numbers, and hyphens."}, {status: 422});

    const imageUrl = sanitizeOptionalUrl(body.imageUrl, true);
    const launchUrl = sanitizeOptionalUrl(body.launchUrl);
    if (body.imageUrl && !imageUrl) return NextResponse.json({error: "Image URL must be an http(s) URL or a local path beginning with /."}, {status: 422});
    if (body.launchUrl && !launchUrl) return NextResponse.json({error: "Launch URL must be a valid http(s) URL."}, {status: 422});
    const galleryUrls = sanitizeStringList(body.gallery, 8).map((value) => sanitizeOptionalUrl(value, true)).filter((value): value is string => Boolean(value));
    const baseProduct = {
      name,
      slug,
      eyebrow: String(body.eyebrow || "Product").trim().slice(0, 120),
      description,
      long_description: String(body.longDescription || description).trim(),
      status: String(body.status || "In development").trim().slice(0, 80),
      platforms: sanitizeStringList(body.platform),
      color: sanitizeColor(body.color),
      image_url: imageUrl,
      featured: Boolean(body.featured),
    };
    const extendedProduct = {gallery_urls: galleryUrls, launch_url: launchUrl, is_published: Boolean(body.published)};

    let {data, error} = await supabase.from("products").insert({...baseProduct, ...extendedProduct}).select().single();
    let extendedFieldsPending = false;
    if (isMissingExtendedProductColumns(error)) {
      extendedFieldsPending = true;
      ({data, error} = await supabase.from("products").insert(baseProduct).select().single());
    }
    if (isProductPolicyError(error)) throw policyError();
    if (error) throw error;
    return NextResponse.json({product: data, extendedFieldsPending}, {status: 201});
  } catch (error) {
    return responseError(error);
  }
}
