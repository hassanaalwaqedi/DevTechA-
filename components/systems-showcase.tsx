"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

const systems = [
  { number: "01", name: "Visual intelligence", title: "Turn visual signals into useful decisions.", description: "Detection, tracking, and video processing connected to event-driven systems designed for real-world environments.", inputs: ["VIDEO INPUT", "DETECT & TRACK", "EVENT SIGNAL"], type: "vision" },
  { number: "02", name: "Knowledge systems", title: "Bring the right context to every question.", description: "Retrieval and language models working together with relevant sources, evaluation, and clear boundaries around the answer.", inputs: ["KNOWLEDGE", "RETRIEVE", "REASON"], type: "knowledge" },
  { number: "03", name: "Intelligent agents", title: "Make complex workflows more capable.", description: "Purpose-built systems that combine models, tools, and human oversight to support multi-step work.", inputs: ["OBJECTIVE", "TOOLS & CONTEXT", "ACTION"], type: "agents" },
  { number: "04", name: "Inference infrastructure", title: "Make intelligence ready to operate.", description: "Model serving, data services, observability, and deployment architecture designed around reliability and performance.", inputs: ["MODEL", "SERVE", "MONITOR"], type: "infra" },
] as const;
const arabicSystems = [
  { number: "01", name: "الذكاء البصري", title: "حوّل الإشارات البصرية إلى قرارات مفيدة.", description: "كشف وتتبع ومعالجة الفيديو ضمن أنظمة تعتمد على الأحداث ومصممة للبيئات الواقعية.", inputs: ["الفيديو", "الكشف والتتبع", "إشارة الحدث"], type: "vision" },
  { number: "02", name: "أنظمة المعرفة", title: "ضع السياق المناسب خلف كل سؤال.", description: "تعمل تقنيات الاسترجاع والنماذج اللغوية مع المصادر ذات الصلة والتقييم وحدود واضحة للإجابات.", inputs: ["المعرفة", "الاسترجاع", "الاستدلال"], type: "knowledge" },
  { number: "03", name: "الوكلاء الأذكياء", title: "اجعل سير العمل المعقد أكثر قدرة.", description: "أنظمة مصممة لدمج النماذج والأدوات والإشراف البشري في مهام متعددة الخطوات.", inputs: ["الهدف", "الأدوات والسياق", "الإجراء"], type: "agents" },
  { number: "04", name: "بنية تشغيل النماذج", title: "اجعل الذكاء جاهزاً للعمل.", description: "خدمة النماذج والبيانات والمراقبة وبنية النشر مع مراعاة الموثوقية والأداء.", inputs: ["النموذج", "التشغيل", "المراقبة"], type: "infra" },
] as const;

export function SystemsShowcase() {
  const [selected, setSelected] = useState(0);
  const ar = useLanguage() === "ar";
  const options = ar ? arabicSystems : systems;
  const current = options[selected];
  return <section className="systems-showcase" id="systems"><div className="container"><div className="systems-heading"><div><div className="art-label">{ar ? "03 / الأنظمة الذكية" : "03 / INTELLIGENT SYSTEMS"}</div><h2>{ar ? <>ما نبنيه،<br/><em>وكيف يفكّر.</em></> : <>What we build,<br/><em>and how it thinks.</em></>}</h2></div><p>{ar ? "استكشف الأنظمة التي نصممها: تبدأ بالتحدي وتتشكل وفق طريقة عملها في الواقع." : "Explore the systems we design. Each one starts with the problem and is shaped around the way it needs to operate."}</p></div><div className="systems-explorer"><div className="systems-options" role="group" aria-label={ar ? "استكشف أنواع أنظمة الذكاء الاصطناعي" : "Explore types of AI systems"}>{options.map((system, index) => <button type="button" key={system.number} aria-pressed={selected === index} onClick={() => setSelected(index)} className={selected === index ? "selected" : ""}><span>{system.number}</span><strong>{system.name}</strong><ArrowUpRight size={17}/></button>)}</div><div className="systems-detail" aria-live="polite"><div className="system-visual" key={current.type} aria-hidden="true"><div className={`system-graphic ${current.type}`}><div className="system-grid"/><span className="signal signal-one"/><span className="signal signal-two"/><span className="signal signal-three"/><div className="system-core"><span>DEVTECH AI</span><strong>{current.number}</strong><small>{ar ? "تصور للنظام" : `CONCEPT / ${current.type.toUpperCase()}`}</small></div></div><div className="system-flow">{current.inputs.map((item, index) => <span key={item}>{index > 0 && <i>{ar ? "←" : "→"}</i>}{item}</span>)}</div></div><div className="system-description"><div><span className="art-label">{ar ? "تصور للنظام" : "SYSTEM STUDY"} / {current.number}</span><h3>{current.title}</h3><p>{current.description}</p></div><Link href="/solutions" className="art-inline-link">{ar ? "استكشف الحلول" : "Explore solutions"} <ArrowUpRight size={15}/></Link></div></div></div></div></section>;
}
