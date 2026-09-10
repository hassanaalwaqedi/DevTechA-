"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const visitorStorageKey = "devtech:visitor-id:v1";

function getVisitorId() {
  try {
    const existing = window.localStorage.getItem(visitorStorageKey);
    if (existing) return existing;
    const visitorId = typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(visitorStorageKey, visitorId);
    return visitorId;
  } catch {
    return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  }
}

export function VisitorTracker() {
  const pathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin") || lastTrackedPath.current === pathname || navigator.doNotTrack === "1") return;
    lastTrackedPath.current = pathname;

    const payload = JSON.stringify({path: pathname, visitorId: getVisitorId()});
    void fetch("/api/analytics/page-view", {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: payload,
      keepalive: true,
    }).catch(() => {
      // Analytics must never interfere with the public site experience.
    });
  }, [pathname]);

  return null;
}
