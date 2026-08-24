import Link from "next/link";
import { ArrowDownLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getJobBySlug } from "@/lib/db";
import { JobApplicationForm } from "@/components/job-application-form";

export default async function ApplyPage({params}: {params: Promise<{slug: string}>}) { const {slug} = await params; const job = await getJobBySlug(slug); if (!job) notFound(); return <main><section className="form-page"><div className="container form-layout"><div className="form-heading"><Link href={`/careers/${job.slug}`} className="arrow-link"><ArrowDownLeft size={15}/> Back to position</Link><div className="eyebrow" style={{marginTop: 50}}>Application · {job.department}</div><h1 style={{fontSize: "clamp(44px, 6vw, 72px)", marginTop: 18}}>Tell us about your work.</h1><p>You’re applying for <strong>{job.title}</strong>. Take your time—thoughtful answers help us understand how you think.</p></div><JobApplicationForm job={job}/></div></section></main>; }
