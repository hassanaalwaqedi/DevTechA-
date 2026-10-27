import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Clock3, MapPin, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";
import { getJobBySlug } from "@/lib/db";
import { getLocale } from "@/lib/locale";
import { JobShareActions } from "@/components/job-share-actions";
import { JobVisualization } from "@/components/job-visualization";

function formatDate(value: string | undefined, locale: "en" | "ar") {
  return value ? new Date(`${value}T12:00:00Z`).toLocaleDateString(locale === "ar" ? "ar" : "en-US", {month: "long", day: "numeric", year: "numeric"}) : "";
}

function isPastDeadline(value?: string) {
  return Boolean(value && new Date(`${value}T23:59:59Z`).getTime() < Date.now());
}

export async function generateMetadata({params}: {params: Promise<{slug: string}>}): Promise<Metadata> {
  const {slug} = await params;
  const job = await getJobBySlug(slug);
  if (!job) return {title: "Position not found"};
  const title = `We’re hiring: ${job.title}`;
  const details = Array.from(new Set([job.location, job.workMode, job.employmentType].filter(Boolean))).join(" · ");
  const description = `Join DevTech AI as ${job.title}. ${details}. Explore the role and apply.`;
  const url = `/careers/${job.slug}`;
  const image = `${url}/opengraph-image`;
  return {
    title: `${job.title} | DevTech AI Careers`,
    description,
    alternates: {canonical: url},
    openGraph: {title, description, type: "website", url, siteName: "DevTech AI", images: [{url: image, width: 1200, height: 630, alt: `${job.title} — DevTech AI is hiring`}]},
    twitter: {card: "summary_large_image", title, description, images: [image]},
  };
}

function RoleSection({title, items}: {title: string; items: string[]}) {
  if (!items.length) return null;
  return <section className="role-section"><h2>{title}</h2><ul>{items.map((item) => <li key={item} dir="auto">{item}</li>)}</ul></section>;
}

export default async function JobPage({params}: {params: Promise<{slug: string}>}) {
  const [{slug}, locale] = await Promise.all([params, getLocale()]);
  const job = await getJobBySlug(slug);
  if (!job) notFound();
  const ar = locale === "ar";
  const closed = isPastDeadline(job.deadline);
  const copy = ar ? {
    eyebrow: "وظائف DEVTECH AI",
    apply: "قدّم الآن",
    closed: "أُغلق التقديم لهذه الوظيفة.",
    concept: "تصور توضيحي لمجال العمل — وليس مخرجات نموذج حقيقية",
    opportunity: "الفرصة",
    responsibilities: "ما الذي ستقوم به",
    requirements: "ما الذي ستضيفه للفريق",
    nice: "يفضل أن تمتلك",
    skills: "المهارات التي نقدرها",
    details: "تفاصيل الوظيفة",
    department: "القسم",
    location: "الموقع",
    arrangement: "نمط العمل",
    employment: "نوع التوظيف",
    duration: "المدة",
    compensation: "التعويض",
    posted: "تاريخ النشر",
    deadline: "آخر موعد للتقديم",
    compensationNote: "ملاحظة حول التعويض",
  } : {
    eyebrow: "DEVTECH AI CAREERS",
    apply: "Apply for this role",
    closed: "Applications for this position are closed.",
    concept: "Conceptual role illustration — not real model output",
    opportunity: "The opportunity",
    responsibilities: "What you’ll do",
    requirements: "What you bring",
    nice: "Nice to have",
    skills: "Skills we value",
    details: "Role details",
    department: "Department",
    location: "Location",
    arrangement: "Work arrangement",
    employment: "Employment",
    duration: "Duration",
    compensation: "Compensation",
    posted: "Posted",
    deadline: "Applications close",
    compensationNote: "Compensation note",
  };

  return <main dir={ar ? "rtl" : "ltr"}>
    <section className="role-aware-hero"><div className="container role-aware-grid">
      <div className="role-aware-copy">
        <div className="eyebrow">{copy.eyebrow} · <span dir="auto">{job.department}</span></div>
        <h1 dir="auto">{job.title}</h1>
        <p dir="auto">{job.description}</p>
        <div className="role-aware-meta"><span><MapPin size={14}/>{job.location} · {job.workMode}</span><span><Clock3 size={14}/>{job.employmentType} · {job.duration}</span><span><Sparkles size={14}/>{job.compensationType}</span></div>
        <div className="role-aware-actions">{closed ? <div className="closed-note">{copy.closed}</div> : <Link href={`/careers/${job.slug}/apply`} className="button-dark">{copy.apply}<ArrowUpRight size={15}/></Link>}<JobShareActions slug={job.slug} title={job.title}/></div>
        <span className="role-aware-note">{copy.concept}</span>
      </div>
      <JobVisualization category={job.visualCategory} variant={job.visualVariant} accent={job.accentColor} label={ar ? `تصور توضيحي لمجال وظيفة ${job.title}` : `Conceptual illustration for the ${job.title} role`}/>
    </div></section>

    <section className="section"><div className="container job-layout"><article className="job-content"><div className="role-intro"><div className="eyebrow">{copy.opportunity}</div><p dir="auto">{job.description}</p></div><RoleSection title={copy.responsibilities} items={job.responsibilities}/><RoleSection title={copy.requirements} items={job.requirements}/><RoleSection title={copy.nice} items={job.niceToHave}/>{job.skills.length > 0 && <section className="role-section"><h2>{copy.skills}</h2><div className="skill-list">{job.skills.map((skill) => <span className="pill" key={skill} dir="auto">{skill}</span>)}</div></section>}</article><aside className="job-sidebar"><div className="eyebrow">{copy.details}</div><dl><dt>{copy.department}</dt><dd dir="auto">{job.department}</dd><dt>{copy.location}</dt><dd>{job.location}</dd><dt>{copy.arrangement}</dt><dd>{job.workMode}</dd><dt>{copy.employment}</dt><dd>{job.employmentType}</dd><dt>{copy.duration}</dt><dd>{job.duration}</dd><dt>{copy.compensation}</dt><dd dir="auto">{job.compensationText}</dd><dt>{copy.posted}</dt><dd>{formatDate(job.publishedAt, locale)}</dd>{job.deadline && <><dt>{copy.deadline}</dt><dd>{formatDate(job.deadline, locale)}</dd></>}</dl>{closed ? <div className="closed-note">{copy.closed}</div> : <Link href={`/careers/${job.slug}/apply`} className="button-dark">{copy.apply}<ArrowUpRight size={15}/></Link>}{job.compensationType === "Unpaid" && <div className="unpaid-note"><strong>{copy.compensationNote}</strong><br/>{job.compensationText}</div>}</aside></div></section>
  </main>;
}
