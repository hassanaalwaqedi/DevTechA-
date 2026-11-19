"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Check, Cookie, SlidersHorizontal, X } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import {
  OPEN_COOKIE_SETTINGS_EVENT,
  readCookieConsent,
  saveCookieConsent,
} from "@/lib/cookie-consent";

export function CookieConsentBanner() {
  const pathname = usePathname();
  const ar = useLanguage() === "ar";
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [hasExistingChoice, setHasExistingChoice] = useState(false);

  const isAdminRoute = pathname?.startsWith("/admin");

  useEffect(() => {
    setMounted(true);
    const existing = readCookieConsent();
    if (existing) {
      setHasExistingChoice(true);
      setAnalyticsEnabled(existing.analytics);
      setVisible(false);
    } else {
      setVisible(true);
    }

    const onOpenSettings = () => {
      const latest = readCookieConsent();
      setHasExistingChoice(Boolean(latest));
      setAnalyticsEnabled(latest ? latest.analytics : true);
      setShowCustomize(true);
      setVisible(true);
    };

    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, onOpenSettings);
    return () => {
      window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, onOpenSettings);
    };
  }, []);

  // Coordinate cleanly with StickyBookingBar so they never overlap
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (visible && !isAdminRoute) {
      document.documentElement.dataset.cookieBannerOpen = "true";
    } else {
      delete document.documentElement.dataset.cookieBannerOpen;
    }
    return () => {
      delete document.documentElement.dataset.cookieBannerOpen;
    };
  }, [visible, isAdminRoute]);

  if (!mounted || !visible || isAdminRoute) return null;

  const handleAcceptAll = () => {
    saveCookieConsent(true);
    setHasExistingChoice(true);
    setAnalyticsEnabled(true);
    setShowCustomize(false);
    setVisible(false);
  };

  const handleEssentialOnly = () => {
    saveCookieConsent(false);
    setHasExistingChoice(true);
    setAnalyticsEnabled(false);
    setShowCustomize(false);
    setVisible(false);
  };

  const handleSaveCustom = () => {
    saveCookieConsent(analyticsEnabled);
    setHasExistingChoice(true);
    setShowCustomize(false);
    setVisible(false);
  };

  return (
    <aside
      className="dt-cookie-banner"
      role="dialog"
      aria-live="polite"
      aria-label={ar ? "تفضيلات ملفات تعريف الارتباط" : "Cookie preferences"}
      dir={ar ? "rtl" : "ltr"}
    >
      <div className="dt-cookie-card">
        <div className="dt-cookie-head">
          <div className="dt-cookie-title-row">
            <span className="dt-cookie-icon" aria-hidden="true">
              <Cookie size={17} strokeWidth={2.1} />
            </span>
            <strong>{ar ? "إعدادات ملفات تعريف الارتباط" : "We value your privacy"}</strong>
          </div>
          {hasExistingChoice ? (
            <button
              type="button"
              className="dt-cookie-close"
              onClick={() => setVisible(false)}
              aria-label={ar ? "إغلاق" : "Close"}
            >
              <X size={15} />
            </button>
          ) : null}
        </div>

        <p className="dt-cookie-desc">
          {ar ? (
            <>
              تستخدم HIRZEXA ملفات تعريف ارتباط أساسية لحفظ اللغة وأمان حجز الجلسات، بالإضافة إلى تحليلات اختيارية لتحسين أداء المنصة.{" "}
              <Link href="/privacy">سياسة الخصوصية</Link>
            </>
          ) : (
            <>
              HIRZEXA uses essential cookies for language preference and secure consultation booking, plus optional analytics to improve our platform.{" "}
              <Link href="/privacy">Privacy Policy</Link>
            </>
          )}
        </p>

        {showCustomize ? (
          <div className="dt-cookie-prefs">
            <div className="dt-cookie-pref-row">
              <div>
                <strong>{ar ? "ملفات أساسية ضرورية" : "Essential Cookies"}</strong>
                <span>
                  {ar
                    ? "تفضيل اللغة (العربية/الإنجليزية)، الأمان، وتجربة الحجز."
                    : "Language preference, security protection, and booking session."}
                </span>
              </div>
              <span className="dt-cookie-always-on">
                {ar ? "مفعّلة دائماً" : "Always On"}
              </span>
            </div>

            <label className="dt-cookie-pref-row dt-cookie-pref-toggle">
              <div>
                <strong>{ar ? "التحليلات والأداء" : "Analytics & Performance"}</strong>
                <span>
                  {ar
                    ? "إحصائيات زيارة الصفحات مجهولة الهوية لتحسين تجربة الموقع."
                    : "Anonymous page-view analytics to improve site experience."}
                </span>
              </div>
              <input
                type="checkbox"
                checked={analyticsEnabled}
                onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                aria-label={ar ? "تفعيل ملفات التحليلات" : "Enable analytics cookies"}
              />
            </label>
          </div>
        ) : null}

        <div className="dt-cookie-actions">
          <button
            type="button"
            className="dt-cookie-btn-primary"
            onClick={showCustomize ? handleSaveCustom : handleAcceptAll}
          >
            <Check size={14} aria-hidden="true" />
            <span>
              {showCustomize
                ? ar
                  ? "حفظ التفضيلات"
                  : "Save Preferences"
                : ar
                ? "قبول الكل"
                : "Accept Cookies"}
            </span>
          </button>

          <button
            type="button"
            className="dt-cookie-btn-secondary"
            onClick={handleEssentialOnly}
          >
            {ar ? "الضرورية فقط" : "Essential Only"}
          </button>

          {!showCustomize ? (
            <button
              type="button"
              className="dt-cookie-btn-link"
              onClick={() => setShowCustomize(true)}
            >
              <SlidersHorizontal size={13} aria-hidden="true" />
              <span>{ar ? "تخصيص" : "Customize"}</span>
            </button>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
