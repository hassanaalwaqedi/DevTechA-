import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Check, Clock3, MapPin, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";
import { getJobBySlug } from "@/lib/db";

function formatDate(value?: string) { return value ? new Date(`${value}T12:00:00Z`).toLocaleDateString("en-US", {month: "long", day: "numeric", year: "numeric"}) : ""; }
function isPastDeadline(value?: string) { return Boolean(value && new Date(`${value}T23:59:59Z`).getTime() < Date.now()); }

export async function generateMetadata({params}: {params: Promise<{slug: string}>}): Promise<Metadata> {
  const {slug} = await params;
  const job = await getJobBySlug(slug);
  return {title: job ? `${job.title} | DevTech AI Careers` : "Position not found", description: job?.description, alternates: {canonical: `/careers/${slug}`}, openGraph: {title: job?.title, description: job?.description, type: "website"}};
}

function RoleSection({title, items}: {title: string; items: string[]}) {
  if (!items.length) return null;
  return <section className="role-section"><h2>{title}</h2><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></section>;
}

export default async function JobPage({params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params;
  const job = await getJobBySlug(slug);
  if (!job) notFound();
  const closed = isPastDeadline(job.deadline);
  return <main>
    <section className="page-hero"><div className="container"><div className="eyebrow">DevTech AI careers · {job.department}</div><h1>{job.title}</h1><p>{job.description}</p><div className="job-hero-meta"><span><MapPin size={15}/>{job.location} · {job.workMode}</span><span><Clock3 size={15}/>{job.employmentType} · {job.duration}</span><span><Sparkles size={15}/>{job.compensationType}</span></div></div></section>
    <section className="section"><div className="container job-layout"><article className="job-content"><div className="role-intro"><div className="eyebrow">The opportunity</div><p>{job.description}</p></div><RoleSection title="What you’ll do" items={job.responsibilities}/><RoleSection title="What you bring" items={job.requirements}/><RoleSection title="Nice to have" items={job.niceToHave}/>{job.skills.length > 0 && <section className="role-section"><h2>Skills we value</h2><div className="skill-list">{job.skills.map((skill) => <span className="pill" key={skill}>{skill}</span>)}</div></section>}</article><aside className="job-sidebar"><div className="eyebrow">Role details</div><dl><dt>Department</dt><dd>{job.department}</dd><dt>Location</dt><dd>{job.location}</dd><dt>Work arrangement</dt><dd>{job.workMode}</dd><dt>Employment</dt><dd>{job.employmentType}</dd><dt>Duration</dt><dd>{job.duration}</dd><dt>Compensation</dt><dd>{job.compensationText}</dd><dt>Posted</dt><dd>{formatDate(job.publishedAt)}</dd>{job.deadline && <><dt>Applications close</dt><dd>{formatDate(job.deadline)}</dd></>}</dl>{closed ? <div className="closed-note">Applications for this position are closed.</div> : <Link href={`/careers/${job.slug}/apply`} className="button-dark">Apply for this role <ArrowUpRight size={15}/></Link>}{job.compensationType === "Unpaid" && <div className="unpaid-note"><strong>Compensation note</strong><br/>{job.compensationText}</div>}</aside></div></section>
  </main>;
}
