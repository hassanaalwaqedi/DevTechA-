import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { getPublishedJobsResult } from "@/lib/db";
import { getLocale } from "@/lib/locale";
import { CareersDirectory } from "@/components/careers-directory";

export const metadata: Metadata = {title: "Careers", description: "Explore open positions in AI engineering, software development, and intelligent systems at DevTech AI."};

export default async function CareersPage() {
  const [locale, listing] = await Promise.all([getLocale(), getPublishedJobsResult()]);
  const ar = locale === "ar";
  const principles = ar ? [
    ["01", "معايير هندسية واضحة", "نحدد المتطلبات ونقيّم النتائج ونتخذ القرارات بناءً على الأدلة."],
    ["02", "عمل عبر التخصصات", "نربط تطوير النماذج بهندسة البيانات والبرمجيات والبنية التحتية."],
    ["03", "تواصل مهني مباشر", "نؤمن بالتعاون المحترم وتوثيق القرارات ووضوح المسؤوليات."],
  ] : [
    ["01", "Engineering standards", "Define requirements, evaluate outcomes, and make technical decisions grounded in evidence."],
    ["02", "Connected disciplines", "Work across model development, data, software, and production infrastructure."],
    ["03", "Professional collaboration", "Clear communication, documented decisions, and respect for the people doing the work."],
  ];

  return <main className="company-careers">
    <section className="company-careers-hero"><div className="container"><span className="company-label">{ar ? "DEVTECH AI / الوظائف" : "DEVTECH AI / CAREERS"}</span><div className="company-careers-intro"><div><h1>{ar ? "ساهم في هندسة أنظمة الذكاء الاصطناعي." : "Engineer the systems behind AI."}</h1><p>{ar ? "استكشف فرص العمل في تطوير النماذج والبرمجيات والبنية التحتية. راجع المتطلبات ونمط العمل والتعويضات الخاصة بكل وظيفة." : "Explore opportunities in model development, software, and infrastructure. Review the requirements, working arrangements, and compensation for each role."}</p></div><Link href="#open-roles" className="company-button">{ar ? "عرض الوظائف" : "View open positions"}<ArrowDown size={16}/></Link></div></div></section>
    <section className="company-careers-openings" id="open-roles" aria-labelledby="open-roles-title"><div className="container"><div className="company-section-heading"><div><span className="company-label">{ar ? "فرص العمل الحالية" : "CURRENT OPPORTUNITIES"}</span><h2 id="open-roles-title">{ar ? "الوظائف المتاحة" : "Open positions"}</h2></div>{listing.available ? <span className="company-role-count">{listing.jobs.length} {ar ? "وظائف متاحة" : listing.jobs.length === 1 ? "position available" : "positions available"}</span> : null}</div><CareersDirectory initialJobs={listing.jobs} available={listing.available} arabic={ar}/></div></section>
    <section className="company-careers-principles"><div className="container"><div className="company-section-heading"><div><span className="company-label">{ar ? "بيئة العمل" : "OUR WORKING PRINCIPLES"}</span><h2>{ar ? "طريقة عملنا" : "How we work"}</h2></div><Link href="/engineering" className="company-text-link">{ar ? "منهجنا الهندسي" : "Our engineering practice"}<ArrowUpRight size={16}/></Link></div><div className="company-process">{principles.map(([number, title, description]) => <article key={number}><span className="company-label">{number}</span><h3>{title}</h3><p>{description}</p></article>)}</div></div></section>
    <section className="company-careers-contact"><div className="container"><div><h2>{ar ? "هل تبحث عن فرصة مختلفة؟" : "Looking for a different opportunity?"}</h2><p>{ar ? "تواصل معنا للاستفسار عن فرص العمل المستقبلية." : "Contact us about future opportunities relevant to your experience."}</p></div><a href="mailto:hello@devtech.ai?subject=Careers%20at%20DevTech%20AI" className="company-text-link">hello@devtech.ai<ArrowUpRight size={16}/></a></div></section>
  </main>;
}
