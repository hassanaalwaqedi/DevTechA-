"use client";

import { openCookieSettings } from "@/lib/cookie-consent";

export function CookieSettingsButton({ arabic }: { arabic: boolean }) {
  return (
    <button
      type="button"
      className="dt-footer-cookie-btn"
      onClick={openCookieSettings}
    >
      {arabic ? "إعدادات الكوكيز" : "Cookie Settings"}
    </button>
  );
}
