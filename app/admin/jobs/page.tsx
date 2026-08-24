import { AdminShell } from "@/components/admin-shell";
import { AdminJobsClient } from "@/components/admin-jobs-client";
export const dynamic = "force-dynamic";
export default function AdminJobsPage() { return <AdminShell active="jobs"><div className="admin-top"><div><h1>Jobs</h1><p>Create, publish, and manage your open positions.</p></div></div><AdminJobsClient /></AdminShell>; }
