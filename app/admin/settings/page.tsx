import { AdminSettingsClient } from "@/components/admin-settings-client";
import { AdminShell } from "@/components/admin-shell";
import { requirePermission } from "@/lib/auth";
import { findEmployeeByAuthOrEmail } from "@/lib/intelligence/employees";
import { hasPermission } from "@/lib/rbac";
import { getSettingsDiagnosticsSnapshot } from "@/lib/settings/diagnostics";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const { actor } = await requirePermission("settings", "view");
  const [employee, snapshot] = await Promise.all([
    findEmployeeByAuthOrEmail(actor.id, actor.email),
    getSettingsDiagnosticsSnapshot(actor),
  ]);

  return (
    <AdminShell active="settings">
      <AdminSettingsClient
        initialSnapshot={snapshot}
        canEditSettings={hasPermission(actor, "settings", "edit")}
        actorProfile={{
          fullName: employee?.fullName || actor.fullName,
          jobTitle: employee?.jobTitle || actor.roleLabel,
          department: employee?.department || actor.department,
          email: actor.email,
          roleLabel: actor.roleLabel,
          scope: actor.scope,
          mfaEnrolled: actor.mfaEnrolled,
          sessionVersion: actor.sessionVersion,
        }}
      />
    </AdminShell>
  );
}
