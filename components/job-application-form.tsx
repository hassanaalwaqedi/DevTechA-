"use client";

import { type ChangeEvent, type FormEvent, type ReactNode, useRef, useState } from "react";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  Files,
  Loader2,
  Settings2,
  Sparkles,
  Upload,
  UserRound,
} from "lucide-react";
import type { Job } from "@/lib/data";

const maxCvSize = 10 * 1024 * 1024;
const maxCoverLetterSize = 5 * 1024 * 1024;

const copy = {
  en: {
    profile: "CANDIDATE PROFILE",
    time: "About 8 minutes",
    title: "Your experience, clearly told.",
    intro: "Share the context, decisions, and outcomes that best represent how you work. Required fields are marked with an asterisk.",
    complete: "complete",
    autofillBadge: "GEMINI AI · SMART AUTO-FILL",
    autofillTitle: "Upload your CV to auto-fill this application",
    autofillDesc: "Attach your PDF or DOCX resume and Gemini AI will extract your contact details, experience level, education, links, and technical strengths.",
    autofillBtn: "Upload CV & auto-fill",
    autofillChangeBtn: "Replace CV",
    autofillAnalyzing: "Analyzing your CV with Gemini AI and filling your profile…",
    autofillSuccess: (count: number) =>
      `Auto-filled ${count} ${count === 1 ? "field" : "fields"} from your CV with Gemini AI. Please review and adjust before submitting.`,
    autofillEmpty: "CV attached. No additional fields could be extracted automatically—please complete the form below.",
    autofillError: "CV attached for your application. Auto-fill was unavailable—please complete the fields below.",
    personal: "Personal details",
    personalIntro: "The best way to reach you and where you are currently based.",
    name: "Full name *",
    email: "Email address *",
    phone: "Phone number",
    country: "Country *",
    location: "Current city / location *",
    locationPlaceholder: "e.g. Istanbul, Türkiye",
    experience: "Experience & background",
    experienceIntro: "Help us understand the work you have done and the tools you use.",
    currentRole: "Current role or education *",
    rolePlaceholder: "e.g. Software engineer",
    level: "Experience level *",
    select: "Select one",
    education: "Education / relevant training",
    educationPlaceholder: "Degree, bootcamp, certifications, or equivalent experience",
    technologies: "Relevant technologies & strengths *",
    technologiesPlaceholder: "Tell us what you work with and where you are strongest.",
    linkedin: "LinkedIn URL",
    github: "GitHub / code profile",
    portfolio: "Portfolio / personal website",
    preferences: "Work preferences",
    preferencesIntro: "These answers help us understand practical fit before we speak.",
    authorization: "Work authorization *",
    sponsorship: "Will you need sponsorship? *",
    workPreference: "Work preference *",
    notice: "Notice period",
    salary: "Compensation expectations",
    salaryPlaceholder: "Optional — include currency and period if useful",
    no: "No",
    yes: "Yes",
    documents: "Documents",
    documentsIntro: "PDF or DOCX files only. Your CV is required and automatically powers Gemini AI field extraction; a cover letter file is optional.",
    cv: "Upload CV / resume *",
    cvHelp: "PDF or DOCX · max 10 MB · Auto-fills form with Gemini AI",
    coverFile: "Upload cover letter",
    coverHelp: "PDF or DOCX · max 5 MB",
    coverText: "Or write a short cover letter",
    coverPlaceholder: "What drew you to this role, and what would you bring to the team?",
    motivation: "Motivation & availability",
    motivationIntro: "Thoughtful answers help us understand how you think, not just what is on your CV.",
    whyJoin: "Why do you want to join HIRZEXA? *",
    whyJoinPlaceholder: "What about our work or this role caught your attention?",
    whyFit: "Why are you a strong fit for this position? *",
    whyFitPlaceholder: "Share a relevant project, outcome, or way of working.",
    availability: "Availability / hours *",
    availabilityPlaceholder: "e.g. Full-time from June",
    start: "Earliest start date *",
    anything: "Anything else you would like us to know?",
    anythingPlaceholder: "Optional context, constraints, or questions.",
    unpaid: "I understand that this position is unpaid, as described on the role page. *",
    consent: "I confirm that the information I have provided is accurate and I consent to HIRZEXA using it to evaluate this application. *",
    submit: "Submit application",
    submitting: "Submitting…",
    privacy: "Your application is encrypted in transit and accessed only by the hiring team.",
    requiredError: "Please complete the required fields before submitting.",
    cvError: "Please attach your CV in PDF or DOCX format.",
    cvSize: "Your CV must be smaller than 10 MB.",
    coverSize: "Your cover letter must be smaller than 5 MB.",
    unpaidError: "Please acknowledge the compensation status before applying.",
    consentError: "Please confirm that the information provided is accurate.",
    networkError: "We could not reach the application service. Please try again.",
    fallbackError: "Unable to submit application.",
    received: "APPLICATION RECEIVED",
    thanks: "Thank you for putting your work in front of us.",
    receivedText: "We received your application for",
    keepReference: "Keep this reference for your records. Our team will contact you if there is a next step.",
    back: "Back to careers",
  },
  ar: {
    profile: "ملف المرشح",
    time: "حوالي 8 دقائق",
    title: "خبرتك، كما تريد أن ترويها.",
    intro: "شاركنا السياق والقرارات والنتائج التي تعبّر عن طريقة عملك. الحقول المطلوبة مميزة بعلامة النجمة.",
    complete: "مكتمل",
    autofillBadge: "GEMINI AI · تعبئة ذكية تلقائية",
    autofillTitle: "ارفع سيرتك الذاتية لتعبئة الطلب تلقائياً",
    autofillDesc: "أرفق سيرتك الذاتية بصيغة PDF أو DOCX وسيقوم Gemini AI باستخراج بيانات التواصل ومستوى الخبرة والتعليم والروابط والمهارات التقنية تلقائياً.",
    autofillBtn: "ارفع السيرة الذاتية وعبّئ تلقائياً",
    autofillChangeBtn: "تغيير السيرة الذاتية",
    autofillAnalyzing: "جارٍ تحليل سيرتك الذاتية عبر Gemini AI وتعبئة الحقول…",
    autofillSuccess: (count: number) =>
      `تمت تعبئة ${count} حقول تلقائياً من سيرتك الذاتية عبر Gemini AI. يرجى مراجعتها وتعديلها قبل الإرسال.`,
    autofillEmpty: "تم إرفاق السيرة الذاتية. يرجى إكمال الحقول أدناه.",
    autofillError: "تم إرفاق السيرة الذاتية لطلبك. تعذرت التعبئة التلقائية حالياً — يرجى إكمال الحقول أدناه.",
    personal: "البيانات الشخصية",
    personalIntro: "أفضل وسيلة للتواصل معك ومكان إقامتك الحالي.",
    name: "الاسم الكامل *",
    email: "البريد الإلكتروني *",
    phone: "رقم الهاتف",
    country: "الدولة *",
    location: "المدينة / الموقع الحالي *",
    locationPlaceholder: "مثال: إسطنبول، تركيا",
    experience: "الخبرة والخلفية",
    experienceIntro: "ساعدنا على فهم الأعمال التي أنجزتها والأدوات التي تستخدمها.",
    currentRole: "الوظيفة الحالية أو الدراسة *",
    rolePlaceholder: "مثال: مهندس برمجيات",
    level: "مستوى الخبرة *",
    select: "اختر",
    education: "التعليم / التدريب ذو الصلة",
    educationPlaceholder: "درجة علمية أو معسكر تدريبي أو شهادات أو خبرة معادلة",
    technologies: "التقنيات ونقاط القوة ذات الصلة *",
    technologiesPlaceholder: "أخبرنا بالأدوات التي تعمل بها والمجالات التي تتميز فيها.",
    linkedin: "رابط LinkedIn",
    github: "رابط GitHub / ملف برمجي",
    portfolio: "معرض الأعمال / الموقع الشخصي",
    preferences: "تفضيلات العمل",
    preferencesIntro: "تساعدنا هذه الإجابات على فهم الملاءمة العملية قبل أن نتحدث.",
    authorization: "أهلية العمل *",
    sponsorship: "هل تحتاج إلى كفالة؟ *",
    workPreference: "تفضيل مكان العمل *",
    notice: "فترة الإشعار",
    salary: "توقعات التعويض",
    salaryPlaceholder: "اختياري — أضف العملة والفترة إن كان ذلك مفيداً",
    no: "لا",
    yes: "نعم",
    documents: "المستندات",
    documentsIntro: "ملفات PDF أو DOCX فقط. السيرة الذاتية مطلوبة وتدعم التعبئة الذكية عبر Gemini AI، وخطاب التقديم اختياري.",
    cv: "رفع السيرة الذاتية *",
    cvHelp: "PDF أو DOCX · بحد أقصى 10 MB · تعبئة تلقائية عبر Gemini AI",
    coverFile: "رفع خطاب التقديم",
    coverHelp: "PDF أو DOCX · بحد أقصى 5 MB",
    coverText: "أو اكتب خطاب تقديم قصيراً",
    coverPlaceholder: "ما الذي جذبك إلى هذه الوظيفة، وما الذي ستضيفه إلى الفريق؟",
    motivation: "الدافع والتوفر",
    motivationIntro: "تساعدنا إجاباتك المدروسة على فهم طريقة تفكيرك، وليس فقط ما في سيرتك الذاتية.",
    whyJoin: "لماذا تريد الانضمام إلى HIRZEXA؟ *",
    whyJoinPlaceholder: "ما الذي لفت انتباهك في عملنا أو في هذه الوظيفة؟",
    whyFit: "لماذا أنت مناسب لهذه الوظيفة؟ *",
    whyFitPlaceholder: "شارك مشروعاً أو نتيجة أو أسلوب عمل ذي صلة.",
    availability: "التوفر / ساعات العمل *",
    availabilityPlaceholder: "مثال: دوام كامل ابتداءً من يونيو",
    start: "أقرب تاريخ للبدء *",
    anything: "هل هناك أي شيء آخر تود إخبارنا به؟",
    anythingPlaceholder: "سياق أو قيود أو أسئلة إضافية — اختياري.",
    unpaid: "أفهم أن هذه الوظيفة غير مدفوعة كما هو موضح في صفحة الوظيفة. *",
    consent: "أؤكد أن المعلومات التي قدمتها صحيحة وأوافق على استخدامها من HIRZEXA لتقييم هذا الطلب. *",
    submit: "إرسال الطلب",
    submitting: "جارٍ الإرسال…",
    privacy: "يتم تشفير طلبك أثناء الإرسال ولا يصل إليه سوى فريق التوظيف.",
    requiredError: "يرجى إكمال الحقول المطلوبة قبل إرسال الطلب.",
    cvError: "يرجى إرفاق السيرة الذاتية بصيغة PDF أو DOCX.",
    cvSize: "يجب أن يكون حجم السيرة الذاتية أقل من 10 MB.",
    coverSize: "يجب أن يكون حجم خطاب التقديم أقل من 5 MB.",
    unpaidError: "يرجى تأكيد حالة التعويض قبل التقديم.",
    consentError: "يرجى تأكيد صحة المعلومات المقدمة.",
    networkError: "تعذر الوصول إلى خدمة التقديم. يرجى المحاولة مرة أخرى.",
    fallbackError: "تعذر إرسال الطلب.",
    received: "تم استلام الطلب",
    thanks: "شكراً لمشاركة خبرتك وأعمالك معنا.",
    receivedText: "استلمنا طلبك لوظيفة",
    keepReference: "احتفظ بهذا الرقم للرجوع إليه. سيتواصل معك فريقنا إذا كانت هناك خطوة تالية.",
    back: "العودة إلى الوظائف",
  },
};

function SectionLegend({number, title, icon}: {number: string; title: string; icon: ReactNode}) {
  return <span className="application-legend"><span>{number}</span>{title}{icon}</span>;
}

function completionFor(form: HTMLFormElement) {
  const required = Array.from(form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("[required]"));
  if (!required.length) return 0;
  const completed = required.filter((field) =>
    field instanceof HTMLInputElement && (field.type === "checkbox" || field.type === "radio")
      ? field.checked
      : field instanceof HTMLInputElement && field.type === "file"
        ? Boolean(field.files?.length)
        : Boolean(field.value.trim())
  ).length;
  return Math.round((completed / required.length) * 100);
}

function normalizeUrlValue(raw: string | undefined): string {
  if (!raw) return "";
  const trimmed = raw.trim().replace(/^(https?:\/\/)+/i, "https://");
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) return `https://${trimmed}`;
  return "";
}

export function JobApplicationForm({job, locale}: {job: Job; locale: "en" | "ar"}) {
  const ar = locale === "ar";
  const t = copy[locale];
  const formRef = useRef<HTMLFormElement | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [completion, setCompletion] = useState(0);
  const [cvName, setCvName] = useState("");
  const [coverName, setCoverName] = useState("");
  const [parsingCv, setParsingCv] = useState(false);
  const [autofillMessage, setAutofillMessage] = useState("");
  const [autofillTone, setAutofillTone] = useState<"idle" | "loading" | "success" | "notice">("idle");

  async function handleCvChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const form = formRef.current;
    setCvName(file?.name || "");
    if (form) setCompletion(completionFor(form));
    if (!file) {
      setAutofillTone("idle");
      setAutofillMessage("");
      return;
    }

    if (file.size > maxCvSize) {
      setError(t.cvSize);
      return;
    }

    setError("");
    setParsingCv(true);
    setAutofillTone("loading");
    setAutofillMessage(t.autofillAnalyzing);

    try {
      const payload = new FormData();
      payload.append("cv", file);
      payload.append("jobTitle", job.title);
      payload.append("jobDepartment", job.department);
      payload.append("locale", locale);

      const response = await fetch("/api/applications/parse-cv", {
        method: "POST",
        body: payload,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.profile) {
        setAutofillTone("notice");
        setAutofillMessage(result.error || t.autofillError);
        return;
      }

      const profile = result.profile as Record<string, string>;
      const currentForm = formRef.current;
      if (!currentForm) return;

      const fieldMap: Array<{name: string; value: string; onlyIfEmpty?: boolean}> = [
        {name: "name", value: profile.fullName || ""},
        {name: "email", value: profile.email || ""},
        {name: "phone", value: profile.phone || ""},
        {name: "country", value: profile.country || ""},
        {name: "location", value: profile.currentLocation || ""},
        {name: "role", value: profile.currentRole || ""},
        {name: "experience", value: profile.experienceLevel || ""},
        {name: "education", value: profile.education || ""},
        {name: "technologies", value: profile.technologies || ""},
        {name: "linkedin", value: normalizeUrlValue(profile.linkedinUrl)},
        {name: "github", value: normalizeUrlValue(profile.githubUrl)},
        {name: "portfolio", value: normalizeUrlValue(profile.portfolioUrl)},
        {name: "whyFit", value: profile.whyFit || "", onlyIfEmpty: true},
      ];

      let filledCount = 0;
      for (const item of fieldMap) {
        const cleanVal = item.value.trim();
        if (!cleanVal) continue;
        const element = currentForm.elements.namedItem(item.name) as
          | HTMLInputElement
          | HTMLSelectElement
          | HTMLTextAreaElement
          | null;
        if (!element) continue;
        if (item.onlyIfEmpty && element.value.trim()) continue;
        element.value = cleanVal;
        element.setAttribute("data-autofilled", "true");
        filledCount++;
      }

      setCompletion(completionFor(currentForm));
      if (filledCount > 0) {
        setAutofillTone("success");
        setAutofillMessage(t.autofillSuccess(filledCount));
      } else {
        setAutofillTone("notice");
        setAutofillMessage(t.autofillEmpty);
      }
    } catch {
      setAutofillTone("notice");
      setAutofillMessage(t.autofillError);
    } finally {
      setParsingCv(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const form = event.currentTarget;
    if (!form.checkValidity()) { form.reportValidity(); setError(t.requiredError); return; }
    const data = new FormData(form);
    const cv = data.get("cv");
    const coverLetter = data.get("coverLetterFile");
    if (!(cv instanceof File) || !cv.name) { setError(t.cvError); return; }
    if (cv.size > maxCvSize) { setError(t.cvSize); return; }
    if (coverLetter instanceof File && coverLetter.name && coverLetter.size > maxCoverLetterSize) { setError(t.coverSize); return; }
    if (job.compensationType === "Unpaid" && !data.get("compensationAcknowledged")) { setError(t.unpaidError); return; }
    if (!data.get("consent")) { setError(t.consentError); return; }
    setError("");
    setSubmitting(true);
    data.append("jobSlug", job.slug);
    try {
      const response = await fetch("/api/applications", {method: "POST", body: data});
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { setError(result.error || t.fallbackError); return; }
      setReference(result.reference);
      setSubmitted(true);
      requestAnimationFrame(() => document.querySelector(".application-workspace")?.scrollIntoView({block: "start"}));
    } catch {
      setError(t.networkError);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) return <div className="application-form-column"><div className="application-success"><div><div className="application-success-icon"><CheckCircle2 size={34}/></div><div className="application-card-label">{t.received}</div><h2>{t.thanks}</h2><div className="reference">{reference}</div><p>{t.receivedText} <strong dir="auto">{job.title}</strong>. {t.keepReference}</p><a href="/careers">{t.back} <ArrowUpRight size={15}/></a></div></div></div>;

  return <div className="application-form-column">
    <div className="application-form-intro">
      <div className="application-form-intro-top"><span>{t.profile}</span><small aria-live="polite">{completion}% {t.complete} · {t.time}</small></div>
      <h2>{t.title}</h2><p>{t.intro}</p>
      <div className="application-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion} aria-label={ar ? "نسبة اكتمال الطلب" : "Application completion"}><span style={{width: `${completion}%`}}/></div>
    </div>

    <div className={`cv-autofill-banner is-${autofillTone}`} aria-live="polite">
      <div className="cv-autofill-copy">
        <span className="cv-autofill-badge">
          <Sparkles size={13} />
          <span>{t.autofillBadge}</span>
        </span>
        <h3>{t.autofillTitle}</h3>
        <p>{t.autofillDesc}</p>
      </div>
      <div className="cv-autofill-actions">
        <label htmlFor="cv" className={`cv-autofill-btn${parsingCv ? " is-loading" : ""}`}>
          {parsingCv ? <Loader2 size={16} className="cv-spin" /> : cvName ? <CheckCircle2 size={16} /> : <Upload size={16} />}
          <span>{cvName ? t.autofillChangeBtn : t.autofillBtn}</span>
        </label>
        {cvName ? <small className="cv-autofill-filename" dir="auto">{cvName}</small> : null}
      </div>
      {autofillMessage ? (
        <div className={`cv-autofill-status is-${autofillTone}`}>
          {parsingCv ? <Loader2 size={15} className="cv-spin" /> : <Sparkles size={15} />}
          <span>{autofillMessage}</span>
        </div>
      ) : null}
    </div>

    <form ref={formRef} className="application-form" onSubmit={submit} onInput={(event) => setCompletion(completionFor(event.currentTarget))} onChange={(event) => setCompletion(completionFor(event.currentTarget))} noValidate>
      <fieldset className="form-section" id="personal-details"><legend><SectionLegend number="01" title={t.personal} icon={<UserRound size={18}/>} /></legend><p className="form-section-intro">{t.personalIntro}</p><div className="field-grid"><div className="field"><label htmlFor="name">{t.name}</label><input required id="name" name="name" autoComplete="name" /></div><div className="field"><label htmlFor="email">{t.email}</label><input required type="email" id="email" name="email" autoComplete="email" /></div><div className="field"><label htmlFor="phone">{t.phone}</label><input id="phone" name="phone" type="tel" autoComplete="tel" /></div><div className="field"><label htmlFor="country">{t.country}</label><input required id="country" name="country" autoComplete="country-name" /></div><div className="field full"><label htmlFor="location">{t.location}</label><input required id="location" name="location" autoComplete="address-level2" placeholder={t.locationPlaceholder} /></div></div></fieldset>

      <fieldset className="form-section" id="experience-background"><legend><SectionLegend number="02" title={t.experience} icon={<BriefcaseBusiness size={18}/>} /></legend><p className="form-section-intro">{t.experienceIntro}</p><div className="field-grid"><div className="field"><label htmlFor="role">{t.currentRole}</label><input required id="role" name="role" placeholder={t.rolePlaceholder} /></div><div className="field"><label htmlFor="experience">{t.level}</label><select required id="experience" name="experience" defaultValue=""><option value="" disabled>{t.select}</option><option value="Student / entry-level">{ar ? "طالب / مبتدئ" : "Student / entry-level"}</option><option value="1–2 years">{ar ? "1–2 سنة" : "1–2 years"}</option><option value="2–3 years">{ar ? "2–3 سنوات" : "2–3 years"}</option><option value="4–6 years">{ar ? "4–6 سنوات" : "4–6 years"}</option><option value="7+ years">{ar ? "+7 سنوات" : "7+ years"}</option></select></div><div className="field full"><label htmlFor="education">{t.education}</label><input id="education" name="education" placeholder={t.educationPlaceholder} /></div><div className="field full"><label htmlFor="technologies">{t.technologies}</label><textarea required id="technologies" name="technologies" placeholder={t.technologiesPlaceholder} /></div><div className="field"><label htmlFor="linkedin">{t.linkedin}</label><input type="url" id="linkedin" name="linkedin" placeholder="https://linkedin.com/in/..." /></div><div className="field"><label htmlFor="github">{t.github}</label><input type="url" id="github" name="github" placeholder="https://github.com/..." /></div><div className="field full"><label htmlFor="portfolio">{t.portfolio}</label><input type="url" id="portfolio" name="portfolio" placeholder="https://" /></div></div></fieldset>

      <fieldset className="form-section" id="work-preferences"><legend><SectionLegend number="03" title={t.preferences} icon={<Settings2 size={18}/>} /></legend><p className="form-section-intro">{t.preferencesIntro}</p><div className="field-grid"><div className="field"><label htmlFor="workAuthorization">{t.authorization}</label><select required id="workAuthorization" name="workAuthorization" defaultValue=""><option value="" disabled>{t.select}</option><option value="Authorized to work in my location">{ar ? "مصرح لي بالعمل في موقعي" : "Authorized to work in my location"}</option><option value="Need sponsorship">{ar ? "أحتاج إلى كفالة" : "Need sponsorship"}</option><option value="Open to discussing options">{ar ? "منفتح لمناقشة الخيارات" : "Open to discussing options"}</option></select></div><div className="field"><label htmlFor="sponsorshipRequired">{t.sponsorship}</label><select required id="sponsorshipRequired" name="sponsorshipRequired" defaultValue=""><option value="" disabled>{t.select}</option><option value="no">{t.no}</option><option value="yes">{t.yes}</option></select></div><div className="field"><label htmlFor="remotePreference">{t.workPreference}</label><select required id="remotePreference" name="remotePreference" defaultValue=""><option value="" disabled>{t.select}</option><option value="Remote">{ar ? "عن بُعد" : "Remote"}</option><option value="Hybrid">{ar ? "هجين" : "Hybrid"}</option><option value="On-site">{ar ? "من المكتب" : "On-site"}</option><option value="Flexible">{ar ? "مرن" : "Flexible"}</option></select></div><div className="field"><label htmlFor="noticePeriod">{t.notice}</label><select id="noticePeriod" name="noticePeriod" defaultValue=""><option value="">{t.select}</option><option value="Immediately available">{ar ? "متاح فوراً" : "Immediately available"}</option><option value="Less than 2 weeks">{ar ? "أقل من أسبوعين" : "Less than 2 weeks"}</option><option value="2–4 weeks">{ar ? "2–4 أسابيع" : "2–4 weeks"}</option><option value="More than 4 weeks">{ar ? "أكثر من 4 أسابيع" : "More than 4 weeks"}</option></select></div><div className="field full"><label htmlFor="salaryExpectation">{t.salary}</label><input id="salaryExpectation" name="salaryExpectation" placeholder={t.salaryPlaceholder} /></div></div></fieldset>

      <fieldset className="form-section" id="application-documents"><legend><SectionLegend number="04" title={t.documents} icon={<Files size={18}/>} /></legend><p className="form-section-intro">{t.documentsIntro}</p><div className="document-upload-grid"><label className={`upload-card${cvName ? " has-file" : ""}${parsingCv ? " is-analyzing" : ""}`} htmlFor="cv"><span className="upload-icon">{parsingCv ? <Loader2 size={18} className="cv-spin" /> : cvName ? <CheckCircle2 size={19}/> : <Upload size={18}/>}</span><span className="upload-copy"><strong>{t.cv}</strong>{cvName ? <em dir="auto">{cvName}</em> : <small>{t.cvHelp}</small>}</span><input required type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" id="cv" name="cv" onChange={handleCvChange} /></label><label className={`upload-card${coverName ? " has-file" : ""}`} htmlFor="coverLetterFile"><span className="upload-icon">{coverName ? <CheckCircle2 size={19}/> : <FileText size={18}/>}</span><span className="upload-copy"><strong>{t.coverFile}</strong>{coverName ? <em dir="auto">{coverName}</em> : <small>{t.coverHelp}</small>}</span><input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" id="coverLetterFile" name="coverLetterFile" onChange={(event) => setCoverName(event.target.files?.[0]?.name || "")} /></label></div><div className="field application-cover-field"><label htmlFor="coverLetterText">{t.coverText}</label><textarea id="coverLetterText" name="coverLetterText" placeholder={t.coverPlaceholder} /></div></fieldset>

      <fieldset className="form-section" id="motivation-availability"><legend><SectionLegend number="05" title={t.motivation} icon={<Sparkles size={18}/>} /></legend><p className="form-section-intro">{t.motivationIntro}</p><div className="field"><label htmlFor="whyJoin">{t.whyJoin}</label><textarea required id="whyJoin" name="whyJoin" placeholder={t.whyJoinPlaceholder} /></div><div className="field"><label htmlFor="whyFit">{t.whyFit}</label><textarea required id="whyFit" name="whyFit" placeholder={t.whyFitPlaceholder} /></div><div className="field-grid"><div className="field"><label htmlFor="availability">{t.availability}</label><input required id="availability" name="availability" placeholder={t.availabilityPlaceholder} /></div><div className="field"><label htmlFor="startDate">{t.start}</label><input required type="date" id="startDate" name="startDate" /></div></div><div className="field"><label htmlFor="additionalMessage">{t.anything}</label><textarea id="additionalMessage" name="additionalMessage" placeholder={t.anythingPlaceholder} /></div></fieldset>

      <div className="application-checks">{job.compensationType === "Unpaid" ? <label className="checkbox"><input required type="checkbox" name="compensationAcknowledged" /><span>{t.unpaid}</span></label> : null}<label className="checkbox consent-checkbox"><input required type="checkbox" name="consent" /><span>{t.consent}</span></label></div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="form-actions"><button className="application-submit" type="submit" disabled={submitting} aria-busy={submitting}>{submitting ? t.submitting : t.submit}<span>{submitting ? "…" : <ArrowUpRight size={17}/>}</span></button><p>{t.privacy}</p></div>
    </form>
  </div>;
}
