import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/social-metadata";

export const metadata: Metadata = createPageMetadata({
  title: "AI System Architect — Interactive Software & AI Architecture Blueprint",
  description:
    "Design your AI agents, business automation, and custom software architecture interactively with HIRZEXA's Gemini-powered System Architect.",
  path: "/ai-architect",
  eyebrow: "HIRZEXA / INTERACTIVE SYSTEM ARCHITECT",
  badge: "AI & SOFTWARE ARCHITECTURE BLUEPRINT",
  headline: "Interactive AI & Software System Architect.",
  summary:
    "Generate a tailored architecture brief covering AI agents, RAG pipelines, process automation, backend APIs, and cloud infrastructure.",
  chips: ["AI & Software Blueprint", "System Architecture", "Instant Technical Brief"],
  scene: "engineering",
  telemetry: "GEMINI-POWERED ARCHITECT",
});

export default function AiArchitectLayout({ children }: { children: React.ReactNode }) {
  return children;
}

