import { AdminDemonstrationsClient } from "@/components/admin-demonstrations-client";
import { AdminShell } from "@/components/admin-shell";
import { getDemoConfigEnvelope } from "@/lib/demo-config";

export const dynamic = "force-dynamic";

export default async function AdminInteractiveDemonstrationsPage() {
  const envelope = await getDemoConfigEnvelope();

  return (
    <AdminShell active="demonstrations">
      <div className="admin-top">
        <div>
          <h1>Interactive Demonstrations</h1>
          <p>
            Admin → Website → Interactive Demonstrations. Manage homepage architecture
            simulations, scenarios, step ordering, nodes, connections, speed, and
            localized English/Arabic content—preview drafts before publishing live.
          </p>
        </div>
        <span className="eyebrow">Website · Live Config</span>
      </div>
      <AdminDemonstrationsClient initialEnvelope={envelope} />
    </AdminShell>
  );
}
