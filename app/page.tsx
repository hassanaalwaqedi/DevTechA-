import type { Metadata } from "next";
import { getLocale } from "@/lib/locale";
import { getProductsResult, getPublishedJobsResult } from "@/lib/db";
import { khairProduct } from "@/lib/data";
import { HeroSection } from "@/components/home/HeroSection";
import { MetricsRibbon } from "@/components/home/MetricsRibbon";
import { CapabilitiesSection } from "@/components/home/CapabilitiesSection";

export const metadata: Metadata = {
  title: "DevTech AI — Computer Vision & Edge Intelligence",
  description:
    "Intelligence that sees the world. We build computer vision and Edge AI technologies that turn cameras and devices into intelligent systems — from real-time perception to actionable insights.",
};

export default async function Home() {
  const [locale, productsResult, jobsResult] = await Promise.all([
    getLocale(),
    getProductsResult(),
    getPublishedJobsResult(),
  ]);

  const arabic = locale === "ar";
  const products =
    productsResult.available && productsResult.products.length > 0
      ? productsResult.products
      : [khairProduct];
  const projectCount = products.length;
  const openPositionsCount = jobsResult.available ? jobsResult.jobs.length : null;

  return (
    <main className="dt-home">
      <HeroSection arabic={arabic} />
      <MetricsRibbon
        arabic={arabic}
        projectCount={projectCount}
        openPositionsCount={openPositionsCount}
      />
      <CapabilitiesSection arabic={arabic} />
    </main>
  );
}
