import type { CrmLeadRecord, CrmStage } from "@/lib/crm-types";

export interface OwnerOption {
  id: string;
  email: string;
  fullName: string;
  roleKey: string;
}

export type CrmWorkspaceTab = "list" | "board" | "companies" | "contacts" | "tasks";

export type QualityFilter = "all" | "genuine" | "review";

export interface LeadQualityStatus {
  kind: "genuine" | "suspected_test" | "possible_duplicate" | "incomplete";
  label: string;
  reason?: string;
}

export function stageTone(
  stage: CrmStage
): "blue" | "violet" | "emerald" | "amber" | "rose" | "neutral" {
  switch (stage) {
    case "won":
      return "emerald";
    case "lost":
      return "rose";
    case "negotiation":
      return "violet";
    case "proposal_sent":
      return "amber";
    case "meeting_booked":
    case "discovery_completed":
      return "blue";
    default:
      return "neutral";
  }
}

export function getInitials(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "HZ";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getMonogramColor(seed: string): string {
  const palette = [
    "linear-gradient(135deg, #2563EB, #4F46E5)",
    "linear-gradient(135deg, #7C3AED, #6366F1)",
    "linear-gradient(135deg, #0284C7, #2563EB)",
    "linear-gradient(135deg, #059669, #0D9488)",
    "linear-gradient(135deg, #D97706, #EA580C)",
    "linear-gradient(135deg, #4F46E5, #9333EA)",
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return palette[Math.abs(hash) % palette.length];
}

export function formatLocalDateTime(
  iso: string | null | undefined,
  opts?: { includeTime?: boolean }
): { dateLabel: string; timeLabel: string } {
  if (!iso) return { dateLabel: "Not scheduled", timeLabel: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { dateLabel: "Not scheduled", timeLabel: "" };

  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow =
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate();

  const dateLabel = sameDay
    ? "Today"
    : isTomorrow
    ? "Tomorrow"
    : new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(d);

  const timeLabel =
    opts?.includeTime === false
      ? ""
      : new Intl.DateTimeFormat(undefined, {
          hour: "numeric",
          minute: "2-digit",
          timeZoneName: "short",
        }).format(d);

  return { dateLabel, timeLabel };
}

export function formatRelativeAge(iso: string): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return "just now";
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/**
 * Non-destructive data quality classification.
 * Flags suspected test submissions, possible duplicates (matching email + company),
 * or incomplete records strictly for safe admin review — never hides or deletes records.
 */
export function buildQualityMap(leads: CrmLeadRecord[]): Map<string, LeadQualityStatus> {
  const emailCompanyCounts = new Map<string, number>();
  for (const lead of leads) {
    const key = `${lead.email.trim().toLowerCase()}::${lead.company.trim().toLowerCase()}`;
    emailCompanyCounts.set(key, (emailCompanyCounts.get(key) || 0) + 1);
  }

  const result = new Map<string, LeadQualityStatus>();
  for (const lead of leads) {
    const email = lead.email.trim().toLowerCase();
    const company = lead.company.trim().toLowerCase();
    const fullName = lead.fullName.trim().toLowerCase();
    const summary = (lead.projectSummary || "").toLowerCase();

    const looksTest =
      email.includes("example.com") ||
      email.includes("+test") ||
      email.startsWith("verify") ||
      email.startsWith("test") ||
      company.includes("verification") ||
      company.includes("e2e test") ||
      fullName.includes("test user") ||
      summary.includes("automated verification") ||
      (lead.notes || "").toLowerCase().includes("[test-record]");

    if (looksTest) {
      result.set(lead.id, {
        kind: "suspected_test",
        label: "Suspected Test",
        reason: "Matches test/verification email or company pattern. Review safely before archiving.",
      });
      continue;
    }

    const dupKey = `${email}::${company}`;
    if ((emailCompanyCounts.get(dupKey) || 0) > 1) {
      result.set(lead.id, {
        kind: "possible_duplicate",
        label: "Duplicate Check",
        reason: "Another record shares this exact contact email and company name.",
      });
      continue;
    }

    if (!lead.company.trim() || !lead.projectSummary.trim() || lead.projectSummary.trim().length < 10) {
      result.set(lead.id, {
        kind: "incomplete",
        label: "Incomplete",
        reason: "Missing company name or detailed project scope.",
      });
      continue;
    }

    result.set(lead.id, { kind: "genuine", label: "Verified" });
  }

  return result;
}
