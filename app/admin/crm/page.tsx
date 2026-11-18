import { AdminCrmClient } from "@/components/admin-crm-client";
import { AdminShell } from "@/components/admin-shell";
import { listCrmLeads } from "@/lib/crm";

export const dynamic = "force-dynamic";

export default async function AdminCrmPage() {
  const leads = await listCrmLeads();

  return (
    <AdminShell active="crm">
      <div className="admin-top">
        <div>
          <h1>Sales CRM</h1>
          <p>
            Manage discovery call bookings, proposal requests, pipeline stages,
            consent records, and follow-up history.
          </p>
        </div>
        <span className="eyebrow">B2B Pipeline</span>
      </div>
      <AdminCrmClient initialLeads={leads} />
    </AdminShell>
  );
}
