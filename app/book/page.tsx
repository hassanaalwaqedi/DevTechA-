import type { Metadata } from "next";
import "./book.css";
import { DiscoveryBookingSection } from "@/components/booking/DiscoveryBookingSection";
import type { LeadType } from "@/lib/crm-types";
import { getLocale } from "@/lib/locale";
import { createPageMetadata } from "@/lib/social-metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Book a Discovery Call — Engineering Consultation",
  description:
    "Discuss your software or AI project with HIRZEXA's engineering team. Select an available time slot for a 30-minute Google Meet consultation.",
  path: "/book",
  eyebrow: "HIRZEXA / BOOK A DISCOVERY CALL",
  badge: "30 MIN ENGINEERING CONSULTATION",
  headline: "Book a Discovery Call with HIRZEXA.",
  summary:
    "Select an available time slot, receive a calendar invitation and Google Meet link, and discuss your architecture with our engineering team.",
  chips: ["30 Minutes", "Google Meet", "Free Consultation"],
  scene: "contact",
  telemetry: "SYNCHRONIZED BOOKING · B2B",
});

export default async function BookDiscoveryPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; track?: string; ref?: string }>;
}) {
  const [locale, resolvedParams] = await Promise.all([getLocale(), searchParams]);
  const arabic = locale === "ar";
  const initialMode: LeadType =
    resolvedParams.mode === "proposal" || resolvedParams.mode === "proposal_request"
      ? "proposal_request"
      : "discovery_call";
  const manageRef =
    typeof resolvedParams.ref === "string" && /^HRZ-[A-Za-z0-9_-]{4,48}$/.test(resolvedParams.ref.trim())
      ? resolvedParams.ref.trim()
      : "";

  return (
    <DiscoveryBookingSection
      arabic={arabic}
      initialMode={initialMode}
      initialTrack={resolvedParams.track || ""}
      manageRef={manageRef}
      standalone
    />
  );
}
