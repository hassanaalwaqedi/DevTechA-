import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
export default function sitemap(): MetadataRoute.Sitemap { return ["", "/technology", "/products", "/applications", "/engineering", "/about", "/careers", "/contact", "/ai-architect", "/expertise", "/solutions", "/work"].map((path) => ({url: `${SITE_URL}${path}`, lastModified: new Date(), changeFrequency: "monthly", priority: path === "" ? 1 : .8})); }
