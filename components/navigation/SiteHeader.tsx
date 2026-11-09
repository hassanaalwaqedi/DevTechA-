"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LanguageSwitch, useLanguage } from "@/components/language-provider";
import { GradientButton } from "@/components/ui/GradientButton";

const navItems = [
  { en: "Technology", ar: "التقنية", href: "/technology", aliases: ["/expertise"] },
  { en: "Products", ar: "المنتجات", href: "/products", aliases: ["/work"] },
  { en: "Applications", ar: "التطبيقات", href: "/applications", aliases: ["/solutions"] },
  { en: "Engineering", ar: "الهندسة", href: "/engineering", aliases: [] },
  { en: "About", ar: "الشركة", href: "/about", aliases: [] },
  { en: "Careers", ar: "الوظائف", href: "/careers", aliases: [] },
  { en: "Contact", ar: "تواصل معنا", href: "/contact", aliases: [] },
] as const;

export function DevTechLogoMark() {
  return (
    <span className="dt-brand-mark" aria-hidden="true">
      <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="dt-logo-bg" x1="2" y1="2" x2="34" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0754FF" />
            <stop offset="52%" stopColor="#3566FF" />
            <stop offset="100%" stopColor="#873BFF" />
          </linearGradient>
          <linearGradient id="dt-logo-shine" x1="6" y1="4" x2="28" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#D8E7FF" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="dt-logo-cyan" x1="8" y1="16" x2="20" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#5CE1FF" />
            <stop offset="100%" stopColor="#FFFFFF" />
          </linearGradient>
        </defs>
        <rect x="1.5" y="1.5" width="33" height="33" rx="9.5" fill="url(#dt-logo-bg)" />
        <rect
          x="1.5"
          y="1.5"
          width="33"
          height="33"
          rx="9.5"
          stroke="rgba(255,255,255,0.34)"
          strokeWidth="1"
        />
        {/* Geometric D loop matching DevTech AI mark */}
        <path
          d="M10.2 9.5H19.4C24.48 9.5 28.2 13.15 28.2 18C28.2 22.85 24.48 26.5 19.4 26.5H17.6L15.7 23.1H19.2C22.35 23.1 24.6 20.95 24.6 18C24.6 15.05 22.35 12.9 19.2 12.9H12.2L10.2 9.5Z"
          fill="url(#dt-logo-shine)"
        />
        {/* Angled geometric inner stem */}
        <path
          d="M9.8 16.1H13.6L19.1 26.5H15.3L9.8 16.1Z"
          fill="url(#dt-logo-cyan)"
        />
        <circle cx="19.2" cy="18" r="2.1" fill="#58D5FF" />
      </svg>
    </span>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const ar = useLanguage() === "ar";

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  return (
    <header className="site-header dt-header">
      <div className="container dt-nav">
        <Link
          href="/"
          className="dt-brand"
          dir="ltr"
          onClick={() => setOpen(false)}
          aria-label={ar ? "ديف تك إيه آي - الرئيسية" : "DevTech AI home"}
        >
          <DevTechLogoMark />
          <span className="dt-brand-text">
            DevTech <em>AI</em>
          </span>
        </Link>

        <nav
          id="primary-navigation"
          className={`dt-nav-links nav-links${open ? " open" : ""}`}
          aria-label={ar ? "القائمة الرئيسية" : "Primary navigation"}
        >
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`) ||
              item.aliases.some((alias) => pathname === alias || pathname.startsWith(`${alias}/`));
            return (
              <Link
                href={item.href}
                key={item.href}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {ar ? item.ar : item.en}
              </Link>
            );
          })}
          <div className="dt-nav-mobile-actions">
            <GradientButton
              href="/products"
              variant="primary"
              className="dt-nav-mobile-cta"
              onClick={() => setOpen(false)}
            >
              {ar ? "استكشف منتجات الرؤية" : "Explore Vision Products"}
            </GradientButton>
          </div>
        </nav>

        <div className="dt-nav-actions">
          <LanguageSwitch />
          <GradientButton href="/products" variant="nav" className="nav-cta dt-nav-cta">
            {ar ? "منتجات الرؤية" : "Vision Products"}
          </GradientButton>
          <button
            className="menu-button dt-menu-button"
            type="button"
            aria-controls="primary-navigation"
            aria-expanded={open}
            aria-label={
              ar
                ? open
                  ? "إغلاق القائمة"
                  : "فتح القائمة"
                : open
                ? "Close navigation"
                : "Open navigation"
            }
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>
    </header>
  );
}

