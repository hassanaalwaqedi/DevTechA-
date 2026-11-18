import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { listCrmLeads } from "@/lib/crm";
import { CRM_STAGE_LABELS } from "@/lib/crm-types";
import { getMetrics } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [metrics, crmLeads] = await Promise.all([getMetrics(), listCrmLeads()]);
  const bookedCallsCount = crmLeads.filter((l) => l.stage === "meeting_booked").length;
  const stats = [
    { label: "Sales CRM Leads", value: crmLeads.length },
    { label: "Booked Discovery Calls", value: bookedCallsCount },
    { label: "Visitors", value: metrics.totalVisitors },
    { label: "Visitors today", value: metrics.visitorsToday },
    { label: "Total applicants", value: metrics.totalApplications },
    { label: "Applications today", value: metrics.applicationsToday },
    { label: "Active jobs", value: metrics.activeJobs },
    { label: "Interviews", value: metrics.interviews },
  ];

  return (
    <AdminShell active="overview">
      <div className="admin-top">
        <div>
          <h1>Good morning.</h1>
          <p>
            Here&apos;s what&apos;s happening across your B2B sales bookings, hiring
            pipeline, and site traffic.
          </p>
        </div>
        <Link
          href="/admin/crm"
          className="button-dark"
          style={{ textDecoration: "none" }}
        >
          Open Sales CRM ({crmLeads.length})
        </Link>
      </div>

      <div className="metric-grid">
        {stats.map((stat) => (
          <div className="metric" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </div>

      <div className="admin-panel">
        <div className="admin-toolbar" style={{ marginBottom: 14 }}>
          <h2 style={{ margin: 0 }}>Latest Discovery Call Bookings &amp; Proposals</h2>
          <Link
            href="/admin/crm"
            className="button-small"
            style={{ textDecoration: "none" }}
          >
            Manage all in Sales CRM →
          </Link>
        </div>
        {crmLeads.length > 0 ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Client &amp; Company</th>
                <th>Track</th>
                <th>Appointment / Window</th>
                <th>Stage</th>
              </tr>
            </thead>
            <tbody>
              {crmLeads.slice(0, 5).map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <strong>{lead.referenceId}</strong>
                  </td>
                  <td>
                    <strong>{lead.company || lead.fullName}</strong>
                    <br />
                    <span style={{ color: "#9ba397", fontSize: 11 }}>
                      {lead.fullName} · {lead.email}
                    </span>
                  </td>
                  <td>{lead.serviceTrack}</td>
                  <td>
                    {lead.scheduledSlotIso
                      ? `${new Date(lead.scheduledSlotIso).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })} (${lead.timezone})`
                      : lead.preferredWindow || "Proposal Request"}
                  </td>
                  <td>
                    <span className="status">{CRM_STAGE_LABELS[lead.stage].en}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-state">
            No discovery calls or proposal requests recorded yet. New bookings from{" "}
            <code>/book</code> or the homepage appear here and in{" "}
            <Link href="/admin/crm" style={{ color: "#dbff53" }}>
              /admin/crm
            </Link>{" "}
            automatically.
          </p>
        )}
      </div>

      <div className="admin-panel">
        <h2>Most viewed roles</h2>
        {metrics.analyticsAvailable ? (
          metrics.topJobs.length ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Page views</th>
                  <th>Unique visitors</th>
                </tr>
              </thead>
              <tbody>
                {metrics.topJobs.map((job) => (
                  <tr key={job.slug}>
                    <td>{job.title}</td>
                    <td>{job.views}</td>
                    <td>{job.uniqueVisitors}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-state">No job-page visits have been recorded yet.</p>
          )
        ) : (
          <p className="empty-state">
            Run the updated <code>supabase/schema.sql</code> once to enable visitor
            analytics.
          </p>
        )}
      </div>

      <div className="admin-panel">
        <h2>Application status</h2>
        <div className="detail-row">
          <span>New · Reviewing · Shortlisted · Interview · Accepted · Rejected</span>
          <span>
            {metrics.newApplications} · {metrics.reviewing} · {metrics.shortlisted} ·{" "}
            {metrics.interviews} · {metrics.accepted} · {metrics.rejected}
          </span>
        </div>
      </div>
    </AdminShell>
  );
}
