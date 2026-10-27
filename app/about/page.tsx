import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, BrainCircuit, Eye, Layers3, MoveUpRight } from "lucide-react";
import { getLocale } from "@/lib/locale";
import "./about.css";

export const metadata: Metadata = {title: "About", description: "Meet DevTech AI: an AI engineering company building intelligent systems from model to production."};

function AboutVisual({arabic}: {arabic: boolean}) {
  return <div className="about-visual" role="img" aria-label={arabic ? "تصور يربط البيانات بالنماذج والأنظمة الذكية" : "A conceptual illustration connecting data, models and intelligent systems"}>
    <div className="about-visual-top"><span>{arabic ? "تصوّر هندسي / 01" : "A SYSTEMS PERSPECTIVE / 01"}</span><span>DEVTECH AI ✳</span></div>
    <div className="about-visual-scene" aria-hidden="true"><div className="about-visual-grid"/><div className="about-orbit about-orbit-one"/><div className="about-orbit about-orbit-two"/><div className="about-orbit about-orbit-three"/><div className="about-center"><span>✳</span><small>DEVTECH AI</small></div><div className="about-node about-node-model"><BrainCircuit size={17}/><span>{arabic ? "نماذج ذكية" : "INTELLIGENT MODELS"}</span></div><div className="about-node about-node-data"><span className="about-node-dot"/><span>{arabic ? "البيانات والسياق" : "DATA & CONTEXT"}</span></div><div className="about-node about-node-system"><Layers3 size={17}/><span>{arabic ? "أنظمة واقعية" : "REAL-WORLD SYSTEMS"}</span></div><span className="about-spark about-spark-one">✳</span><span className="about-spark about-spark-two">+</span></div>
    <div className="about-visual-bottom"><span><i/> {arabic ? "من الفكرة إلى التنفيذ" : "FROM IDEA TO REALITY"}</span><span>{arabic ? "الذكاء / الهندسة / الأثر" : "INTELLIGENCE / ENGINEERING / IMPACT"}</span></div>
  </div>;
}

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
    <section className="about-hero-new"><div className="container"><div className="about-hero-head"><span className="about-kicker"><i/> {ar ? "من نحن / DEVTECH AI" : "ABOUT US / DEVTECH AI"}</span><span>{ar ? "الفضول يقودنا. والهندسة تجمعنا." : "CURIOUS BY NATURE. ENGINEERS BY DESIGN."}</span></div><div className="about-hero-layout"><div className="about-hero-copy"><div className="about-small-badge">✳ {ar ? "الذكاء، بلمسة إنسانية" : "INTELLIGENCE WITH INTENTION"}</div><h1>{ar ? <>نبدأ من <span>الفضول،</span><br/>ونبني بالهندسة<span className="about-heading-dot">.</span></> : <>Curious minds.<br/><span>Engineered</span><br/>intelligence<span className="about-heading-dot">.</span></>}</h1><p>{ar ? "نحن شركة متخصصة في هندسة الذكاء الاصطناعي. نحوّل الأفكار الطموحة إلى نماذج وأنظمة ومنتجات ذكية مصممة للعمل في العالم الحقيقي." : "We're an AI engineering company turning ambitious ideas into intelligent models, systems, and products designed for the real world."}</p><div className="about-hero-actions"><Link href="/work" className="about-primary-link">{ar ? "اكتشف أعمالنا" : "Explore our work"}<span><ArrowUpRight size={17}/></span></Link><Link href="#our-vision" className="about-secondary-link">{ar ? "تعرّف على رؤيتنا" : "Meet our vision"} <ArrowDownRight size={16}/></Link></div><div className="about-hero-foot"><span>{ar ? "ذكاء اصطناعي، بُني بعناية." : "THOUGHTFUL AI. SERIOUS ENGINEERING."}</span><span>{ar ? "اكتشف المزيد ↓" : "SCROLL TO EXPLORE ↓"}</span></div></div><AboutVisual arabic={ar}/></div></div></section>
    <section className="about-vision-new" id="our-vision"><div className="container about-vision-grid"><div className="about-vision-label"><span className="about-kicker">{ar ? "01 / رؤيتنا" : "01 / OUR VISION"}</span><span className="about-vision-star" aria-hidden="true">✳</span></div><div><h2>{ar ? <>نجعل الذكاء <span>مفيداً</span> في العالم الحقيقي.</> : <>Make intelligence <span>useful</span> in the real world.</>}</h2><p>{ar ? "رؤيتنا هي بناء أنظمة ذكية تجمع بين البحث والهندسة وفهم الناس؛ أنظمة يمكن الوثوق بها وتطويرها والاستفادة منها خارج حدود التجارب." : "Our vision is to build intelligent systems that bring research, engineering, and people together—systems made to be understood, improved, and useful beyond the lab."}</p><Link href="/engineering" className="about-text-link">{ar ? "اكتشف كيف نعمل" : "Discover how we work"} <ArrowUpRight size={16}/></Link></div></div></section>
    <section className="about-capabilities-new"><div className="container"><div className="about-capabilities-head"><div><span className="about-kicker">{ar ? "02 / ما نعمل عليه" : "02 / WHAT WE WORK ON"}</span><h2>{ar ? <>أفكار كبيرة.<br/><span>أنظمة مدروسة.</span></> : <>Big ideas.<br/><span>Thoughtful systems.</span></>}</h2></div><p>{ar ? "من أول تجربة إلى النظام المتكامل، نربط كل جزء بما يحتاجه الواقع." : "From the first experiment to the complete system, we connect every part to what the real world needs."}</p></div><div className="about-capability-grid">{capabilities.map(([number, title, description, href, Icon]) => <Link key={number} href={href} className="about-capability"><div className="about-capability-top"><span>{number} / DEVTECH AI</span><Icon size={20}/></div><div><h3>{title}</h3><p>{description}</p></div><span className="about-capability-arrow"><MoveUpRight size={18}/></span></Link>)}</div></div></section>
    <section className="about-belief-new"><div className="container"><div><span className="about-kicker">{ar ? "03 / ما نؤمن به" : "03 / WHAT WE BELIEVE"}</span><h2>{ar ? <>لا نكتفي بدمج الذكاء الاصطناعي.<br/><span>بل نهندسه.</span></> : <>We don&apos;t just integrate AI.<br/><span>We engineer it.</span></>}</h2><p>{ar ? "نجمع بين التعلم الآلي ومعمارية البرمجيات والبنية التحتية لبناء ذكاء يعمل ويتطور." : "We bring machine learning, software architecture, and infrastructure together to build intelligence that works and evolves."}</p></div><Link href="/contact" className="about-primary-link">{ar ? "لنبدأ الحديث" : "Start a conversation"}<span><ArrowUpRight size={17}/></span></Link></div></section>
  </main>;
}
