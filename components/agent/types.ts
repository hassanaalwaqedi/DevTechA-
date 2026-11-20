export interface AgentToolInspectorItem {
  name: string;
  description: string;
  module: string;
  action: string;
  requiresConfirmation: boolean;
  allowed: boolean;
}

export type VoiceState = "idle" | "listening" | "processing" | "speaking";

export type ConversationMode =
  | "executive"
  | "sales"
  | "recruitment"
  | "operations";

export type ContextSourceFilter =
  | "all"
  | "crm"
  | "bookings"
  | "recruitment"
  | "tasks";

export interface DomainCapability {
  id: string;
  label: string;
  description: string;
  icon: "crm" | "bookings" | "recruitment" | "analytics" | "communications" | "tasks";
  authorized: boolean;
  requiresApproval?: boolean;
  toolCount: number;
}
