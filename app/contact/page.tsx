"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, Asterisk, Plus } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

const categories = ["AI model engineering", "Computer vision", "LLM / RAG systems", "AI infrastructure & MLOps", "Intelligent backend architecture", "Research & prototyping", "Other technical challenge"];
const arabicCategories = ["هندسة نماذج الذكاء الاصطناعي", "الرؤية الحاسوبية", "النماذج اللغوية والاسترجاع", "البنية التحتية وعمليات التعلم الآلي", "معمارية الأنظمة الخلفية", "البحث والنماذج الأولية", "تحدٍ تقني آخر"];

export default function ContactPage() {
  const ar = useLanguage() === "ar";
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState(categories[0]);
  useEffect(() => { const value = new URLSearchParams(window.location.search).get("category"); if (value && categories.includes(value)) setCategory(value); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setStatus("loading"); setMessage("");
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    try {
      const response = await fetch("/api/contact", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(data)});
      const body = await response.json() as {error?: string};
      if (!response.ok) throw new Error(ar ? (response.status === 503 ? "إرسال الرسائل غير مهيأ حالياً. يرجى مراسلتنا على hello@devtech.ai." : response.status === 400 ? "يرجى التحقق من الاسم والبريد الإلكتروني ووصف المشروع." : "تعذر إرسال رسالتك. يرجى مراسلتنا على hello@devtech.ai.") : body.error || "Your enquiry could not be sent.");
      setStatus("success"); setMessage(ar ? "شكراً لك. تم إرسال استفسارك إلى فريق ديف تك إيه آي." : "Thank you. Your technical enquiry has been sent to the DevTech AI team."); form.reset(); setCategory(categories[0]);
    } catch (error) { setStatus("error"); setMessage(error instanceof Error && !(error instanceof TypeError) ? error.message : (ar ? "تعذر إرسال رسالتك. يرجى مراسلتنا على hello@devtech.ai." : "Your enquiry could not be sent. Please email hello@devtech.ai.")); }
  }

  return <main className="startup-contact"><section className="contact-studio"><div className="container contact-studio-grid">
    <div className="contact-studio-intro"><div className="contact-intro-top"><span className="studio-eyebrow"><i/> {ar ? "لنبدأ الحديث" : "OPEN A CONVERSATION"}</span><span>DEVTECH / CONTACT</span></div><h1>{ar ? <>لديك<br/><span>فكرة كبيرة؟</span><br/>لنجعلها<br/>أكثر ذكاءً<span className="contact-period">.</span></> : <>Have a<br/><span>big idea?</span><br/>Let&apos;s make<br/>it intelligent<span className="contact-period">.</span></>}</h1><p>{ar ? "شاركنا التحدي الذي يشغلك. سنساعدك في بناء الذكاء والبنية التحتية والهندسة اللازمة لتحويله إلى واقع." : "Bring us the interesting problem. We'll help you find the intelligence, infrastructure, and engineering to make it real."}</p><a className="contact-email" dir="ltr" href="mailto:hello@devtech.ai">hello@devtech.ai <ArrowUpRight size={17}/></a><div className="contact-orbit" aria-hidden="true"><span/><span/><span/><Asterisk/></div><div className="contact-intro-bottom"><span>{ar ? <>هندسة الذكاء الاصطناعي<br/>لما هو قادم</> : <>AI ENGINEERING<br/>FOR WHAT COMES NEXT</>}</span><span>{ar ? "01 — ابدأ من هنا ↗" : "01 — START HERE ↗"}</span></div></div>
    <form className="contact-studio-form" onSubmit={submit}><div className="contact-form-head"><div><span className="studio-eyebrow">{ar ? "بداية جيدة" : "A GOOD PLACE TO START"}</span><h2>{ar ? <>أخبرنا قليلاً<br/>عن <em>التحدي.</em></> : <>Tell us a little<br/>about the <em>challenge.</em></>}</h2></div><div className="form-spark" aria-hidden="true"><Plus size={28}/></div></div>
      <fieldset className="project-types"><legend><span>01</span> {ar ? "ما الذي تستكشفه؟" : "What are you exploring?"}</legend><div className="project-options">{categories.map((item, index) => <label key={item} className={category === item ? "selected" : ""}><input type="radio" name="category" value={item} checked={category === item} onChange={() => setCategory(item)}/><span>{ar ? arabicCategories[index] : item}</span><Plus size={14}/></label>)}</div></fieldset>
      <div className="contact-fields"><div className="contact-field-title"><span>02</span> {ar ? "معلومات عنك" : "A little about you"} <small>{ar ? "* مطلوب" : "* required"}</small></div><div className="contact-input-grid"><div className="field"><label htmlFor="name">{ar ? "الاسم *" : "Your name *"}</label><input id="name" name="name" required autoComplete="name" placeholder={ar ? "كيف نناديك؟" : "How should we call you?"}/></div><div className="field"><label htmlFor="email">{ar ? "البريد الإلكتروني للعمل *" : "Work email *"}</label><input id="email" name="email" type="email" required autoComplete="email" placeholder="you@company.com" dir="auto"/></div><div className="field"><label htmlFor="company">{ar ? "الشركة" : "Company"}</label><input id="company" name="company" autoComplete="organization" placeholder={ar ? "أين تعمل؟" : "Where you work"}/></div><div className="field"><label htmlFor="budget">{ar ? "نطاق الميزانية " : "Budget range "}<span>{ar ? "(اختياري)" : "(optional)"}</span></label><select id="budget" name="budget"><option value="">{ar ? "اختر نطاقاً" : "Choose a range"}</option><option value="Under $25k">{ar ? "أقل من 25 ألف دولار" : "Under $25k"}</option><option value="$25k–$75k">$25k–$75k</option><option value="$75k–$150k">$75k–$150k</option><option value="$150k+">$150k+</option><option value="Prefer to discuss">{ar ? "أفضل مناقشتها" : "Prefer to discuss"}</option></select></div></div><div className="field"><label htmlFor="overview">{ar ? "ما الذي تفكر فيه؟ *" : "What are you thinking about? *"}</label><textarea id="overview" name="overview" required minLength={20} placeholder={ar ? "فكرة أولية أو تحدٍ معقد أو شيء بينهما. أخبرنا عما تعمل عليه." : "A rough idea, a complex challenge, or something in between. Tell us what you're working on."}/></div><div className="field honeypot" aria-hidden="true"><label htmlFor="website">Website</label><input id="website" name="website" tabIndex={-1} autoComplete="off"/></div></div>
      <div className="contact-submit"><button type="submit" disabled={status === "loading"}>{status === "loading" ? (ar ? "جارٍ إرسال رسالتك…" : "Sending your enquiry…") : (ar ? "لنبدأ البناء" : "Let’s build something")}<span><ArrowRight size={20}/></span></button><p>{ar ? "تفضل البريد الإلكتروني؟ " : "Prefer email? "}<a href="mailto:hello@devtech.ai">{ar ? "تواصل معنا مباشرة ↗" : "Get in touch directly ↗"}</a></p></div><p className={`form-status ${status}`} role="status" aria-live="polite">{message}</p>
    </form></div></section></main>;
}
