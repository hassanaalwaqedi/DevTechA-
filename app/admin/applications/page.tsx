import { AdminShell } from "@/components/admin-shell";
import { AdminApplicationsClient } from "@/components/admin-applications-client";
export const dynamic = "force-dynamic";
export default function AdminApplicationsPage() { return <AdminShell active="applications"><div className="admin-top"><div><h1>Applications</h1><p>Your database-backed applicant tracking system.</p></div></div><AdminApplicationsClient /></AdminShell>; }
