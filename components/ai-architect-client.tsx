"use client";
import { FormEvent, useState } from "react";
import { ArrowUpRight, LoaderCircle, Sparkles } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import type { TechnicalBrief } from "@/lib/ai";

const categories = [
  ["Custom machine learning", "تعلم آلي مخصص"], ["Computer vision", "الرؤية الحاسوبية"],
  ["LLM & RAG systems", "أنظمة النماذج اللغوية والاسترجاع"], ["AI agents", "وكلاء الذكاء الاصطناعي"],
  ["AI infrastructure", "بنية الذكاء الاصطناعي"], ["Enterprise systems", "أنظمة المؤسسات الذكية"],
  ["Backend & distributed systems", "الأنظمة الخلفية والموزعة"],
] as const;

export function AiArchitectClient() {
  const ar = useLanguage() === "ar";
  const t = ar ? {
    kicker: "ذكاء ديف تك / 01", title: "ارسم النظام", accent: "قبل أن تبنيه.",
    intro: "حوّل فكرتك التقنية الأولية إلى موجز هندسي قابل للمراجعة. هذا تحليل مبدئي وليس عرض سعر أو ضماناً أو قراراً آلياً.",
    structured: "مخرجات منظمة", review: "المراجعة البشرية مطلوبة", bilingual: "العربية / English",
    category: "فئة النظام", problem: "ما المشكلة التي تحاول حلها؟",
    placeholder: "صف المستخدمين وسير العمل والبيانات والقيود وما الذي يجب أن يتحقق ليكون النظام مفيداً.",
    generate: "أنشئ الموجز التقني", analysing: "جارٍ التحليل…",
    privacy: "لا تُدخل كلمات مرور أو أسراراً أو بيانات شخصية حساسة. تُستخدم مدخلاتك فقط لإنشاء هذا الموجز.",
    unavailable: "تعذر إنشاء الموجز.", preliminary: "موجز هندسي مبدئي", reset: "ابدأ من جديد",
    objectives: "الأهداف المؤكدة", architecture: "البنية المقترحة", risks: "المخاطر الهندسية",
    questions: "أسئلة مفتوحة", assumptions: "الافتراضات", phases: "مراحل التنفيذ",
    investigate: "يحتاج إلى بحث ومراجعة مع فريقك.", send: "أرسل هذا الموجز إلى ديف تك",
    name: "الاسم", email: "بريد العمل", company: "الشركة (اختياري)",
    consent: "أوافق على حفظ ديف تك لهذا الموجز للرد على استفساري.", submit: "إرسال الموجز التقني",
    success: "تم استلام موجزك التقني ويمكن لمهندس من ديف تك مراجعته الآن.", submitError: "تعذر إرسال الموجز.",
  } : {
    kicker: "DEVTECH INTELLIGENCE / 01", title: "Map the system", accent: "before you build it.",
    intro: "Turn an early technical idea into a reviewable engineering brief. This is a preliminary analysis—not a quote, guarantee, or automated decision.",
    structured: "Structured output", review: "Human review required", bilingual: "English / العربية",
    category: "System category", problem: "What are you trying to solve?",
    placeholder: "Describe the users, workflow, data, constraints, and what must be true for this to be useful.",
    generate: "Generate technical brief", analysing: "Analysing…",
    privacy: "Do not include passwords, secrets, or regulated personal data. Your input is used only to create this requested brief.",
    unavailable: "Unable to create a brief.", preliminary: "PRELIMINARY ENGINEERING BRIEF", reset: "Start over",
    objectives: "Confirmed objectives", architecture: "Recommended architecture", risks: "Engineering risks",
    questions: "Open questions", assumptions: "Assumptions", phases: "Implementation phases",
    investigate: "To be investigated with your team.", send: "Send this brief to DevTech AI",
    name: "Your name", email: "Work email", company: "Company (optional)",
    consent: "I consent to DevTech AI storing this brief to respond to my enquiry.", submit: "Submit technical brief",
    success: "Your technical brief has been received. A DevTech AI engineer can now review it.", submitError: "Unable to submit your brief.",
  };
  const [category, setCategory] = useState<string>(categories[0][0]);
  const [description, setDescription] = useState(""); const [brief, setBrief] = useState<TechnicalBrief | null>(null);
  const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [sent, setSent] = useState(false);

  async function generate(event: FormEvent) { event.preventDefault(); setLoading(true); setError(""); setBrief(null); setSent(false); try { const response = await fetch("/api/ai/architect/generate-brief", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({category, description, language: ar ? "ar" : "en"})}); const result = await response.json(); if (!response.ok) throw new Error(result.error); setBrief(result.brief); } catch (cause) { setError(cause instanceof Error ? cause.message : t.unavailable); } finally { setLoading(false); } }
  async function submitLead(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!brief) return; const form = new FormData(event.currentTarget); const response = await fetch("/api/ai/architect/submit-lead", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({name: form.get("name"), email: form.get("email"), company: form.get("company"), category, brief, consent: form.get("consent") === "on"})}); if (response.ok) setSent(true); else { const result = await response.json(); setError(result.error || t.submitError); } }

  return <div className="architect-shell" dir={ar ? "rtl" : "ltr"}><section className="architect-intro"><div className="architect-kicker"><Sparkles size={14}/>{t.kicker}</div><h1>{t.title}<br/><em>{t.accent}</em></h1><p>{t.intro}</p><div className="architect-notes"><span>{t.structured}</span><span>{t.review}</span><span>{t.bilingual}</span></div></section><section className="architect-workspace"><form onSubmit={generate} className="architect-form"><label>{t.category}<select value={category} onChange={(e) => setCategory(e.target.value)}>{categories.map(([value, arabic]) => <option value={value} key={value}>{ar ? arabic : value}</option>)}</select></label><label>{t.problem}<textarea required minLength={25} maxLength={8000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t.placeholder}/></label><button className="architect-button" disabled={loading}>{loading ? <><LoaderCircle className="spin" size={16}/>{t.analysing}</> : <>{t.generate}<ArrowUpRight size={16}/></>}</button><p className="architect-privacy">{t.privacy}</p>{error && <p className="form-error">{error}</p>}</form>{brief && <div className="brief-card"><div className="brief-head"><div><span>{t.preliminary}</span><h2>{brief.projectTitle}</h2></div><button onClick={() => setBrief(null)} className="brief-reset">{t.reset}</button></div><p>{brief.problemStatement}</p><div className="brief-grid"><BriefList title={t.objectives} values={brief.objectives} empty={t.investigate}/><BriefList title={t.architecture} values={brief.proposedArchitecture} empty={t.investigate}/><BriefList title={t.risks} values={brief.engineeringRisks} empty={t.investigate}/><BriefList title={t.questions} values={brief.openQuestions} empty={t.investigate}/><BriefList title={t.assumptions} values={brief.assumptions} empty={t.investigate}/><BriefList title={t.phases} values={brief.implementationPhases} empty={t.investigate}/></div>{sent ? <p className="architect-success">{t.success}</p> : <form onSubmit={submitLead} className="lead-form"><strong>{t.send}</strong><input required name="name" placeholder={t.name}/><input required name="email" type="email" placeholder={t.email}/><input name="company" placeholder={t.company}/><label className="architect-consent"><input required name="consent" type="checkbox"/>{t.consent}</label><button className="architect-button">{t.submit}<ArrowUpRight size={16}/></button></form>}</div>}</section></div>;
}
function BriefList({title, values, empty}: {title: string; values: string[]; empty: string}) { return <section><h3>{title}</h3>{values.length ? <ul>{values.map((value, index) => <li key={`${title}-${index}`}>{value}</li>)}</ul> : <p>{empty}</p>}</section>; }
