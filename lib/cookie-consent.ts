"use client";

export type CookieConsentPreferences = {
  version: 1;
  essential: true;
  analytics: boolean;
  updatedAt: string;
};

export const COOKIE_CONSENT_STORAGE_KEY = "hirzexa:cookie-consent:v1";
export const COOKIE_CONSENT_COOKIE_NAME = "hirzexa_cookie_consent";
export const COOKIE_CONSENT_EVENT = "hirzexa:consent-change";
export const OPEN_COOKIE_SETTINGS_EVENT = "hirzexa:open-cookie-settings";

export function readCookieConsent(): CookieConsentPreferences | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CookieConsentPreferences>;
      if (parsed && parsed.version === 1 && typeof parsed.analytics === "boolean") {
        return {
          version: 1,
          essential: true,
          analytics: parsed.analytics,
          updatedAt:
            typeof parsed.updatedAt === "string"
              ? parsed.updatedAt
              : new Date().toISOString(),
        };
      }
    }
  } catch {
    // Fallback to document.cookie below
  }

  try {
    const match = document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${COOKIE_CONSENT_COOKIE_NAME}=`));
    if (match) {
      const val = decodeURIComponent(match.split("=").slice(1).join("="));
      if (val === "all" || val === "essential") {
        return {
          version: 1,
          essential: true,
          analytics: val === "all",
          updatedAt: new Date().toISOString(),
        };
      }
    }
  } catch {
    // Ignore cookie read error
  }

  return null;
}

export function saveCookieConsent(analytics: boolean): CookieConsentPreferences {
  const prefs: CookieConsentPreferences = {
    version: 1,
    essential: true,
    analytics,
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(prefs));
      if (!analytics) {
        window.localStorage.removeItem("devtech:visitor-id:v1");
      }
    } catch {
      // Ignore storage quota / private mode errors
    }

    try {
      const maxAge = 60 * 60 * 24 * 180; // 180 days
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${COOKIE_CONSENT_COOKIE_NAME}=${
        analytics ? "all" : "essential"
      }; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
    } catch {
      // Ignore cookie write errors
    }

    window.dispatchEvent(
      new CustomEvent<CookieConsentPreferences>(COOKIE_CONSENT_EVENT, {
        detail: prefs,
      })
    );
  }

  return prefs;
}

export function openCookieSettings() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_COOKIE_SETTINGS_EVENT));
}
