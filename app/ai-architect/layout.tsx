import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/social-metadata";

export const metadata: Metadata = createPageMetadata({
  title: "AI System Architect — Interactive Computer Vision & Edge AI Blueprint",
  description:
    "Design your Computer Vision and Edge AI system architecture interactively with DevTech AI's Gemini-powered System Architect.",
  path: "/ai-architect",
  eyebrow: "DEVTECH AI / INTERACTIVE SYSTEM ARCHITECT",
  badge: "AI ARCHITECTURE BLUEPRINT",
  headline: "Interactive Computer Vision & Edge AI System Architect.",
  summary:
    "Generate a tailored architecture brief covering camera ingestion, model selection, Edge NPU inference, and operator dashboards.",
  chips: ["Vision Blueprint", "Edge NPU Sizing", "Instant Technical Brief"],
  scene: "engineering",
  telemetry: "GEMINI-POWERED ARCHITECT",
});

export default function AiArchitectLayout({ children }: { children: React.ReactNode }) {
  return children;
}
