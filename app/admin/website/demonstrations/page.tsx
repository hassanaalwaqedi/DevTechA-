import { AdminDemonstrationsClient } from "@/components/admin-demonstrations-client";
import { AdminShell } from "@/components/admin-shell";
import { requirePermission } from "@/lib/auth";
import { getDemoConfigEnvelope } from "@/lib/demo-config";

export const dynamic = "force-dynamic";

export default async function AdminInteractiveDemonstrationsPage() {
  await requirePermission("demonstrations", "view");
  const envelope = await getDemoConfigEnvelope();

  return (
    <AdminShell active="demonstrations">
      <AdminDemonstrationsClient initialEnvelope={envelope} />
    </AdminShell>
  );
}
