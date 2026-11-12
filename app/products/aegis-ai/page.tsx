import type { Metadata } from "next";
import { getLocale } from "@/lib/locale";
import { createPageMetadata } from "@/lib/social-metadata";
import { AegisExperience } from "@/components/aegis/AegisExperience";
import "./aegis.css";

export const metadata: Metadata = createPageMetadata({
  title: "AEGIS AI — Computer Vision, Case Studies & System Architecture",
  description:
    "Explore the engineering, controlled medical and retail evaluations, 95.3% reported test result, interactive architecture, and real system walkthrough of AEGIS AI by HIRZEXA.",
  path: "/products/aegis-ai",
  eyebrow: "HIRZEXA / AEGIS AI",
  badge: "FROM RESEARCH TO REAL-WORLD IMPACT",
  headline: "From Research to Real-World Impact.",
  summary:
    "Interactive system architecture, case studies, real evaluation reporting, and live voice-enabled system walkthrough for AEGIS AI.",
  chips: ["Computer Vision & Edge AI", "95.3% Reported Result", "2nd Place · Istanbul 2026"],
  scene: "aegis",
  telemetry: "AEGIS AI · FULL ENGINEERING CASE STUDY",
});

export default async function AegisAiProductPage() {
  const locale = await getLocale();
  return <AegisExperience locale={locale} />;
}
