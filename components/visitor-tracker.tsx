"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import {
  COOKIE_CONSENT_EVENT,
  readCookieConsent,
  type CookieConsentPreferences,
} from "@/lib/cookie-consent";

const visitorStorageKey = "devtech:visitor-id:v1";

function getVisitorId() {
  try {
    const existing = window.localStorage.getItem(visitorStorageKey);
    if (existing) return existing;
    const visitorId =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(visitorStorageKey, visitorId);
    return visitorId;
  } catch {
    return typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
  }
}

export function VisitorTracker() {
  const pathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);

  const trackCurrentPath = useCallback(
    (analyticsAllowed: boolean) => {
      if (
        !analyticsAllowed ||
        !pathname ||
        pathname.startsWith("/admin") ||
        lastTrackedPath.current === pathname ||
        navigator.doNotTrack === "1"
      ) {
        return;
      }

      lastTrackedPath.current = pathname;
      const payload = JSON.stringify({ path: pathname, visitorId: getVisitorId() });
      void fetch("/api/analytics/page-view", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {
        // Analytics must never interfere with the public site experience.
      });
    },
    [pathname]
  );

  useEffect(() => {
    const consent = readCookieConsent();
    trackCurrentPath(Boolean(consent?.analytics));

    const handleConsentChange = (event: Event) => {
      const detail = (event as CustomEvent<CookieConsentPreferences>).detail;
      if (detail?.analytics) {
        trackCurrentPath(true);
      }
    };

    window.addEventListener(COOKIE_CONSENT_EVENT, handleConsentChange);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_EVENT, handleConsentChange);
    };
  }, [trackCurrentPath]);

  return null;
}
