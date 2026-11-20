"use client";

import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { VisitorTracker } from "@/components/visitor-tracker";
import { StickyBookingBar } from "@/components/booking/StickyBookingBar";
import { FloatingDiscoveryCallCard } from "@/components/booking/FloatingDiscoveryCallCard";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import type { Locale } from "@/lib/locale";

/**
 * Isolates public marketing navigation, booking widgets, cookie banner, visitor tracker,
 * and marketing footer so `/admin/*` runs in its own authenticated application layout.
 */
export function PublicSiteChrome({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");

  if (isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <SiteHeader />
      <VisitorTracker />
      {children}
      <StickyBookingBar />
      <FloatingDiscoveryCallCard />
      <CookieConsentBanner />
      <SiteFooter locale={locale} />
    </>
  );
}
