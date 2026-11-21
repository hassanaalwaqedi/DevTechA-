import type {
  EmployeeInvitationSummary,
  InvitationDeliveryStatus,
} from "@/lib/intelligence/types";
import type { AccessScope, PermissionAction, PermissionModule, RoleKey } from "@/lib/rbac";

export interface CreatedInvite {
  employeeName: string;
  employeeEmail: string;
  roleLabel: string;
  activationUrl: string;
  expiresAt: string;
  deliveryStatus: InvitationDeliveryStatus;
  emailProvider?: string | null;
  providerMessageId?: string | null;
  deliveryError?: string | null;
  sentAt?: string | null;
}

export function describeInvitationDelivery(
  inv?: EmployeeInvitationSummary | null,
  employeeStatus?: "invited" | "active" | "suspended"
): {
  label: string;
  tone: "emerald" | "blue" | "amber" | "rose" | "neutral";
  detail?: string;
} {
  if (employeeStatus === "active") {
    return { label: "Activated", tone: "emerald" };
  }
  if (!inv) {
    return { label: "Pending Activation", tone: "amber" };
  }
  if (inv.consumedAt) {
    return { label: "Activated", tone: "emerald" };
  }
  const isExpired = new Date(inv.expiresAt).getTime() < Date.now();
  if (isExpired) {
    return {
      label: "Expired",
      tone: "rose",
      detail: "48h activation window expired — resend to issue a fresh link.",
    };
  }
  switch (inv.deliveryStatus) {
    case "delivered":
      return {
        label: "Delivered",
        tone: "emerald",
        detail: inv.deliveredAt
          ? `Confirmed by provider webhook (${formatLocalTimestamp(inv.deliveredAt)})`
          : "Confirmed by provider webhook",
      };
    case "accepted_by_provider":
      return {
        label: "Accepted by Provider",
        tone: "blue",
        detail: inv.providerMessageId
          ? `Resend ID: ${inv.providerMessageId}`
          : "Accepted by Resend (awaiting delivery webhook)",
      };
    case "bounced":
      return {
        label: "Bounced",
        tone: "rose",
        detail: inv.deliveryError || "Recipient mail server bounced the invitation.",
      };
    case "complained":
      return {
        label: "Spam Complaint",
        tone: "rose",
        detail: inv.deliveryError || "Marked as spam by recipient.",
      };
    case "delivery_failed":
      return {
        label: "Delivery Failed",
        tone: "rose",
        detail: inv.deliveryError || "Email provider rejected or could not send.",
      };
    case "sending":
      return { label: "Sending", tone: "blue" };
    default:
      return { label: "Invitation Created", tone: "amber" };
  }
}

export const SCOPE_METADATA: Record<
  AccessScope,
  { label: string; short: string; description: string }
> = {
  own: {
    label: "Own Records",
    short: "Own",
    description: "Records owned by, created by, or directly assigned to this employee.",
  },
  assigned: {
    label: "Assigned Records",
    short: "Assigned",
    description: "Records explicitly assigned to or owned by this employee.",
  },
  team: {
    label: "Team / Department",
    short: "Team",
    description: "Records belonging to this employee's department plus their own assigned items.",
  },
  all: {
    label: "All Organization",
    short: "All",
    description: "All records across HIRZEXA permitted by this employee's module permissions.",
  },
};

export const MODULE_LABELS: Record<PermissionModule, string> = {
  dashboard: "Command Center",
  crm: "Sales CRM",
  bookings: "Bookings",
  recruitment: "Recruitment",
  interviews: "Interviews",
  jobs: "Jobs",
  products: "Products",
  demonstrations: "Interactive Demos",
  tasks: "Tasks",
  team: "Team & RBAC",
  audit: "Audit Logs",
  agent: "AI Agent",
  settings: "Settings",
};

export const ACTION_LABELS: Record<PermissionAction, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  assign: "Assign",
  export: "Export",
  manage: "Manage",
};

export function getInitials(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "EM";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function roleBadgeTone(roleKey: RoleKey): "violet" | "blue" | "emerald" | "amber" | "neutral" {
  if (roleKey === "super_admin") return "violet";
  if (roleKey === "administrator" || roleKey === "sales_manager" || roleKey === "hr_manager") {
    return "blue";
  }
  if (roleKey === "engineer" || roleKey === "project_manager") return "emerald";
  if (roleKey === "marketing_intern") return "amber";
  return "neutral";
}

export function formatLocalTimestamp(iso: string | null | undefined): string {
  if (!iso) return "Pending first login";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Pending first login";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}
