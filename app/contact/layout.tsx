import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/social-metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Contact — Discuss Your Computer Vision & Edge AI Project",
  description:
    "Connect with DevTech AI's engineering team to discuss computer vision systems, Edge AI deployment, AEGIS AI evaluations, or smart device partnerships.",
  path: "/contact",
  eyebrow: "DEVTECH AI / OPEN A CONVERSATION",
  badge: "DIRECT ENGINEERING CONSULTATION",
  headline: "Building with intelligent vision? Let's engineer it.",
  summary:
    "Talk directly with our Computer Vision and Edge AI engineers about AEGIS AI, custom vision pipelines, and smart hardware.",
  chips: ["Computer Vision & Edge AI", "AEGIS AI Demo", "hello@devtech.ai"],
  scene: "contact",
  telemetry: "DIRECT HUMAN-AI CONNECTION",
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}

