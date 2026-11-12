"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, Plus } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { HumanAiVideoReel } from "@/components/ui/HumanAiVideoReel";
import {
  COMPANY_EMAILS,
  CONTACT_DIRECTORY,
  CONTACT_FORM_CATEGORIES,
  DEPARTMENT_METADATA,
  companyMailto,
  recipientForContactCategory,
  type CompanyEmailChannel,
} from "@/lib/company-emails";

const DIRECTORY_LINKS: Partial<Record<string, string>> = {
  business: "/products",
  support: "/engineering",
  partnerships: "/partnerships",
  investors: "/investors",
  careers: "/careers",
  orders: "/billing#orders",
  finance: "/billing",
  privacy: "/privacy",
  legal: "/legal",
};

export default function ContactPage() {
  const locale = useLanguage();
  const ar = locale === "ar";
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [errorFallbackEmail, setErrorFallbackEmail] = useState<string>(COMPANY_EMAILS.general);
  const [category, setCategory] = useState<string>(CONTACT_FORM_CATEGORIES[0].en);

  const selectedChannel: CompanyEmailChannel = recipientForContactCategory(category) ?? "general";
  const selectedEmail = COMPANY_EMAILS[selectedChannel];
  const selectedDept = DEPARTMENT_METADATA[selectedChannel];

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("category");
    if (value && CONTACT_FORM_CATEGORIES.some((item) => item.en === value)) {
      setCategory(value);
    } else if (value && recipientForContactCategory(value)) {
      const matched = CONTACT_FORM_CATEGORIES.find(
        (item) => item.recipient === recipientForContactCategory(value)
      );
      if (matched) setCategory(matched.en);
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    const form = event.currentTarget;
    const rawData = Object.fromEntries(new FormData(form));
    const currentChannel = recipientForContactCategory(category) ?? "general";
    setErrorFallbackEmail(COMPANY_EMAILS[currentChannel]);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...rawData, locale }),
      });
      const body = (await response.json()) as {
        error?: string;
        fallbackEmail?: string;
        reference?: string;
        routedTo?: string;
      };
      if (body.fallbackEmail) setErrorFallbackEmail(body.fallbackEmail);

      if (!response.ok) {
        throw new Error(
          ar
            ? response.status === 503
              ? "إرسال الرسائل غير مهيأ حالياً. يرجى مراسلتنا مباشرة على:"
              : response.status === 429
              ? "طلبات كثيرة من هذه الشبكة. يرجى المحاولة لاحقاً أو مراسلتنا على:"
              : response.status === 400
              ? "يرجى التحقق من الاسم والبريد الإلكتروني ووصف المشروع (20 حرفاً على الأقل)."
              : "تعذر إرسال رسالتك. يرجى التواصل عبر:"
            : body.error || "Your enquiry could not be sent."
        );
      }

      const refText = body.reference ? ` (${body.reference})` : "";
      const targetText = body.routedTo || COMPANY_EMAILS[currentChannel];
      setStatus("success");
      setMessage(
        ar
          ? `شكراً لك. تم استلام رسالتك${refText} وتوجيهها إلى ${targetText}.`
          : `Thank you. Your enquiry${refText} has been received and routed to ${targetText}.`
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
                ? "شاركنا متطلباتك في الرؤية الحاسوبية، أو الاستدلال على الحافة (Edge AI)، أو نظام AEGIS AI، أو عروض المنتجات والشراكات."
                : "Tell us about your computer vision use case, Edge AI deployment, AEGIS AI evaluation, product demo, or strategic partnership."}
            </p>
            <a
              className="contact-email"
              dir="ltr"
              href={companyMailto("general")}
              aria-label={`${ar ? "راسلنا على" : "Email"} ${COMPANY_EMAILS.general}`}
            >
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
                  {ar ? "استفسار موجه حسب القسم" : "DEPARTMENT-ROUTED INQUIRY"}
                </span>
                <h2>
                  {ar ? (
                    <>
                      أخبرنا قليلاً
                      <br />
                      عن <em>موضوع تواصلك.</em>
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
                {ar ? "ما القسم أو المجال الذي تستكشفه؟" : "What area are you exploring?"}
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
              <p className="contact-route-hint" aria-live="polite">
                {ar ? (
                  <>
                    سيتم التوجيه إلى فريق <strong>{selectedDept.ar}</strong>:{" "}
                    <a dir="ltr" href={companyMailto(selectedChannel, category)}>
                      {selectedEmail}
                    </a>
                  </>
                ) : (
                  <>
                    Routed to <strong>{selectedDept.en}</strong>:{" "}
                    <a dir="ltr" href={companyMailto(selectedChannel, category)}>
                      {selectedEmail}
                    </a>
                  </>
                )}
              </p>
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
                    maxLength={100}
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
                    maxLength={254}
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
                    maxLength={120}
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
                    ? "تفاصيل رسالتك أو متطلباتك *"
                    : "What are you planning to build or explore? *"}
                </label>
                <textarea
                  id="overview"
                  name="overview"
                  required
                  minLength={20}
                  maxLength={3000}
                  placeholder={
                    ar
                      ? "صف لنا بيئة الكاميرات، أو متطلبات ذكاء الحافة، أو تفاصيل طلبك أو استفسارك."
                      : "Describe your camera environment, Edge AI requirements, demo goals, or enquiry details."
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
                  ? "أرسل الرسالة للقسم المختص"
                  : "Send departmental enquiry"}
                <span>
                  <ArrowRight size={20} />
                </span>
              </button>
              <p>
                {ar ? "تفضل البريد الإلكتروني؟ " : "Prefer direct email? "}
                <a
                  dir="ltr"
                  href={companyMailto(selectedChannel, category)}
                  aria-label={`${ar ? "راسلنا على" : "Email"} ${selectedEmail}`}
                >
                  {selectedEmail} ↗
                </a>
              </p>
            </div>
            <p className={`form-status ${status}`} role="status" aria-live="polite">
              {message}
              {status === "error" ? (
                <>
                  {" "}
                  <a dir="ltr" href={`mailto:${errorFallbackEmail}`}>
                    {errorFallbackEmail}
                  </a>
                </>
              ) : null}
            </p>
          </form>
        </div>
      </section>

      <section className="contact-channels-section" aria-labelledby="contact-channels-heading">
        <div className="container">
          <div className="contact-channels-header">
            <span className="studio-eyebrow">{ar ? "دليل التواصل الرسمي" : "CONTACT DIRECTORY"}</span>
            <h2 id="contact-channels-heading">
              {ar ? "تواصل مع القسم المناسب في HIRZEXA" : "Reach the right HIRZEXA team"}
            </h2>
            <p>
              {ar
                ? "اختر عنوان البريد الرسمي المناسب لموضوع رسالتك."
                : "Choose the verified HIRZEXA department address for your enquiry."}
            </p>
          </div>
          <div className="contact-channels-grid">
            {CONTACT_DIRECTORY.map((channel) => {
              const pageHref = DIRECTORY_LINKS[channel.id];
              return (
                <div key={channel.id} className="contact-channel">
                  <div className="contact-channel-top">
                    <span>{ar ? channel.ar : channel.en}</span>
                    {pageHref ? (
                      <Link href={pageHref} className="contact-channel-page-link">
                        {ar ? "صفحة القسم" : "View page"} <ArrowUpRight size={13} />
                      </Link>
                    ) : null}
                  </div>
                  <div className="contact-channel-addresses">
                    {channel.emails.map((key) => (
                      <a
                        key={key}
                        href={companyMailto(key)}
                        aria-label={`${ar ? channel.ar : channel.en}: ${COMPANY_EMAILS[key]}`}
                      >
                        <strong dir="ltr">{COMPANY_EMAILS[key]}</strong>
                        <ArrowUpRight size={17} aria-hidden="true" />
                      </a>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
