import type { Metadata } from "next";
import { getLocale } from "@/lib/locale";
import { getProductsResult, getPublishedJobsResult } from "@/lib/db";
import { khairProduct } from "@/lib/data";
import { HeroSection } from "@/components/home/HeroSection";
import { MetricsRibbon } from "@/components/home/MetricsRibbon";
import { CapabilitiesSection } from "@/components/home/CapabilitiesSection";
import { RecognitionSection } from "@/components/recognition/RecognitionSection";
import { FounderTeamPreview } from "@/components/team/FounderAndTeamSection";
import { createPageMetadata } from "@/lib/social-metadata";

export const metadata: Metadata = createPageMetadata({
  title: "HIRZEXA | Computer Vision & Edge AI Technologies",
  description:
    "HIRZEXA develops computer vision and Edge AI technologies for intelligent cameras, devices, and real-world visual intelligence applications.",
  path: "/",
  eyebrow: "HIRZEXA · COMPUTER VISION · EDGE INTELLIGENCE",
  badge: "INTELLIGENCE THAT SEES THE WORLD",
  headline: "Intelligence that sees the world.",
  summary:
    "We build computer vision and Edge AI technologies that turn cameras and devices into intelligent systems — from real-time perception to actionable insights.",
  chips: ["Computer Vision", "On-Device Edge AI", "AEGIS AI & Smart Devices"],
  scene: "technology",
  telemetry: "OPTICAL PERCEPTION · ON-DEVICE AI",
});

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
      <RecognitionSection locale={locale} variant="compact" />
      <FounderTeamPreview locale={locale} />
    </main>
  );
}
