"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LanguageSwitch, useLanguage } from "@/components/language-provider";
import { GradientButton } from "@/components/ui/GradientButton";

const navItems = [
  { en: "Technology", ar: "التقنية", href: "/technology", aliases: ["/expertise"] },
  { en: "AEGIS AI", ar: "AEGIS AI", href: "/products/aegis-ai", aliases: [] },
  { en: "Products", ar: "المنتجات", href: "/products", aliases: ["/work"] },
  { en: "Applications", ar: "التطبيقات", href: "/applications", aliases: ["/solutions"] },
  { en: "Engineering", ar: "الهندسة", href: "/engineering", aliases: [] },
  { en: "About", ar: "الشركة", href: "/about", aliases: [] },
  { en: "Careers", ar: "الوظائف", href: "/careers", aliases: [] },
  { en: "Contact", ar: "تواصل معنا", href: "/contact", aliases: [] },
] as const;

export function HirzexaLogoMark() {
  return (
    <span className="dt-brand-mark" aria-hidden="true">
      <Image src="/brand/hirzexa-mark.png" alt="" width={36} height={36} priority />
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
          aria-label={ar ? "HIRZEXA - الصفحة الرئيسية" : "HIRZEXA home"}
        >
          <HirzexaLogoMark />
          <span className="dt-brand-text">HIRZEXA</span>
        </Link>

        <nav
          id="primary-navigation"
          className={`dt-nav-links nav-links${open ? " open" : ""}`}
          aria-label={ar ? "القائمة الرئيسية" : "Primary navigation"}
        >
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/products" && pathname.startsWith(`${item.href}/`)) ||
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

