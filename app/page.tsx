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
  title: "HIRZEXA | AI & Software Engineering",
  description:
    "HIRZEXA is an AI and software engineering company specializing in intelligent automation, AI-powered applications, scalable software platforms, and complex system integrations.",
  path: "/",
  eyebrow: "HIRZEXA · AI & SOFTWARE ENGINEERING",
  badge: "WE ENGINEER INTELLIGENT SOFTWARE SYSTEMS",
  headline: "We Engineer Intelligent Software Systems.",
  summary:
    "From AI-powered automation to scalable enterprise platforms, we design, build, and deploy intelligent software that solves real business challenges.",
  chips: ["AI Engineering & Agents", "Process Automation", "Custom Software & Cloud"],
  scene: "technology",
  telemetry: "AI & SOFTWARE ENGINEERING",
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
