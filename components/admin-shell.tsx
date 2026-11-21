import { requireAdmin } from "@/lib/auth";
import { getWorkspaceProfileForActor } from "@/lib/authorization";
import { listBusinessEvents } from "@/lib/intelligence/events";
import { listRegisteredToolsMetadata } from "@/lib/intelligence/tools";
import { hasPermission } from "@/lib/rbac";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import {
  AdminShellChrome,
  type ShellNavGroup,
  type ShellNotification,
} from "@/components/admin-shell-chrome";
import type { AgentToolInspectorItem } from "@/components/admin-agent-workspace";

export async function AdminShell({
  children,
  active,
}: {
  children: React.ReactNode;
  active: string;
}) {
  const { actor } = await requireAdmin();
  const workspace = getWorkspaceProfileForActor(actor);

  const primary: ShellNavGroup["items"] = [];
  if (hasPermission(actor, "dashboard", "view")) {
    primary.push({
      id: "overview",
      label: workspace.navLabelEn,
      href: "/admin",
      icon: "overview",
    });
  }
  if (hasPermission(actor, "agent", "view")) {
    primary.push({ id: "agent", label: "AI Agent & Voice", href: "/admin/agent", icon: "agent" });
  }
  if (hasPermission(actor, "crm", "view") || hasPermission(actor, "bookings", "view")) {
    primary.push({ id: "crm", label: "Sales CRM", href: "/admin/crm", icon: "crm" });
  }
  if (hasPermission(actor, "recruitment", "view")) {
    primary.push({
      id: "applications",
      label: "Recruitment",
      href: "/admin/applications",
      icon: "applications",
    });
  }
  if (hasPermission(actor, "interviews", "view")) {
    primary.push({
      id: "interviews",
      label: "Interviews",
      href: "/admin/interviews",
      icon: "interviews",
    });
  }
  if (hasPermission(actor, "jobs", "view")) {
    primary.push({ id: "jobs", label: "Jobs", href: "/admin/jobs", icon: "jobs" });
  }
  if (hasPermission(actor, "products", "view")) {
    primary.push({ id: "products", label: "Products", href: "/admin/products", icon: "products" });
  }

  const management: ShellNavGroup["items"] = [];
  if (hasPermission(actor, "demonstrations", "view")) {
    management.push({
      id: "demonstrations",
      label: "Interactive Demos",
      href: "/admin/website/demonstrations",
      icon: "demonstrations",
    });
  }
  if (hasPermission(actor, "team", "view")) {
    management.push({
      id: "team",
      label: "Team & RBAC",
      href: "/admin/team",
      icon: "team",
    });
  }
  if (hasPermission(actor, "audit", "view")) {
    management.push({
      id: "audit",
      label: "Audit Logs",
      href: "/admin/audit",
      icon: "audit",
    });
  }

  const system: ShellNavGroup["items"] = [];
  if (hasPermission(actor, "settings", "view")) {
    system.push({ id: "settings", label: "Settings", href: "/admin/settings", icon: "settings" });
  }

  const navGroups: ShellNavGroup[] = [
    ...(primary.length > 0 ? [{ label: "Primary", items: primary }] : []),
    ...(management.length > 0 ? [{ label: "Management", items: management }] : []),
    ...(system.length > 0 ? [{ label: "System", items: system }] : []),
  ];

  // Real authorized business events for top-bar notifications (zero fabricated data)
  const rawEvents = await listBusinessEvents(actor, { limit: 8 }).catch(() => []);
  const notifications: ShellNotification[] = rawEvents.map((evt) => ({
    id: evt.id,
    title: evt.title,
    summary: evt.summary,
    href: evt.sourceHref,
    severity: evt.severity,
    module: evt.module,
    createdAt: evt.createdAt,
  }));

  const envStatus = isSupabaseConfigured()
    ? process.env.NODE_ENV === "production"
      ? "Production"
      : "Supabase Live"
    : "Local Mode";

  const agentTools: AgentToolInspectorItem[] = listRegisteredToolsMetadata().map((t) => ({
    ...t,
    allowed: hasPermission(actor, t.module, t.action),
  }));

  return (
    <AdminShellChrome
      active={active}
      navGroups={navGroups}
      notifications={notifications}
      canUseAgent={hasPermission(actor, "agent", "view")}
      canViewCrm={hasPermission(actor, "crm", "view") || hasPermission(actor, "bookings", "view")}
      canViewAudit={hasPermission(actor, "audit", "view")}
      canViewSettings={hasPermission(actor, "settings", "view")}
      canManageTeam={hasPermission(actor, "team", "manage")}
      searchPlaceholder={workspace.searchPlaceholderEn}
      agentTools={agentTools}
      envStatus={envStatus}
      actor={{
        fullName: actor.fullName,
        email: actor.email,
        roleLabel: actor.roleLabel,
        scope: actor.scope,
        mfaEnrolled: actor.mfaEnrolled,
      }}
    >
      {children}
    </AdminShellChrome>
  );
}
