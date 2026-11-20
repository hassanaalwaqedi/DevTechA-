import { AdminAgentWorkspace } from "@/components/admin-agent-workspace";
import { AdminShell } from "@/components/admin-shell";
import { requirePermission } from "@/lib/auth";
import { listActorConversations } from "@/lib/intelligence/agent";
import { listRegisteredToolsMetadata } from "@/lib/intelligence/tools";
import { hasPermission } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function AdminAgentPage() {
  const { actor } = await requirePermission("agent", "view");
  const conversations = await listActorConversations(actor);
  const tools = listRegisteredToolsMetadata().map((tool) => ({
    ...tool,
    allowed: hasPermission(actor, tool.module, tool.action),
  }));

  return (
    <AdminShell active="agent">
      <AdminAgentWorkspace
        initialConversations={conversations}
        pageContext={{ route: "/admin/agent", entityType: "dashboard" }}
        actorInfo={{
          fullName: actor.fullName,
          roleLabel: actor.roleLabel,
          scope: actor.scope,
        }}
        canManageTeam={hasPermission(actor, "team", "view")}
        tools={tools}
      />
    </AdminShell>
  );
}
