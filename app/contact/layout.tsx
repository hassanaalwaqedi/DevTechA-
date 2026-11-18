import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/social-metadata";
import { COMPANY_EMAILS } from "@/lib/company-emails";

export const metadata: Metadata = createPageMetadata({
  title: "Contact — Discuss Your AI & Software Engineering Project",
  description:
    "Connect with HIRZEXA's engineering team to discuss AI agents, business process automation, custom software platforms, cloud architecture, or AEGIS product demos.",
  path: "/contact",
  eyebrow: "HIRZEXA / OPEN A CONVERSATION",
  badge: "DIRECT ENGINEERING CONSULTATION",
  headline: "Planning an intelligent software system? Let's engineer it.",
  summary:
    "Talk directly with our AI and software engineers about intelligent automation, custom platforms, cloud integrations, and AEGIS.",
  chips: ["AI & Software Engineering", "Process Automation", COMPANY_EMAILS.general],
  scene: "contact",
  telemetry: "DIRECT ENGINEERING CONSULTATION",
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}

