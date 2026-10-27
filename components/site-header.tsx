"use client";

import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LanguageSwitch, useLanguage } from "@/components/language-provider";

const links = [["Expertise", "/expertise"], ["Solutions", "/solutions"], ["AI Architect", "/ai-architect"], ["Engineering", "/engineering"], ["Our work", "/work"], ["About", "/about"], ["Careers", "/careers"]];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const ar = useLanguage() === "ar";
  const labels = ar ? ["الخبرات", "الحلول", "معماري الذكاء", "الهندسة", "أعمالنا", "من نحن", "الوظائف"] : links.map(([label]) => label);
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);
  useEffect(() => { if (!open) return; const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [open]);
  return <header className="site-header"><div className="container nav">
    <Link href="/" className="brand" dir="ltr" onClick={() => setOpen(false)} aria-label={ar ? "ديف تك إيه آي - الرئيسية" : "DevTech AI home"}><span className="brand-mark"><i/><i/><i/></span><span>DEVTECH <em>AI</em></span></Link>
    <nav id="primary-navigation" className={`nav-links${open ? " open" : ""}`} aria-label={ar ? "القائمة الرئيسية" : "Primary navigation"}>{links.map(([, href], index) => <Link href={href} key={href} aria-current={pathname === href ? "page" : undefined} onClick={() => setOpen(false)}>{labels[index]}</Link>)}<Link className="nav-mobile-contact" href="/contact" onClick={() => setOpen(false)}>{ar ? "ناقش مشروعك" : "Discuss your project"} <ArrowUpRight size={15}/></Link></nav>
    <LanguageSwitch />
    <Link className="nav-cta" href="/contact">{ar ? "ناقش مشروعك" : "Discuss your project"} <ArrowUpRight size={14}/></Link>
    <button className="menu-button" aria-controls="primary-navigation" aria-expanded={open} aria-label={ar ? (open ? "إغلاق القائمة" : "فتح القائمة") : (open ? "Close navigation" : "Open navigation")} onClick={() => setOpen(!open)}>{open ? <X size={21}/> : <Menu size={21}/>}</button>
  </div></header>;
}
