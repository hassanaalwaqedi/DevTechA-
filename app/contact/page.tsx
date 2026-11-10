"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, Plus } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { HumanAiVideoReel } from "@/components/ui/HumanAiVideoReel";
import { COMPANY_EMAILS, CONTACT_DIRECTORY, CONTACT_FORM_CATEGORIES, companyMailto } from "@/lib/company-emails";

export default function ContactPage() {
  const ar = useLanguage() === "ar";
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<string>(CONTACT_FORM_CATEGORIES[0].en);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("category");
    if (value && CONTACT_FORM_CATEGORIES.some((item) => item.en === value)) {
      setCategory(value);
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(
          ar
            ? response.status === 503
              ? "إرسال الرسائل غير مهيأ حالياً."
              : response.status === 429
              ? "طلبات كثيرة من هذه الشبكة. يرجى المحاولة لاحقاً."
              : response.status === 400
              ? "يرجى التحقق من الاسم والبريد الإلكتروني ووصف المشروع."
              : "تعذر إرسال رسالتك."
            : body.error || "Your enquiry could not be sent."
        );
      setStatus("success");
      setMessage(
        ar
          ? "شكراً لك. تم استلام استفسارك للمراجعة."
          : "Thank you. Your enquiry has been accepted for review."
      );
      form.reset();
      setCategory(CONTACT_FORM_CATEGORIES[0].en);
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error && !(error instanceof TypeError)
          ? error.message
          : ar
          ? "تعذر إرسال رسالتك."
          : "Your enquiry could not be sent."
      );
    }
  }

  return (
    <main className="startup-contact">
      <section className="contact-studio">
        <div className="container contact-studio-grid">
          <div className="contact-studio-intro">
            <div className="contact-intro-top">
              <span className="studio-eyebrow">
                <i /> {ar ? "تواصل مع مهندسينا" : "OPEN A CONVERSATION"}
              </span>
              <span>HIRZEXA / CONTACT</span>
            </div>
            <h1>
              {ar ? (
                <>
                  هل تطور
                  <br />
                  <span>نظام رؤية ذكي؟</span>
                  <br />
                  لنهندسه
                  <br />
                  معاً<span className="contact-period">.</span>
                </>
              ) : (
                <>
                  Building with
                  <br />
                  <span>intelligent vision?</span>
                  <br />
                  Let&apos;s engineer
                  <br />
                  it together<span className="contact-period">.</span>
                </>
              )}
            </h1>
            <p>
              {ar
                ? "شاركنا متطلباتك في الرؤية الحاسوبية، أو الاستدلال على الحافة (Edge AI)، أو نظام AEGIS AI، أو تكامل الكاميرات والأجهزة الذكية."
                : "Tell us about your computer vision use case, Edge AI deployment, AEGIS AI evaluation, or intelligent device partnership."}
            </p>
            <a className="contact-email" dir="ltr" href={companyMailto("general")} aria-label={`${ar ? "راسلنا على" : "Email"} ${COMPANY_EMAILS.general}`}>
              {COMPANY_EMAILS.general} <ArrowUpRight size={17} />
            </a>
            <div className="contact-video-showcase">
              <HumanAiVideoReel
                videoSrc="/videos/human-ai-contact.mp4"
                posterSrc="/human-ai-contact.jpg"
                badge={
                  ar
                    ? "10 ثوانٍ · تواصل مباشر مع فريقنا"
                    : "10S REEL · DIRECT HUMAN-AI CONNECTION"
                }
                title={
                  ar
                    ? "مهندسو الرؤية الحاسوبية وذكاء الحافة بانتظارك"
                    : "Connect With Our Computer Vision & Edge AI Team"
                }
                subtitle={
                  ar
                    ? "استشارات تقنية · عروض AEGIS AI · شراكات المنتجات"
                    : "Architecture reviews · AEGIS AI demos · Product partnerships"
                }
                telemetry="DIRECT EYE CONTACT"
                compact
              />
            </div>
            <div className="contact-intro-bottom">
              <span>
                {ar ? (
                  <>
                    الرؤية الحاسوبية · ذكاء الحافة
                    <br />
                    الأجهزة والبرمجيات الذكية
                  </>
                ) : (
                  <>
                    COMPUTER VISION · EDGE AI
                    <br />
                    INTELLIGENT PRODUCTS
                  </>
                )}
              </span>
              <span>{ar ? "01 — ابدأ من هنا ↗" : "01 — START HERE ↗"}</span>
            </div>
          </div>

          <form className="contact-studio-form" onSubmit={submit}>
            <div className="contact-form-head">
              <div>
                <span className="studio-eyebrow">
                  {ar ? "استفسار تقني أو شراكة" : "TECHNICAL & PRODUCT INQUIRY"}
                </span>
                <h2>
                  {ar ? (
                    <>
                      أخبرنا قليلاً
                      <br />
                      عن <em>مشروعك البصري.</em>
                    </>
                  ) : (
                    <>
                      Tell us about your
                      <br />
                      <em>vision challenge.</em>
                    </>
                  )}
                </h2>
              </div>
              <div className="form-spark" aria-hidden="true">
                <Plus size={28} />
              </div>
            </div>

            <fieldset className="project-types">
              <legend>
                <span>01</span>{" "}
                {ar ? "ما المجال الذي تستكشفه؟" : "What area are you exploring?"}
              </legend>
              <div className="project-options">
                {CONTACT_FORM_CATEGORIES.map((item) => (
                  <label key={item.en} className={category === item.en ? "selected" : ""}>
                    <input
                      type="radio"
                      name="category"
                      value={item.en}
                      checked={category === item.en}
                      onChange={() => setCategory(item.en)}
                    />
                    <span>{ar ? item.ar : item.en}</span>
                    <Plus size={14} />
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="contact-fields">
              <div className="contact-field-title">
                <span>02</span> {ar ? "معلومات عنك" : "A little about you"}{" "}
                <small>{ar ? "* مطلوب" : "* required"}</small>
              </div>
              <div className="contact-input-grid">
                <div className="field">
                  <label htmlFor="name">{ar ? "الاسم *" : "Your name *"}</label>
                  <input
                    id="name"
                    name="name"
                    required
                    autoComplete="name"
                    placeholder={ar ? "كيف نناديك؟" : "How should we call you?"}
                  />
                </div>
                <div className="field">
                  <label htmlFor="email">
                    {ar ? "البريد الإلكتروني للعمل *" : "Work email *"}
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@company.com"
                    dir="auto"
                  />
                </div>
                <div className="field">
                  <label htmlFor="company">{ar ? "الشركة" : "Company"}</label>
                  <input
                    id="company"
                    name="company"
                    autoComplete="organization"
                    placeholder={ar ? "أين تعمل؟" : "Where you work"}
                  />
                </div>
                <div className="field">
                  <label htmlFor="budget">
                    {ar ? "نطاق المشروع " : "Project scope "}
                    <span>{ar ? "(اختياري)" : "(optional)"}</span>
                  </label>
                  <select id="budget" name="budget">
                    <option value="">{ar ? "اختر نطاقاً" : "Choose a range"}</option>
                    <option value="Under $25k">{ar ? "أقل من 25 ألف دولار" : "Under $25k"}</option>
                    <option value="$25k–$75k">$25k–$75k</option>
                    <option value="$75k–$150k">$75k–$150k</option>
                    <option value="$150k+">$150k+</option>
                    <option value="Prefer to discuss">
                      {ar ? "أفضل مناقشتها" : "Prefer to discuss"}
                    </option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label htmlFor="overview">
                  {ar
                    ? "ما الذي تخطط لبنائه أو استكشافه؟ *"
                    : "What are you planning to build or explore? *"}
                </label>
                <textarea
                  id="overview"
                  name="overview"
                  required
                  minLength={20}
                  placeholder={
                    ar
                      ? "صف لنا بيئة الكاميرات، أو متطلبات ذكاء الحافة، أو حالة الاستخدام التي تعمل عليها."
                      : "Describe your camera environment, Edge AI requirements, or application scenario."
                  }
                />
              </div>
              <div className="field honeypot" aria-hidden="true">
                <label htmlFor="website">Website</label>
                <input id="website" name="website" tabIndex={-1} autoComplete="off" />
              </div>
            </div>

            <div className="contact-submit">
              <button type="submit" disabled={status === "loading"}>
                {status === "loading"
                  ? ar
                    ? "جارٍ إرسال رسالتك…"
                    : "Sending your enquiry…"
                  : ar
                  ? "أرسل الاستفسار التقني"
                  : "Send technical enquiry"}
                <span>
                  <ArrowRight size={20} />
                </span>
              </button>
              <p>
                {ar ? "تفضل البريد الإلكتروني؟ " : "Prefer email? "}
                <a href={companyMailto("general")} aria-label={`${ar ? "راسلنا على" : "Email"} ${COMPANY_EMAILS.general}`}>
                  {ar ? "تواصل معنا مباشرة ↗" : "Get in touch directly ↗"}
                </a>
              </p>
            </div>
            <p className={`form-status ${status}`} role="status" aria-live="polite">
              {message}{status === "error" ? <> <a href={companyMailto("general")}>{COMPANY_EMAILS.general}</a></> : null}
            </p>
          </form>
        </div>
      </section>

      <section className="contact-channels-section" aria-labelledby="contact-channels-heading">
        <div className="container">
          <div className="contact-channels-header">
            <span className="studio-eyebrow">{ar ? "دليل التواصل" : "CONTACT DIRECTORY"}</span>
            <h2 id="contact-channels-heading">{ar ? "تواصل مع القسم المناسب" : "Reach the right team"}</h2>
            <p>{ar ? "اختر عنوان البريد المناسب لموضوع رسالتك." : "Choose the right address for your enquiry."}</p>
          </div>
          <div className="contact-channels-grid">
            {CONTACT_DIRECTORY.map((channel) => (
              <div key={channel.id} className="contact-channel">
                <span>{ar ? channel.ar : channel.en}</span>
                <div className="contact-channel-addresses">
                  {channel.emails.map((key) => <a key={key} href={companyMailto(key)} aria-label={`${ar ? channel.ar : channel.en}: ${COMPANY_EMAILS[key]}`}>
                    <strong dir="ltr">{COMPANY_EMAILS[key]}</strong><ArrowUpRight size={17} aria-hidden="true" />
                  </a>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
