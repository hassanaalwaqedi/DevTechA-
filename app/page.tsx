import type { Metadata } from "next";
import { getLocale } from "@/lib/locale";
import { getPublishedDemoConfig } from "@/lib/demo-config";
import { HeroSection } from "@/components/home/HeroSection";
import { MetricsRibbon } from "@/components/home/MetricsRibbon";
import { CapabilitiesSection } from "@/components/home/CapabilitiesSection";
import { B2BProcessSection } from "@/components/home/B2BProcessSection";
import { VerifiedWorkSection } from "@/components/home/VerifiedWorkSection";
import { DiscoveryBookingSection } from "@/components/booking/DiscoveryBookingSection";
import { RecognitionSection } from "@/components/recognition/RecognitionSection";
import { FounderTeamPreview } from "@/components/team/FounderAndTeamSection";
import { createPageMetadata } from "@/lib/social-metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  title: "HIRZEXA | AI & Software Engineering",
  description:
    "HIRZEXA is an AI and software engineering company specializing in intelligent automation, AI-powered applications, scalable software platforms, and complex system integrations. Book a 20–30 minute discovery call.",
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
  const [locale, demoConfig] = await Promise.all([
    getLocale(),
    getPublishedDemoConfig(),
  ]);
  const arabic = locale === "ar";

  return (
    <main className="dt-home">
      <HeroSection arabic={arabic} demoConfig={demoConfig} />
      <MetricsRibbon arabic={arabic} />
      <CapabilitiesSection arabic={arabic} />
      <B2BProcessSection arabic={arabic} />
      <VerifiedWorkSection arabic={arabic} />
      <DiscoveryBookingSection arabic={arabic} />
      <RecognitionSection locale={locale} variant="compact" />
      <FounderTeamPreview locale={locale} />
    </main>
  );
}
