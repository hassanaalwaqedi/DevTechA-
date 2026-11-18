import type { Metadata } from "next";
import { getLocale } from "@/lib/locale";
import { createPageMetadata } from "@/lib/social-metadata";
import { AegisExperience } from "@/components/aegis/AegisExperience";
import "./aegis.css";

export const metadata: Metadata = createPageMetadata({
  title: "AEGIS — AI-Powered Visual Safety & Computer Vision | Products & Innovation",
  description:
    "AEGIS is an engineering product under HIRZEXA's Products & Innovation portfolio demonstrating intelligent video analysis, object detection, tracking, event monitoring, and a 95.3% reported evaluation result.",
  path: "/products/aegis-ai",
  eyebrow: "HIRZEXA / PRODUCTS & INNOVATION · AEGIS",
  badge: "AI-POWERED VISUAL SAFETY & COMPUTER VISION",
  headline: "From Research to Real-World Impact.",
  summary:
    "An engineering product demonstrating intelligent video analysis, object detection, tracking, and event monitoring.",
  chips: ["Products & Innovation", "95.3% Reported Result", "2nd Place · Istanbul 2026"],
  scene: "aegis",
  telemetry: "AEGIS · AI-POWERED VISUAL SAFETY",
});

export default async function AegisAiProductPage() {
  const locale = await getLocale();
  return <AegisExperience locale={locale} />;
}
