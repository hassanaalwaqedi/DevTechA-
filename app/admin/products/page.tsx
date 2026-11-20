import { AdminProductsClient } from "@/components/admin-products-client";
import { AdminShell } from "@/components/admin-shell";
import { PageHeader, StatusBadge } from "@/components/admin-ui/primitives";
import { requirePermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  await requirePermission("products", "view");
  return (
    <AdminShell active="products">
      <PageHeader
        eyebrow="Portfolio CMS"
        title="Products & Systems"
        description="Manage the engineering products and AI platforms published across HIRZEXA."
        actions={<StatusBadge tone="violet">Public Catalog</StatusBadge>}
      />
      <AdminProductsClient />
    </AdminShell>
  );
}
