import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, MapPin } from "lucide-react";
import type { Job } from "@/lib/data";
import { JobVisualization } from "@/components/job-visualization";

export function CareersDirectory({initialJobs, available, arabic}: {initialJobs: Job[]; available: boolean; arabic: boolean}) {
  const jobs = initialJobs.filter((job) => job.status === "open");
  if (!available || !jobs.length) {
    return <div className="career-board"><div className="career-empty"><span className="career-empty-icon"><BriefcaseBusiness size={22}/></span><div><h3>{arabic ? "لا توجد وظائف متاحة حالياً." : available ? "No open positions right now." : "We can’t load open positions right now."}</h3><p>{arabic ? "يسعدنا التعرف عليك. تواصل معنا لمعرفة الفرص القادمة." : "We’d still love to hear from thoughtful people interested in our work."}</p></div><a href="mailto:hello@devtech.ai?subject=Careers%20at%20DevTech%20AI">{arabic ? "تواصل معنا" : "Say hello"}<ArrowUpRight size={16}/></a></div></div>;
  }

  return <div className="career-board">
    <div className="career-board-head"><div><span className="career-board-dot"/>{arabic ? "الوظائف المفتوحة" : "OPEN POSITIONS"}</div><span>{jobs.length} {arabic ? "فرصة" : jobs.length === 1 ? "OPEN ROLE" : "OPEN ROLES"}</span></div>
    <div className="career-role-list">{jobs.map((job, index) => <article className="career-role" key={job.id}>
      <div className="career-role-index">{String(index + 1).padStart(2, "0")}</div>
      <div className="career-role-content" dir="auto"><div className="career-role-department">{job.department}</div><h3>{job.title}</h3><p>{job.description}</p><div className="career-role-skills">{job.skills.slice(0, 3).map((skill) => <span key={skill}>{skill}</span>)}</div></div>
      <div className="career-role-meta"><span><MapPin size={14}/>{job.location} · {job.workMode}</span><span><BriefcaseBusiness size={14}/>{job.employmentType}</span></div>
      <Link href={`/careers/${job.slug}`} className="career-role-link">{arabic ? "عرض الوظيفة" : "View position"}<ArrowUpRight size={16}/></Link>
      <div className="career-role-visual"><JobVisualization compact category={job.visualCategory} variant={job.visualVariant} accent={job.accentColor} label={arabic ? `تصور توضيحي لمجال وظيفة ${job.title}` : `Conceptual illustration for the ${job.title} role`}/></div>
    </article>)}</div>
  </div>;
}
