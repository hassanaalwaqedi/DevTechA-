import { AdminShell } from "@/components/admin-shell";
import { getMetrics } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const metrics = await getMetrics();
  const stats = [
    {label: "Visitors", value: metrics.totalVisitors},
    {label: "Visitors today", value: metrics.visitorsToday},
    {label: "Job page views", value: metrics.jobPageViews},
    {label: "Unique job visitors", value: metrics.jobVisitors},
    {label: "Total applicants", value: metrics.totalApplications},
    {label: "Applications today", value: metrics.applicationsToday},
    {label: "Active jobs", value: metrics.activeJobs},
    {label: "Interviews", value: metrics.interviews},
  ];

  return <AdminShell active="overview">
    <div className="admin-top"><div><h1>Good morning.</h1><p>Here&apos;s what&apos;s happening across your hiring pipeline and site traffic.</p></div><span className="eyebrow">Admin workspace</span></div>
    <div className="metric-grid">{stats.map((stat) => <div className="metric" key={stat.label}><span>{stat.label}</span><strong>{stat.value}</strong></div>)}</div>
    <div className="admin-panel"><h2>Most viewed roles</h2>{metrics.analyticsAvailable ? metrics.topJobs.length ? <table className="admin-table"><thead><tr><th>Role</th><th>Page views</th><th>Unique visitors</th></tr></thead><tbody>{metrics.topJobs.map((job) => <tr key={job.slug}><td>{job.title}</td><td>{job.views}</td><td>{job.uniqueVisitors}</td></tr>)}</tbody></table> : <p className="empty-state">No job-page visits have been recorded yet.</p> : <p className="empty-state">Run the updated <code>supabase/schema.sql</code> once to enable visitor analytics.</p>}</div>
    <div className="admin-panel"><h2>Application status</h2><div className="detail-row"><span>New · Reviewing · Shortlisted · Interview · Accepted · Rejected</span><span>{metrics.newApplications} · {metrics.reviewing} · {metrics.shortlisted} · {metrics.interviews} · {metrics.accepted} · {metrics.rejected}</span></div></div>
  </AdminShell>;
}
