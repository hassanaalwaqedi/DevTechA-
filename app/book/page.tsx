import type { Metadata } from "next";
import { DiscoveryBookingSection } from "@/components/booking/DiscoveryBookingSection";
import type { LeadType } from "@/lib/crm-types";
import { getLocale } from "@/lib/locale";
import { createPageMetadata } from "@/lib/social-metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Book a Discovery Call — 20–30 Min Engineering Consultation",
  description:
    "Reserve a 20–30 minute engineering discovery call or request a structured technical proposal from HIRZEXA's AI and software engineering team.",
  path: "/book",
  eyebrow: "HIRZEXA / BOOK A DISCOVERY CALL",
  badge: "20–30 MIN ENGINEERING CONSULTATION",
  headline: "Book a Discovery Call with HIRZEXA.",
  summary:
    "Synchronized appointment booking, instant calendar invitations (.ics), and direct technical proposal scoping.",
  chips: ["20–30 Min Consultation", "Instant Calendar Invite", "Request a Proposal"],
  scene: "contact",
  telemetry: "SYNCHRONIZED BOOKING · B2B",
});

export default async function BookDiscoveryPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; track?: string }>;
}) {
  const [locale, resolvedParams] = await Promise.all([getLocale(), searchParams]);
  const arabic = locale === "ar";
  const initialMode: LeadType =
    resolvedParams.mode === "proposal" || resolvedParams.mode === "proposal_request"
      ? "proposal_request"
      : "discovery_call";

  return (
    <main className="dt-book-page">
      <DiscoveryBookingSection
        arabic={arabic}
        initialMode={initialMode}
        initialTrack={resolvedParams.track || ""}
        standalone
      />
    </main>
  );
}
