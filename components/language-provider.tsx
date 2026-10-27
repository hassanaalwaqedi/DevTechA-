"use client";

import { createContext, useContext } from "react";
import type { Locale } from "@/lib/locale";

const LanguageContext = createContext<Locale>("en");

export function LanguageProvider({locale, children}: {locale: Locale; children: React.ReactNode}) {
  return <LanguageContext.Provider value={locale}>{children}</LanguageContext.Provider>;
}

export function useLanguage() { return useContext(LanguageContext); }

export function LanguageSwitch() {
  const locale = useLanguage();
  function changeLanguage() {
    document.cookie = `devtech_locale=${locale === "ar" ? "en" : "ar"}; Path=/; Max-Age=31536000; SameSite=Lax`;
    window.location.reload();
  }
  return <button className="language-switch" type="button" onClick={changeLanguage} aria-label={locale === "ar" ? "Switch language to English" : "التبديل إلى اللغة العربية"} lang={locale === "ar" ? "en" : "ar"}>{locale === "ar" ? "EN" : "العربية"}</button>;
}
