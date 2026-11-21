import "server-only";

export interface ExternalCalendarStatus {
  provider: "google_calendar";
  configured: boolean;
  connected: boolean;
  message: string;
}

export interface ExternalCalendarEventResult {
  synced: boolean;
  provider?: "google_calendar";
  eventId?: string;
  meetingUrl?: string | null;
  reason?: string;
}

/**
 * Optional Google Calendar adapter.
 * HIRZEXA Interview Scheduling operates natively on its own PostgreSQL database
 * without requiring Google Calendar. When Google OAuth client credentials and an
 * employee's explicitly consented refresh token are not present, this adapter
 * truthfully reports `connected: false` and NEVER generates fictional Meet links.
 */
export function getGoogleCalendarIntegrationStatus(): ExternalCalendarStatus {
  const hasClientConfig = Boolean(
    process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim()
  );

  if (!hasClientConfig) {
    return {
      provider: "google_calendar",
      configured: false,
      connected: false,
      message:
        "External Google Calendar synchronization is not connected. HIRZEXA internal scheduling, conflict prevention, and .ics calendar invites are active.",
    };
  }

  return {
    provider: "google_calendar",
    configured: true,
    connected: false,
    message:
      "Google OAuth credentials detected. Connect an interviewer calendar with explicit consent to enable free/busy sync and verified Google Meet creation.",
  };
}

export const getExternalCalendarAdapterStatus = getGoogleCalendarIntegrationStatus;

export async function syncExternalCalendarEvent(params: {
  action: "create" | "update" | "cancel";
  interviewerEmployeeId: string;
  summary: string;
  startUtc: string;
  endUtc: string;
  attendees: string[];
  existingEventId?: string | null;
}): Promise<ExternalCalendarEventResult> {
  void params;
  const status = getGoogleCalendarIntegrationStatus();
  if (!status.connected) {
    return {
      synced: false,
      meetingUrl: null,
      reason: status.message,
    };
  }
  return { synced: false, meetingUrl: null, reason: "External calendar token not linked." };
}
