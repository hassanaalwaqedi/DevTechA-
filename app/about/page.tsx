import type { Metadata } from "next";
import Link from "next/link";
import { CompanyPageIntro } from "@/components/company-page-intro";
import { ArrowUpRight, BrainCircuit, Eye, Layers3, MoveUpRight } from "lucide-react";
import { getLocale } from "@/lib/locale";
import "./about.css";

export const metadata: Metadata = {title: "About", description: "Meet DevTech AI: an AI engineering company building intelligent systems from model to production."};


export default async function AboutPage() {
  const ar = await getLocale() === "ar";
  const capabilities = ar ? [
    ["01", "الذكاء الاصطناعي", "نماذج مخصصة وأنظمة لغوية وذكاء تطبيقي مصمم حول المشكلة.", "/expertise", BrainCircuit],
    ["02", "الرؤية الحاسوبية", "تحويل الصور والفيديو إلى إشارات مفيدة من خلال الكشف والتتبع والتحليل.", "/expertise#vision", Eye],
    ["03", "الأنظمة والبنية التحتية", "هندسة البيانات وخدمات النماذج والأنظمة الخلفية لتشغيل موثوق.", "/engineering", Layers3],
  ] as const : [
    ["01", "Artificial intelligence", "Custom models, language systems, and applied intelligence built around the problem.", "/expertise", BrainCircuit],
    ["02", "Computer vision", "Turn images and video into useful signals through detection, tracking, and analysis.", "/expertise#vision", Eye],
    ["03", "Systems & infrastructure", "Data, model serving, and backend engineering for dependable operation.", "/engineering", Layers3],
  ] as const;

  return <main className="about-new">
    <CompanyPageIntro
      eyebrow={ar ? "DEVTECH AI / الشركة" : "DEVTECH AI / COMPANY"}
      title={ar ? "شركة متخصصة في هندسة الذكاء الاصطناعي." : "An AI engineering company."}
      description={ar ? "نجمع بين تطوير النماذج وهندسة البرمجيات والبنية التحتية لبناء أنظمة ذكاء اصطناعي تلبي متطلبات التشغيل الفعلي." : "DevTech AI brings model development, software engineering, and infrastructure together to build intelligent systems for real operating environments."}
      actionLabel={ar ? "منهجنا الهندسي" : "Our engineering practice"}
      actionHref="/engineering"
      secondaryLabel={ar ? "استكشف أعمالنا" : "Explore our work"}
      secondaryHref="/work"
      detailsTitle={ar ? "مجالات عملنا" : "OUR FOCUS"}
      details={ar ? ["تطوير نماذج الذكاء الاصطناعي","معمارية البرمجيات وتطويرها","خدمات الاستدلال والبنية التحتية"] : ["AI model development","Software architecture & development","Inference services & infrastructure"]}
    />
    <section className="about-vision-new" id="our-vision"><div className="container about-vision-grid"><div className="about-vision-label"><span className="about-kicker">{ar ? "01 / رؤيتنا" : "01 / OUR VISION"}</span><span className="about-vision-star" aria-hidden="true">✳</span></div><div><h2>{ar ? <>نجعل الذكاء <span>مفيداً</span> في العالم الحقيقي.</> : <>Make intelligence <span>useful</span> in the real world.</>}</h2><p>{ar ? "رؤيتنا هي بناء أنظمة ذكية تجمع بين البحث والهندسة وفهم الناس؛ أنظمة يمكن الوثوق بها وتطويرها والاستفادة منها خارج حدود التجارب." : "Our vision is to build intelligent systems that bring research, engineering, and people together—systems made to be understood, improved, and useful beyond the lab."}</p><Link href="/engineering" className="about-text-link">{ar ? "اكتشف كيف نعمل" : "Discover how we work"} <ArrowUpRight size={16}/></Link></div></div></section>
    <section className="about-capabilities-new"><div className="container"><div className="about-capabilities-head"><div><span className="about-kicker">{ar ? "02 / ما نعمل عليه" : "02 / WHAT WE WORK ON"}</span><h2>{ar ? <>أفكار كبيرة.<br/><span>أنظمة مدروسة.</span></> : <>Big ideas.<br/><span>Thoughtful systems.</span></>}</h2></div><p>{ar ? "من أول تجربة إلى النظام المتكامل، نربط كل جزء بما يحتاجه الواقع." : "From the first experiment to the complete system, we connect every part to what the real world needs."}</p></div><div className="about-capability-grid">{capabilities.map(([number, title, description, href, Icon]) => <Link key={number} href={href} className="about-capability"><div className="about-capability-top"><span>{number} / DEVTECH AI</span><Icon size={20}/></div><div><h3>{title}</h3><p>{description}</p></div><span className="about-capability-arrow"><MoveUpRight size={18}/></span></Link>)}</div></div></section>
    <section className="about-belief-new"><div className="container"><div><span className="about-kicker">{ar ? "03 / ما نؤمن به" : "03 / WHAT WE BELIEVE"}</span><h2>{ar ? <>لا نكتفي بدمج الذكاء الاصطناعي.<br/><span>بل نهندسه.</span></> : <>We don&apos;t just integrate AI.<br/><span>We engineer it.</span></>}</h2><p>{ar ? "نجمع بين التعلم الآلي ومعمارية البرمجيات والبنية التحتية لبناء ذكاء يعمل ويتطور." : "We bring machine learning, software architecture, and infrastructure together to build intelligence that works and evolves."}</p></div><Link href="/contact" className="about-primary-link">{ar ? "لنبدأ الحديث" : "Start a conversation"}<span><ArrowUpRight size={17}/></span></Link></div></section>
  </main>;
}
