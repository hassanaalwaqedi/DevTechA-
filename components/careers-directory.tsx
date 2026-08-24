"use client";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Job } from "@/lib/data";

export function CareersDirectory({ initialJobs }: { initialJobs: Job[] }) {
  const openJobs = initialJobs.filter((job) => job.status === "open");
  return <div className="job-list">{openJobs.length ? openJobs.map((job) => <div className="job-row" key={job.id}><div><div className="job-label">{job.department}</div><h3>{job.title}</h3><p>Posted {new Date(job.publishedAt).toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric"})}</p></div><div className="job-fact"><strong>{job.location}</strong>{job.workMode}</div><div className="job-fact"><strong>{job.employmentType.split(" · ")[0]}</strong>{job.duration}</div><Link className="arrow-link" href={`/careers/${job.slug}`}>View position <ArrowUpRight size={15}/></Link></div>) : <div className="empty-state" style={{padding: "50px 0", color: "var(--muted)"}}>No open positions right now. Check back soon.</div>}</div>;
}
