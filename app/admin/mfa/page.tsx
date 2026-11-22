import { redirect } from "next/navigation";
import { getAuthenticatedAdminSession } from "@/lib/auth";
import { sanitizeAdminNextPath } from "@/lib/mfa";
import { AdminMfaClient } from "@/components/admin-mfa-client";

export const dynamic = "force-dynamic";

export default async function AdminMfaPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getAuthenticatedAdminSession({ allowPendingMfa: true });
  if (!session) {
    redirect("/admin/login");
  }
  const params = await searchParams;
  const safeNext = sanitizeAdminNextPath(params.next);

  return <AdminMfaClient nextPath={safeNext} />;
}
