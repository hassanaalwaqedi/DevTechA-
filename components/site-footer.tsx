import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Locale } from "@/lib/locale";

export function SiteFooter({locale}: {locale: Locale}) {
  const ar = locale === "ar";
  return <footer className="site-footer"><div className="container">
    <div className="footer-callout"><div><div className="section-kicker">{ar ? "لنبدأ الحديث" : "A technical conversation"}</div><h2>{ar ? "لنصنع ما هو قادم." : "Let's engineer what's next."}</h2></div><Link className="button button-primary" href="/contact">{ar ? "ناقش مشروعك" : "Discuss your project"} <ArrowUpRight size={16}/></Link></div>
    <div className="footer-grid"><div><Link href="/" className="brand" dir="ltr"><span className="brand-mark"><i/><i/><i/></span><span>DEVTECH <em>AI</em></span></Link><p>{ar ? "هندسة الذكاء الاصطناعي وتطوير أنظمة ذكية للتحديات الواقعية المعقدة." : "AI engineering and intelligent systems development for complex real-world environments."}</p></div><div className="footer-links"><Link href="/expertise">{ar ? "الخبرات" : "Expertise"}</Link><Link href="/solutions">{ar ? "الحلول" : "Solutions"}</Link><Link href="/engineering">{ar ? "الهندسة" : "Engineering"}</Link><Link href="/work">{ar ? "أعمالنا" : "Our work"}</Link><Link href="/about">{ar ? "من نحن" : "About"}</Link><Link href="/careers">{ar ? "الوظائف" : "Careers"}</Link><Link href="/contact">{ar ? "تواصل معنا" : "Contact"}</Link></div><div className="footer-contact"><span>{ar ? "تواصل مباشر" : "Direct"}</span><a dir="ltr" href="mailto:hello@devtech.ai">hello@devtech.ai</a><a href="https://www.linkedin.com/company/144674058" target="_blank" rel="noreferrer">LinkedIn <ArrowUpRight size={13}/></a></div></div>
    <div className="footer-bottom"><span dir="ltr">© {new Date().getFullYear()} DevTech AI</span><span>{ar ? "نهندس الذكاء بدقة." : "Engineering intelligence with precision."}</span></div>
  </div></footer>;
}
