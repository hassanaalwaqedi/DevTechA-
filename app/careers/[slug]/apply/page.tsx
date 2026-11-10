import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BriefcaseBusiness, Clock3, MapPin, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { getJobBySlug } from "@/lib/db";
import { getLocale } from "@/lib/locale";
import { JobApplicationForm } from "@/components/job-application-form";
import { warmJobCard } from "@/lib/social-card-renderer";
import "./apply.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const job = await getJobBySlug(slug);
  if (!job) return { title: "Apply | HIRZEXA Careers" };

  const isArabic = /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/.test(job.title);
  const title = isArabic
    ? `التقديم على وظيفة ${job.title} | HIRZEXA`
    : `Apply for ${job.title} — HIRZEXA Careers`;
  const description = isArabic
    ? `قدّم الآن على وظيفة ${job.title} في قسم ${job.department} لدى HIRZEXA (${job.location} · ${job.workMode}).`
    : `Submit your application for ${job.title} (${job.department} · ${job.location} · ${job.workMode}) at HIRZEXA.`;
  const url = `/careers/${job.slug}/apply`;
  warmJobCard(job);
  const image = `/og/jobs/${encodeURIComponent(job.slug)}.jpg?v=4`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: "website",
      url,
      siteName: "HIRZEXA",
      images: [{ url: image, width: 1200, height: 630, type: "image/jpeg", alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function ApplyPage({params}: {params: Promise<{slug: string}>}) {
  const [{slug}, locale] = await Promise.all([params, getLocale()]);
  const job = await getJobBySlug(slug);
  if (!job) notFound();
  const ar = locale === "ar";

  const steps = ar
    ? [
        ["01", "بياناتك", "personal-details"],
        ["02", "الخبرة", "experience-background"],
        ["03", "تفضيلات العمل", "work-preferences"],
        ["04", "المستندات", "application-documents"],
        ["05", "الدافع والتوفر", "motivation-availability"],
      ]
    : [
        ["01", "Your details", "personal-details"],
        ["02", "Experience", "experience-background"],
        ["03", "Work preferences", "work-preferences"],
        ["04", "Documents", "application-documents"],
        ["05", "Motivation", "motivation-availability"],
      ];

  return <main className="application-page">
    <section className="application-workspace">
      <div className="container application-topbar">
        <Link href={`/careers/${job.slug}`} className="application-back"><ArrowLeft size={15}/>{ar ? "العودة إلى الوظيفة" : "Back to position"}</Link>
        <h1>{ar ? "طلب التوظيف" : "Job application"}</h1>
      </div>
      <div className="container application-layout">
        <aside className="application-rail">
          <div className="application-role-card">
            <span className="application-card-label">{ar ? "الوظيفة المفتوحة" : "OPEN POSITION"}</span>
            <h2 dir="auto">{job.title}</h2>
            <div className="application-role-meta">
              <span><BriefcaseBusiness size={15}/><span dir="auto">{job.department} · {job.employmentType}</span></span>
              <span><MapPin size={15}/><span dir="auto">{job.location} · {job.workMode}</span></span>
              <span><Clock3 size={15}/><span dir="auto">{job.duration}</span></span>
            </div>
          </div>
          <nav className="application-steps" aria-label={ar ? "أقسام طلب التوظيف" : "Application sections"}>
            <span className="application-card-label">{ar ? "طلبك" : "YOUR APPLICATION"}</span>
            {steps.map(([number, label, target]) => <a href={`#${target}`} key={target}><span>{number}</span>{label}</a>)}
          </nav>
          <div className="application-trust"><ShieldCheck size={18}/><p>{ar ? "تُراجع الطلبات من فريق التوظيف فقط. لا نستخدم قرارات توظيف آلية." : "Applications are reviewed only by the hiring team. We do not make automated hiring decisions."}</p></div>
        </aside>
        <JobApplicationForm job={job} locale={locale}/>
      </div>
    </section>
  </main>;
}
