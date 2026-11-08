import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, MapPin } from "lucide-react";
import type { Job } from "@/lib/data";

export function CareersDirectory({initialJobs, available, arabic}: {initialJobs: Job[]; available: boolean; arabic: boolean}) {
  const jobs = initialJobs.filter((job) => job.status === "open");
  if (!available || !jobs.length) {
    return <div className="career-board"><div className="career-empty"><span className="career-empty-icon"><BriefcaseBusiness size={22}/></span><div><h3>{arabic ? available ? "لا توجد وظائف متاحة حالياً." : "تعذّر تحميل الوظائف المتاحة حالياً." : available ? "No open positions right now." : "Open positions are temporarily unavailable."}</h3><p>{arabic ? available ? "تواصل معنا للاستفسار عن فرص العمل المستقبلية." : "يرجى المحاولة لاحقاً أو التواصل معنا للاستفسار عن الوظائف." : available ? "Contact us to enquire about future opportunities." : "Please try again later or contact us for information about current openings."}</p></div><a href="mailto:hello@devtech.ai?subject=Careers%20at%20DevTech%20AI">{arabic ? "تواصل معنا" : "Contact recruitment"}<ArrowUpRight size={16}/></a></div></div>;
  }

  return <div className="career-board">
    <div className="career-board-head"><div><span className="career-board-dot"/>{arabic ? "الوظائف المفتوحة" : "OPEN POSITIONS"}</div><span>{jobs.length} {arabic ? "فرصة" : jobs.length === 1 ? "OPEN ROLE" : "OPEN ROLES"}</span></div>
    <div className="career-role-list">{jobs.map((job, index) => <article className="career-role" key={job.id}>
      <div className="career-role-index">{String(index + 1).padStart(2, "0")}</div>
      <div className="career-role-content" dir="auto"><div className="career-role-department">{job.department}</div><h3>{job.title}</h3><p>{job.description}</p><div className="career-role-skills">{job.skills.slice(0, 3).map((skill) => <span key={skill}>{skill}</span>)}</div></div>
      <div className="career-role-meta"><span><MapPin size={14}/>{job.location} · {job.workMode}</span><span><BriefcaseBusiness size={14}/>{job.employmentType}</span><span dir="auto" className="career-role-compensation">{job.compensationText || job.compensationType}</span></div>
      <Link href={`/careers/${job.slug}`} className="career-role-link">{arabic ? "عرض الوظيفة" : "View position"}<ArrowUpRight size={16}/></Link>
    </article>)}</div>
  </div>;
}
