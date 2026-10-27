import Link from "next/link";
import { ArrowLeft, BriefcaseBusiness, Clock3, MapPin, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { getJobBySlug } from "@/lib/db";
import { getLocale } from "@/lib/locale";
import { JobApplicationForm } from "@/components/job-application-form";
import "./apply.css";

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
    <section className="application-hero">
      <div className="application-grid-pattern" aria-hidden="true"/>
      <div className="container application-hero-grid">
        <div className="application-hero-copy">
          <Link href={`/careers/${job.slug}`} className="application-back"><ArrowLeft size={15}/>{ar ? "العودة إلى الوظيفة" : "Back to position"}</Link>
          <div className="application-eyebrow"><i/>{ar ? "طلب توظيف" : "ROLE APPLICATION"} / <span dir="auto">{job.department}</span></div>
          <h1>{ar ? <>شاركنا العمل الذي<br/><em>شكّل طريقة تفكيرك.</em></> : <>Show us the work<br/><em>behind your thinking.</em></>}</h1>
          <p>{ar ? <>أنت تتقدم لوظيفة <strong dir="auto">{job.title}</strong>. الإجابات المدروسة أهم لدينا من الكلمات المثالية.</> : <>You&apos;re applying for <strong>{job.title}</strong>. Thoughtful answers matter more than perfect words.</>}</p>
        </div>
        <div className="application-signal" aria-hidden="true">
          <div className="application-signal-top"><span>{ar ? "إشارة المرشح / 01" : "CANDIDATE SIGNAL / 01"}</span><span>DEVTECH AI ✦</span></div>
          <div className="application-orbit application-orbit-one"/><div className="application-orbit application-orbit-two"/>
          <div className="application-signal-core"><span>✦</span><strong>{ar ? "أنت" : "YOU"}</strong></div>
          <div className="application-node application-node-one">{ar ? "الحِرفة" : "CRAFT"}</div>
          <div className="application-node application-node-two">{ar ? "الأنظمة" : "SYSTEMS"}</div>
          <div className="application-node application-node-three">{ar ? "الحُكم" : "JUDGMENT"}</div>
          <div className="application-signal-bottom"><span>{ar ? "مراجعة بشرية" : "HUMAN REVIEWED"}</span><span>{ar ? "مصمم بعناية" : "BUILT WITH INTENT"}</span></div>
        </div>
      </div>
    </section>

    <section className="application-workspace">
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
