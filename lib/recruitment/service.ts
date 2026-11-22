import "server-only";
import { createHash, randomInt, randomUUID } from "node:crypto";
import type { Application, CandidateSource } from "@/lib/data";
import { getApplications } from "@/lib/db";
import {
  isResendConfigured,
  OFFICIAL_WEBSITE_URL,
  resolvePublicInvitationBaseUrl,
  sendTransactionalEmail,
  validateOutboundEmailContent,
} from "@/lib/email/transactional";
import { recordAuditLog } from "@/lib/intelligence/audit";
import { emitBusinessEvent } from "@/lib/intelligence/events";
import {
  isLocalFallbackAllowed,
  readLocalCollection,
  writeLocalCollection,
} from "@/lib/intelligence/store";
import {
  listAuthorizedInterviewAppointments,
  listAuthorizedInterviewInvitations,
  listInterviewActivity,
} from "@/lib/interviews/service";
import { checkRateLimit } from "@/lib/rate-limit";
import { hasPermission, type AuthActor } from "@/lib/rbac";
import { buildRecruitmentEmail } from "@/lib/recruitment/email-templates";
import {
  CANDIDATE_SOURCES,
  RECRUITMENT_DELIVERY_LABELS,
  RECRUITMENT_MESSAGE_TYPES,
  RECRUITMENT_MESSAGE_TYPE_LABELS,
  type CandidateDuplicateMatch,
  type RecruitmentCommunicationRecord,
  type RecruitmentDeliveryStatus,
  type RecruitmentMessageType,
  type UnifiedCandidateTimelineItem,
} from "@/lib/recruitment/types";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createPrivilegedOrServerSupabaseClient } from "@/lib/supabase/service-role";
import { validateCv } from "@/lib/validation";

const COL_EXTERNAL_CANDIDATES = "recruitment-external-candidates";
const COL_RECRUITMENT_COMMS = "recruitment-communications";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SINGLE_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function isUuid(value: string | null | undefined): value is string {
  return Boolean(value && UUID_REGEX.test(value.trim()));
}

function resolveAuthUserUuid(actor: AuthActor): string | null {
  return isUuid(actor.id) ? actor.id.trim() : null;
}

function resolveEmployeeUuid(actor: AuthActor): string | null {
  return isUuid(actor.employeeId) ? actor.employeeId.trim() : null;
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidSingleEmail(raw: string): boolean {
  const cleaned = raw.trim();
  if (!cleaned || cleaned.length > 254) return false;
  if (/[,;\s]/.test(cleaned)) return false;
  return SINGLE_EMAIL_REGEX.test(cleaned);
}

function getSafeBaseUrl(): string {
  const resolved = resolvePublicInvitationBaseUrl();
  if (resolved.ok && resolved.baseUrl) return resolved.baseUrl;
  return OFFICIAL_WEBSITE_URL;
}

function mapCommunicationRow(row: Record<string, unknown>): RecruitmentCommunicationRecord {
  return {
    id: String(row.id),
    recipientEmail: String(row.recipient_email),
    recipientName: row.recipient_name ? String(row.recipient_name) : null,
    applicationId: row.application_id ? String(row.application_id) : null,
    applicationReferenceId: row.application_reference_id
      ? String(row.application_reference_id)
      : null,
    interviewInvitationId: row.interview_invitation_id
      ? String(row.interview_invitation_id)
      : null,
    messageType: String(row.message_type) as RecruitmentMessageType,
    locale: row.locale === "ar" ? "ar" : "en",
    subject: String(row.subject),
    bodyText: String(row.body_text || ""),
    bodyHtmlSafe: String(row.body_html_safe || ""),
    senderAuthUserId: row.sender_auth_user_id ? String(row.sender_auth_user_id) : null,
    senderEmployeeId: row.sender_employee_id ? String(row.sender_employee_id) : null,
    senderEmail: String(row.sender_email),
    senderName: String(row.sender_name),
    idempotencyKey: String(row.idempotency_key),
    provider: String(row.provider || "resend"),
    providerMessageId: row.provider_message_id ? String(row.provider_message_id) : null,
    deliveryStatus: String(row.delivery_status || "draft") as RecruitmentDeliveryStatus,
    lastWebhookEvent: row.last_webhook_event ? String(row.last_webhook_event) : null,
    errorDetail: row.error_detail ? String(row.error_detail) : null,
    sentAt: row.sent_at ? String(row.sent_at) : null,
    deliveredAt: row.delivered_at ? String(row.delivered_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

// ============================================================================
// 1. Authorized Applications & Deduplication
// ============================================================================

export async function listAllAuthorizedCandidates(
  actor: AuthActor,
  filters?: { status?: string; query?: string; source?: string }
): Promise<Application[]> {
  if (!hasPermission(actor, "recruitment", "view")) return [];

  if (isSupabaseConfigured()) {
    return getApplications(filters);
  }

  if (isLocalFallbackAllowed()) {
    let list = await readLocalCollection<Application>(COL_EXTERNAL_CANDIDATES);
    if (filters?.status && filters.status !== "all" && filters.status !== "All statuses") {
      list = list.filter((a) => a.status === filters.status);
    }
    if (filters?.source && filters.source !== "all") {
      list = list.filter((a) => (a.source || "website") === filters.source);
    }
    if (filters?.query?.trim()) {
      const q = filters.query.trim().toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          a.id.toLowerCase().includes(q) ||
          a.jobTitle.toLowerCase().includes(q)
      );
    }
    return list;
  }

  return [];
}

export async function findDuplicateCandidates(
  actor: AuthActor,
  params: { email: string; jobId?: string | null }
): Promise<CandidateDuplicateMatch[]> {
  if (!hasPermission(actor, "recruitment", "view")) return [];
  const normalized = normalizeEmail(params.email);
  if (!isValidSingleEmail(normalized)) return [];

  const targetJobId = params.jobId?.trim() || "";
  const all = await listAllAuthorizedCandidates(actor, { query: normalized });
  const exactEmailMatches = all.filter((item) => normalizeEmail(item.email) === normalized);

  return exactEmailMatches.map((item) => ({
    referenceId: item.id,
    dbId: item.dbId,
    fullName: item.name,
    email: item.email,
    jobId: item.jobId,
    jobTitle: item.jobTitle,
    source: item.source || "website",
    status: item.status,
    createdAt: item.createdAt,
    isExactJobMatch: targetJobId
      ? item.jobId === targetJobId
      : Boolean(item.isExternalProspect || !item.jobId),
  }));
}

// ============================================================================
// 2. Add External Candidate (LinkedIn, Referral, Email, Prospect, Optional CV)
// ============================================================================

export interface CreateExternalCandidateInput {
  fullName: string;
  email: string;
  phone?: string | null;
  jobId?: string | null;
  customPositionTitle?: string | null;
  source: CandidateSource;
  linkedinUrl?: string | null;
  location?: string | null;
  country?: string | null;
  currentRole?: string | null;
  experience?: string | null;
  internalNotes?: string | null;
  cvFile?: File | null;
  dedupeAction?: "check" | "merge" | "create_separate";
  mergeTargetReferenceId?: string | null;
}

export async function createExternalCandidate(
  actor: AuthActor,
  input: CreateExternalCandidateInput
): Promise<{
  ok: boolean;
  candidate?: Application;
  merged?: boolean;
  duplicateDetected?: boolean;
  duplicates?: CandidateDuplicateMatch[];
  error?: string;
}> {
  if (
    !hasPermission(actor, "recruitment", "create") &&
    !hasPermission(actor, "recruitment", "edit")
  ) {
    return { ok: false, error: "Forbidden: insufficient recruitment permission to add candidates." };
  }

  const fullName = input.fullName.trim();
  if (fullName.length < 2 || fullName.length > 140) {
    return { ok: false, error: "Full name must be between 2 and 140 characters." };
  }

  const email = normalizeEmail(input.email);
  if (!isValidSingleEmail(email)) {
    return { ok: false, error: "Please provide a valid candidate email address." };
  }

  const source: CandidateSource = CANDIDATE_SOURCES.includes(input.source)
    ? input.source
    : "linkedin";

  // Validate optional LinkedIn URL strictly
  let linkedinUrl: string | null = null;
  if (input.linkedinUrl?.trim()) {
    const candidateUrl = input.linkedinUrl.trim().startsWith("http")
      ? input.linkedinUrl.trim()
      : `https://${input.linkedinUrl.trim()}`;
    try {
      const parsed = new URL(candidateUrl);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return { ok: false, error: "LinkedIn Profile URL must start with https://." };
      }
      linkedinUrl = parsed.toString();
    } catch {
      return { ok: false, error: "LinkedIn Profile URL is not a valid URL." };
    }
  }

  // Validate optional CV file using existing recruitment CV validation rules
  if (input.cvFile && input.cvFile.size > 0) {
    try {
      await validateCv(input.cvFile);
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Invalid CV file format or size.",
      };
    }
  }

  // Resolve real company job if selected
  let resolvedJobId: string | null = null;
  let resolvedJobTitle = input.customPositionTitle?.trim() || "";
  let isExternalProspect = true;

  if (input.jobId && input.jobId.trim() && input.jobId.trim() !== "__prospect__") {
    const requestedJobId = input.jobId.trim();
    if (isSupabaseConfigured()) {
      const supabase = await createSupabaseServerClient();
      const { data: jobRow, error: jobErr } = await supabase
        .from("jobs")
        .select("id, title")
        .eq("id", requestedJobId)
        .maybeSingle();
      if (jobErr || !jobRow) {
        return { ok: false, error: "Selected company job record was not found." };
      }
      resolvedJobId = String(jobRow.id);
      resolvedJobTitle = String(jobRow.title);
      isExternalProspect = false;
    } else {
      resolvedJobId = requestedJobId;
      resolvedJobTitle = resolvedJobTitle || "Company Role";
      isExternalProspect = false;
    }
  }

  // Deduplication check by normalized email & job identity
  const duplicates = await findDuplicateCandidates(actor, { email, jobId: resolvedJobId });
  const dedupeAction = input.dedupeAction || "check";

  if (duplicates.length > 0 && dedupeAction === "check") {
    return {
      ok: false,
      duplicateDetected: true,
      duplicates,
      error:
        "A candidate with this email already exists in Recruitment. Choose whether to update/link the existing record or create a separate application.",
    };
  }

  const createdByUuid = resolveAuthUserUuid(actor);
  const nowIso = new Date().toISOString();
  const safeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "-");

  // Explicit MERGE / LINK into an existing record (only when authorized user explicitly confirms!)
  if (dedupeAction === "merge" && input.mergeTargetReferenceId) {
    const targetRef = input.mergeTargetReferenceId.trim();
    const match = duplicates.find((d) => d.referenceId === targetRef);
    if (!match) {
      return { ok: false, error: "Merge target candidate record was not found." };
    }

    let uploadedCvPath: string | null = null;
    if (input.cvFile && input.cvFile.size > 0 && isSupabaseConfigured()) {
      const supabase = await createSupabaseServerClient();
      const folder = `${resolvedJobId || "external"}/${targetRef}`;
      uploadedCvPath = `${folder}/cv-${safeFileName(input.cvFile.name)}`;
      const upload = await supabase.storage
        .from("cvs")
        .upload(uploadedCvPath, input.cvFile, { contentType: input.cvFile.type, upsert: true });
      if (upload.error) {
        return { ok: false, error: `Failed to upload CV: ${upload.error.message}` };
      }
    }

    const mergeNoteLine = input.internalNotes?.trim()
      ? `[${nowIso.slice(0, 10)} · ${actor.fullName} · ${source}] ${input.internalNotes.trim()}`
      : null;

    if (isSupabaseConfigured()) {
      const supabase = await createSupabaseServerClient();
      const { data: existingRow, error: fetchErr } = await supabase
        .from("job_applications")
        .select("*")
        .eq("reference_id", targetRef)
        .maybeSingle();
      if (fetchErr || !existingRow) {
        return { ok: false, error: "Unable to load existing candidate record for merge." };
      }

      const patch: Record<string, unknown> = {};
      if (input.phone?.trim() && !existingRow.phone) patch.phone = input.phone.trim();
      if (linkedinUrl && !existingRow.linkedin_url) patch.linkedin_url = linkedinUrl;
      if (input.location?.trim() && (!existingRow.current_location || existingRow.current_location === "Not specified")) {
        patch.current_location = input.location.trim();
      }
      if (input.country?.trim() && (!existingRow.country || existingRow.country === "Not specified")) {
        patch.country = input.country.trim();
      }
      if (uploadedCvPath) patch.cv_path = uploadedCvPath;
      if (resolvedJobId && !existingRow.job_id) {
        patch.job_id = resolvedJobId;
        patch.is_external_prospect = false;
      }
      if (mergeNoteLine) {
        const prevNotes = existingRow.internal_notes ? String(existingRow.internal_notes) : "";
        patch.internal_notes = prevNotes ? `${prevNotes}\n\n${mergeNoteLine}` : mergeNoteLine;
      }

      if (Object.keys(patch).length > 0) {
        const { error: updErr } = await supabase
          .from("job_applications")
          .update(patch)
          .eq("reference_id", targetRef);
        if (updErr) {
          return { ok: false, error: `Failed to update candidate record: ${updErr.message}` };
        }
      }

      const refreshed = (await getApplications({ query: targetRef })).find((a) => a.id === targetRef);
      await recordAuditLog({
        actorId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.roleKey,
        module: "recruitment",
        action: "recruitment.candidate.merged",
        entityType: "application",
        entityId: targetRef,
        outcome: "allowed",
        summary: `Merged external candidate details (${source}) into existing record ${targetRef}.`,
        metadata: { email, source, resolvedJobId },
      });

      return { ok: true, merged: true, candidate: refreshed };
    }

    if (isLocalFallbackAllowed()) {
      const existing = await readLocalCollection<Application>(COL_EXTERNAL_CANDIDATES);
      let updatedCandidate: Application | undefined;
      const next = existing.map((item) => {
        if (item.id !== targetRef) return item;
        updatedCandidate = {
          ...item,
          phone: item.phone || input.phone?.trim() || undefined,
          linkedin: item.linkedin || linkedinUrl || undefined,
          location: item.location || input.location?.trim() || "",
          country: item.country || input.country?.trim() || "",
          jobId: item.jobId || resolvedJobId || "",
          jobTitle:
            item.jobId || !resolvedJobTitle
              ? item.jobTitle
              : resolvedJobTitle,
          isExternalProspect: item.jobId || resolvedJobId ? false : item.isExternalProspect,
          note: mergeNoteLine
            ? item.note
              ? `${item.note}\n\n${mergeNoteLine}`
              : mergeNoteLine
            : item.note,
        };
        return updatedCandidate;
      });
      await writeLocalCollection(COL_EXTERNAL_CANDIDATES, next);
      await recordAuditLog({
        actorId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.roleKey,
        module: "recruitment",
        action: "recruitment.candidate.merged",
        entityType: "application",
        entityId: targetRef,
        outcome: "allowed",
        summary: `Merged external candidate details (${source}) into ${targetRef}.`,
      });
      return { ok: true, merged: true, candidate: updatedCandidate };
    }
  }

  // Create new external candidate / application record
  const referenceId = `EXT-${new Date().getFullYear()}-${randomInt(10000, 99999)}`;
  let cvPath: string | null = null;
  let cvName = "";

  if (input.cvFile && input.cvFile.size > 0) {
    cvName = safeFileName(input.cvFile.name);
    if (isSupabaseConfigured()) {
      const supabase = await createSupabaseServerClient();
      const folder = `${resolvedJobId || "external"}/${referenceId}`;
      cvPath = `${folder}/cv-${cvName}`;
      const upload = await supabase.storage
        .from("cvs")
        .upload(cvPath, input.cvFile, { contentType: input.cvFile.type, upsert: false });
      if (upload.error) {
        return { ok: false, error: `Failed to upload CV: ${upload.error.message}` };
      }
    }
  }

  const location = input.location?.trim() || "Not specified";
  const country = input.country?.trim() || "Not specified";
  const currentRole = input.currentRole?.trim() || "External Candidate";
  const experience = input.experience?.trim() || "Not specified";
  const internalNotes = input.internalNotes?.trim() || null;

  const newRecord: Application = {
    id: referenceId,
    dbId: randomUUID(),
    name: fullName,
    email,
    phone: input.phone?.trim() || undefined,
    country,
    location,
    linkedin: linkedinUrl || undefined,
    role: currentRole,
    experience,
    technologies: "",
    workAuthorization: "Not specified",
    sponsorshipRequired: false,
    whyJoin: `Added manually from ${source} by ${actor.fullName}.`,
    whyFit: internalNotes || "External candidate profile added for recruitment evaluation.",
    availability: "To be confirmed",
    startDate: "",
    cvName,
    hasCv: Boolean(cvPath || cvName),
    jobId: resolvedJobId || "",
    jobTitle: resolvedJobTitle || "External Prospect (General Talent Pool)",
    status: "new",
    createdAt: nowIso.slice(0, 10),
    note: internalNotes || undefined,
    source,
    isExternalProspect,
    createdByEmail: actor.email,
    emailOptOut: false,
  };

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const insertPayload = {
      id: newRecord.dbId,
      reference_id: referenceId,
      job_id: resolvedJobId,
      full_name: fullName,
      email,
      phone: input.phone?.trim() || null,
      country,
      current_location: location,
      linkedin_url: linkedinUrl,
      cv_path: cvPath,
      current_role: currentRole,
      experience,
      technologies: "External profile",
      work_authorization: "Not specified",
      sponsorship_required: false,
      why_join: newRecord.whyJoin,
      why_fit: newRecord.whyFit,
      availability: "To be confirmed",
      expected_start_date: null,
      consent: true,
      status: "new",
      candidate_source: source,
      is_external_prospect: isExternalProspect,
      custom_position_title: isExternalProspect ? resolvedJobTitle || null : null,
      internal_notes: internalNotes,
      created_by: createdByUuid,
      created_by_email: actor.email,
      email_opt_out: false,
    };

    const { error: insertErr } = await supabase.from("job_applications").insert(insertPayload);
    if (insertErr) {
      // Clean up uploaded CV if DB insert fails
      if (cvPath) {
        try {
          await supabase.storage.from("cvs").remove([cvPath]);
        } catch {}
      }
      const migrationHint = /candidate_source|is_external_prospect|null value in column "(job_id|cv_path|expected_start_date)"/i.test(
        insertErr.message
      )
        ? " Apply supabase/migrations/20261121_external_candidates_and_communications.sql in Supabase SQL Editor first."
        : "";
      return {
        ok: false,
        error: `Database error creating candidate: ${insertErr.message}.${migrationHint}`,
      };
    }
  } else if (isLocalFallbackAllowed()) {
    const existing = await readLocalCollection<Application>(COL_EXTERNAL_CANDIDATES);
    await writeLocalCollection(COL_EXTERNAL_CANDIDATES, [newRecord, ...existing]);
  } else {
    return { ok: false, error: "Storage backend unavailable." };
  }

  await recordAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.roleKey,
    module: "recruitment",
    action: "recruitment.candidate.created",
    entityType: "application",
    entityId: referenceId,
    outcome: "allowed",
    summary: `Added external candidate ${fullName} (${email}) from source "${source}" (${newRecord.jobTitle}).`,
    metadata: {
      source,
      isExternalProspect,
      jobId: resolvedJobId,
      hasCv: Boolean(cvPath || cvName),
    },
  });

  try {
    await emitBusinessEvent({
      eventType: "application.received",
      module: "recruitment",
      severity: "info",
      actorRef: actor.email,
      entityType: "application",
      entityId: referenceId,
      title: `External candidate added: ${fullName} (${source})`,
      summary: `${referenceId} · ${newRecord.jobTitle} · Added by ${actor.fullName}.`,
      sourceHref: `/admin/applications?q=${encodeURIComponent(referenceId)}`,
      idempotencyKey: `ext-cand-${referenceId}`,
    });
  } catch {}

  return { ok: true, candidate: newRecord };
}

// ============================================================================
// 3. Manual Recruitment Email Sending, Idempotency & Communication History
// ============================================================================

export interface SendRecruitmentEmailInput {
  recipientEmail: string;
  recipientName?: string | null;
  applicationReferenceId?: string | null;
  positionTitle?: string | null;
  messageType: RecruitmentMessageType;
  locale?: "en" | "ar";
  subject: string;
  bodyMarkdown: string;
  clientRequestId?: string;
  skipOutboundEmail?: boolean;
}

const UNFILLED_PLACEHOLDER_PATTERNS = [
  /\[Candidate Name\]/i,
  /\[Position\]/i,
  /\[Write your message here\]/i,
  /\[اكتب رسالتك هنا\]/i,
  /preview-token-sample/i,
];

async function findCommunicationByIdempotencyKey(
  key: string
): Promise<RecruitmentCommunicationRecord | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase
        .from("recruitment_communications")
        .select("*")
        .eq("idempotency_key", key)
        .maybeSingle();
      return data ? mapCommunicationRow(data as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  if (isLocalFallbackAllowed()) {
    const all = await readLocalCollection<RecruitmentCommunicationRecord>(COL_RECRUITMENT_COMMS);
    return all.find((c) => c.idempotencyKey === key) || null;
  }
  return null;
}

export async function sendRecruitmentEmail(
  actor: AuthActor,
  input: SendRecruitmentEmailInput
): Promise<{
  ok: boolean;
  idempotent?: boolean;
  communication?: RecruitmentCommunicationRecord;
  delivery?: {
    status: RecruitmentDeliveryStatus;
    messageId?: string;
    error?: string;
    notConfigured?: boolean;
  };
  error?: string;
}> {
  if (
    !hasPermission(actor, "recruitment", "edit") &&
    !hasPermission(actor, "recruitment", "create")
  ) {
    return {
      ok: false,
      error: "Forbidden: insufficient recruitment permission to send candidate emails.",
    };
  }

  if (!RECRUITMENT_MESSAGE_TYPES.includes(input.messageType)) {
    return { ok: false, error: "Unsupported recruitment email type." };
  }

  // Interview invitations MUST go through the real interview scheduling workflow — NEVER manual fake links!
  if (input.messageType === "interview_invitation") {
    return {
      ok: false,
      error:
        "Interview invitations must be sent through the HIRZEXA Interview Scheduling workflow so a real cryptographic booking link and interviewer availability are attached.",
    };
  }

  const recipientEmail = normalizeEmail(input.recipientEmail);
  if (!isValidSingleEmail(recipientEmail)) {
    return {
      ok: false,
      error:
        "Please enter a single valid recipient email address (bulk or comma-separated mass mailings are not permitted).",
    };
  }

  const subject = input.subject.trim();
  const bodyMarkdown = input.bodyMarkdown.trim();
  if (subject.length < 3 || subject.length > 200) {
    return { ok: false, error: "Subject must be between 3 and 200 characters." };
  }
  if (bodyMarkdown.length < 10 || bodyMarkdown.length > 10000) {
    return { ok: false, error: "Message body must be between 10 and 10,000 characters." };
  }

  // Block accidental sends with unfilled template brackets or placeholder tokens
  const combinedInput = `${subject}\n${bodyMarkdown}`;
  if (UNFILLED_PLACEHOLDER_PATTERNS.some((p) => p.test(combinedInput))) {
    return {
      ok: false,
      error:
        "Please replace template placeholder text (such as [Candidate Name], [Position], or [Write your message here]) before sending.",
    };
  }

  // Rate limit per authorized recruiter (prevents abuse / mass campaigns)
  if (!checkRateLimit(`recruitment-email:${actor.id}`, 30, 60 * 60 * 1000)) {
    return {
      ok: false,
      error: "Hourly recruitment email rate limit reached (30 messages/hour). Please wait before sending again.",
    };
  }

  // Idempotency: prevent duplicate sends from repeated clicks or network retries
  const rawReqId =
    input.clientRequestId?.trim() ||
    createHash("sha256")
      .update(`${actor.id}:${recipientEmail}:${subject}:${bodyMarkdown.slice(0, 200)}:${Math.floor(Date.now() / 60000)}`)
      .digest("hex");
  const idempotencyKey = `rec-email-${createHash("sha256").update(`${actor.id}:${rawReqId}`).digest("hex").slice(0, 32)}`;

  const existingIdempotent = await findCommunicationByIdempotencyKey(idempotencyKey);
  if (existingIdempotent) {
    return {
      ok: true,
      idempotent: true,
      communication: existingIdempotent,
      delivery: {
        status: existingIdempotent.deliveryStatus,
        messageId: existingIdempotent.providerMessageId || undefined,
        error: existingIdempotent.errorDetail || undefined,
      },
    };
  }

  // Check linked candidate record (if provided or matched by email) for opt-out / suppression
  let applicationId: string | null = null;
  let applicationReferenceId: string | null = input.applicationReferenceId?.trim() || null;
  let recipientName: string | null = input.recipientName?.trim() || null;
  let positionTitle: string | null = input.positionTitle?.trim() || null;

  const existingMatches = await findDuplicateCandidates(actor, { email: recipientEmail });
  const linkedCandidate = applicationReferenceId
    ? existingMatches.find((m) => m.referenceId === applicationReferenceId) || existingMatches[0]
    : existingMatches[0];

  if (linkedCandidate) {
    if (!applicationReferenceId) applicationReferenceId = linkedCandidate.referenceId;
    if (!recipientName) recipientName = linkedCandidate.fullName;
    if (!positionTitle) positionTitle = linkedCandidate.jobTitle;
    if (isUuid(linkedCandidate.dbId)) applicationId = linkedCandidate.dbId;

    // Respect recipient opt-out / suppression flag
    const allWithOptOut = await listAllAuthorizedCandidates(actor, {
      query: linkedCandidate.referenceId,
    });
    const fullRec = allWithOptOut.find((a) => a.id === linkedCandidate.referenceId);
    if (fullRec?.emailOptOut) {
      return {
        ok: false,
        error:
          "This candidate has opted out of recruitment email communications. Outbound delivery is blocked.",
      };
    }
  }

  const locale: "en" | "ar" = input.locale === "ar" ? "ar" : "en";
  const baseUrl = getSafeBaseUrl();
  const built = buildRecruitmentEmail({
    recipientEmail,
    recipientName,
    positionTitle,
    messageType: input.messageType,
    subject,
    bodyMarkdown,
    locale,
    senderName: actor.fullName,
    publicBaseUrl: baseUrl,
    isSamplePreview: false,
  });

  // Explicit outbound safety check (rejects preview-token-sample, example.com, localhost, onrender.com)
  const safetyCheck = validateOutboundEmailContent(built.template);
  if (!safetyCheck.ok) {
    return {
      ok: false,
      error: safetyCheck.error || "Email content failed outbound safety validation.",
    };
  }

  const nowIso = new Date().toISOString();
  const commRecord: RecruitmentCommunicationRecord = {
    id: randomUUID(),
    recipientEmail,
    recipientName,
    applicationId,
    applicationReferenceId,
    interviewInvitationId: null,
    messageType: input.messageType,
    locale,
    subject,
    bodyText: built.bodyText,
    bodyHtmlSafe: built.bodyHtmlSafe,
    senderAuthUserId: resolveAuthUserUuid(actor),
    senderEmployeeId: resolveEmployeeUuid(actor),
    senderEmail: actor.email,
    senderName: actor.fullName,
    idempotencyKey,
    provider: "resend",
    providerMessageId: null,
    deliveryStatus: "queued",
    lastWebhookEvent: null,
    errorDetail: null,
    sentAt: null,
    deliveredAt: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  // STEP 1 (Persist-First Transactional Reliability): Persist communication record BEFORE calling Resend
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { error: insErr } = await supabase.from("recruitment_communications").insert({
      id: commRecord.id,
      recipient_email: commRecord.recipientEmail,
      recipient_name: commRecord.recipientName,
      application_id: commRecord.applicationId,
      application_reference_id: commRecord.applicationReferenceId,
      interview_invitation_id: null,
      message_type: commRecord.messageType,
      locale: commRecord.locale,
      subject: commRecord.subject,
      body_text: commRecord.bodyText,
      body_html_safe: commRecord.bodyHtmlSafe,
      sender_auth_user_id: commRecord.senderAuthUserId,
      sender_employee_id: commRecord.senderEmployeeId,
      sender_email: commRecord.senderEmail,
      sender_name: commRecord.senderName,
      idempotency_key: commRecord.idempotencyKey,
      provider: "resend",
      delivery_status: "queued",
      created_at: commRecord.createdAt,
      updated_at: commRecord.updatedAt,
    });
    if (insErr) {
      const migrationHint = /recruitment_communications/i.test(insErr.message)
        ? " Apply supabase/migrations/20261121_external_candidates_and_communications.sql in Supabase SQL Editor first."
        : "";
      return {
        ok: false,
        error: `Database error recording communication: ${insErr.message}.${migrationHint}`,
      };
    }
  } else if (isLocalFallbackAllowed()) {
    const existing = await readLocalCollection<RecruitmentCommunicationRecord>(COL_RECRUITMENT_COMMS);
    await writeLocalCollection(COL_RECRUITMENT_COMMS, [commRecord, ...existing]);
  } else {
    return { ok: false, error: "Storage backend unavailable." };
  }

  // STEP 2: Deliver through existing verified Resend infrastructure
  let deliveryStatus: RecruitmentDeliveryStatus = "queued";
  let providerMessageId: string | null = null;
  let errorDetail: string | null = null;
  let sentAt: string | null = null;
  let notConfigured = false;

  if (input.skipOutboundEmail) {
    deliveryStatus = "accepted_by_provider";
    providerMessageId = `sim_${commRecord.id.slice(0, 12)}`;
    sentAt = nowIso;
  } else {
    const sendRes = await sendTransactionalEmail(built.template, {
      idempotencyKey,
      tags: [
        { name: "category", value: `recruitment_${input.messageType}` },
        { name: "communication_id", value: commRecord.id },
      ],
    });
    deliveryStatus = sendRes.status;
    providerMessageId = sendRes.messageId || null;
    errorDetail = sendRes.error || null;
    sentAt = sendRes.sentAt || null;
    notConfigured = Boolean(sendRes.notConfigured);
  }

  commRecord.deliveryStatus = deliveryStatus;
  commRecord.providerMessageId = providerMessageId;
  commRecord.errorDetail = errorDetail;
  commRecord.sentAt = sentAt;
  commRecord.updatedAt = new Date().toISOString();

  // STEP 3: Update persisted delivery outcome
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase
      .from("recruitment_communications")
      .update({
        delivery_status: commRecord.deliveryStatus,
        provider_message_id: commRecord.providerMessageId,
        error_detail: commRecord.errorDetail,
        sent_at: commRecord.sentAt,
        updated_at: commRecord.updatedAt,
      })
      .eq("id", commRecord.id);
  } else if (isLocalFallbackAllowed()) {
    const existing = await readLocalCollection<RecruitmentCommunicationRecord>(COL_RECRUITMENT_COMMS);
    await writeLocalCollection(
      COL_RECRUITMENT_COMMS,
      existing.map((c) => (c.id === commRecord.id ? commRecord : c))
    );
  }

  await recordAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.roleKey,
    module: "recruitment",
    action: "recruitment.email.sent",
    entityType: "recruitment_communication",
    entityId: commRecord.id,
    outcome: deliveryStatus === "delivery_failed" ? "error" : "allowed",
    summary: `Sent ${RECRUITMENT_MESSAGE_TYPE_LABELS[input.messageType].en} to ${recipientEmail} (${deliveryStatus}).`,
    metadata: {
      recipientEmail,
      applicationReferenceId,
      messageType: input.messageType,
      locale,
      deliveryStatus,
      providerMessageId,
    },
  });

  return {
    ok: deliveryStatus !== "delivery_failed",
    communication: commRecord,
    delivery: {
      status: deliveryStatus,
      messageId: providerMessageId || undefined,
      error: errorDetail || undefined,
      notConfigured,
    },
    error: deliveryStatus === "delivery_failed" ? errorDetail || "Email delivery failed." : undefined,
  };
}

// ============================================================================
// 4. Unified Searchable Candidate Communication Timeline
// ============================================================================

export async function listRecruitmentCommunications(
  actor: AuthActor,
  filters?: { applicationReferenceId?: string; recipientEmail?: string; query?: string }
): Promise<RecruitmentCommunicationRecord[]> {
  if (!hasPermission(actor, "recruitment", "view")) return [];

  let rows: RecruitmentCommunicationRecord[] = [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      let query = supabase
        .from("recruitment_communications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (filters?.applicationReferenceId && filters?.recipientEmail) {
        const ref = filters.applicationReferenceId.replace(/[,()]/g, "").trim();
        const em = normalizeEmail(filters.recipientEmail).replace(/[,()]/g, "");
        query = query.or(`application_reference_id.eq.${ref},recipient_email.ilike.${em}`);
      } else if (filters?.applicationReferenceId) {
        query = query.eq("application_reference_id", filters.applicationReferenceId);
      } else if (filters?.recipientEmail) {
        query = query.ilike("recipient_email", normalizeEmail(filters.recipientEmail));
      }
      const { data, error } = await query;
      if (!error && data) {
        rows = data.map((r) => mapCommunicationRow(r as Record<string, unknown>));
      }
    } catch {
      rows = [];
    }
  } else if (isLocalFallbackAllowed()) {
    rows = await readLocalCollection<RecruitmentCommunicationRecord>(COL_RECRUITMENT_COMMS);
    if (filters?.applicationReferenceId || filters?.recipientEmail) {
      const ref = filters.applicationReferenceId?.trim();
      const em = filters.recipientEmail ? normalizeEmail(filters.recipientEmail) : null;
      rows = rows.filter(
        (r) =>
          (ref && r.applicationReferenceId === ref) ||
          (em && normalizeEmail(r.recipientEmail) === em)
      );
    }
  }

  if (filters?.query?.trim()) {
    const q = filters.query.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        r.subject.toLowerCase().includes(q) ||
        r.bodyText.toLowerCase().includes(q) ||
        r.recipientEmail.toLowerCase().includes(q) ||
        r.senderName.toLowerCase().includes(q) ||
        r.messageType.toLowerCase().includes(q)
    );
  }

  return rows;
}

export async function getUnifiedCandidateTimeline(
  actor: AuthActor,
  params: { applicationReferenceId?: string; recipientEmail?: string; query?: string }
): Promise<UnifiedCandidateTimelineItem[]> {
  if (!hasPermission(actor, "recruitment", "view")) return [];

  const [comms, invs, appts, activities] = await Promise.all([
    listRecruitmentCommunications(actor, params),
    hasPermission(actor, "interviews", "view") && params.applicationReferenceId
      ? listAuthorizedInterviewInvitations(actor, {
          applicationReferenceId: params.applicationReferenceId,
        })
      : Promise.resolve([]),
    hasPermission(actor, "interviews", "view") && params.applicationReferenceId
      ? listAuthorizedInterviewAppointments(actor, {
          applicationReferenceId: params.applicationReferenceId,
        })
      : Promise.resolve([]),
    hasPermission(actor, "interviews", "view") && params.applicationReferenceId
      ? listInterviewActivity(actor, params.applicationReferenceId)
      : Promise.resolve([]),
  ]);

  const timeline: UnifiedCandidateTimelineItem[] = [];

  for (const c of comms) {
    const statusInfo = RECRUITMENT_DELIVERY_LABELS[c.deliveryStatus] || {
      label: c.deliveryStatus,
      tone: "neutral" as const,
    };
    timeline.push({
      id: `comm-${c.id}`,
      kind: "manual_email",
      title: c.subject,
      subtitle: `${RECRUITMENT_MESSAGE_TYPE_LABELS[c.messageType]?.en || c.messageType} · To ${c.recipientEmail}`,
      messageType: c.messageType,
      recipientEmail: c.recipientEmail,
      senderName: c.senderName,
      senderEmail: c.senderEmail,
      status: statusInfo.label,
      statusTone: statusInfo.tone,
      bodyPreview: c.bodyText.slice(0, 320),
      errorDetail: c.errorDetail,
      providerMessageId: c.providerMessageId,
      createdAt: c.sentAt || c.createdAt,
    });
  }

  for (const inv of invs) {
    timeline.push({
      id: `inv-${inv.id}`,
      kind: "interview_invitation",
      title: `Interview Invitation — ${inv.positionTitle}`,
      subtitle: `Interviewer: ${inv.interviewerName} · Email: ${inv.emailDeliveryStatus}`,
      messageType: "interview_invitation",
      recipientEmail: inv.candidateEmail,
      status: inv.status,
      statusTone:
        inv.status === "scheduled"
          ? "emerald"
          : inv.status === "sent"
            ? "blue"
            : inv.status === "revoked" || inv.status === "expired"
              ? "rose"
              : "amber",
      bodyPreview: inv.personalizedMessage || `${inv.interviewStage} (${inv.durationMinutes} min)`,
      errorDetail: inv.deliveryError,
      providerMessageId: inv.providerMessageId,
      createdAt: inv.sentAt || inv.createdAt,
    });
  }

  for (const appt of appts) {
    timeline.push({
      id: `appt-${appt.id}`,
      kind: "interview_appointment",
      title: `Interview ${appt.status === "confirmed" ? "Confirmed" : appt.status} — ${appt.interviewStage}`,
      subtitle: `${appt.scheduledStartUtc.slice(0, 16).replace("T", " ")} UTC · ${appt.interviewerName} (${appt.durationMinutes}m)`,
      recipientEmail: appt.candidateEmail,
      status: appt.status,
      statusTone:
        appt.status === "confirmed"
          ? "violet"
          : appt.status === "completed"
            ? "emerald"
            : "rose",
      createdAt: appt.createdAt,
    });
  }

  for (const ev of activities) {
    timeline.push({
      id: `act-${ev.id}`,
      kind: "scheduling_event",
      title: ev.eventType.replace(/_/g, " "),
      subtitle: ev.summary,
      senderEmail: ev.actorRef,
      status: "Recorded",
      statusTone: "neutral",
      createdAt: ev.createdAt,
    });
  }

  let sorted = timeline.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (params.query?.trim()) {
    const q = params.query.trim().toLowerCase();
    sorted = sorted.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        (item.bodyPreview || "").toLowerCase().includes(q) ||
        item.status.toLowerCase().includes(q)
    );
  }

  return sorted;
}

// ============================================================================
// 5. Verified Resend Webhook Synchronization for Recruitment Communications
// ============================================================================

export async function recordRecruitmentWebhookUpdate(params: {
  providerMessageId: string;
  eventType: string;
  detail?: string;
}): Promise<{ matched: boolean; deliveryStatus?: RecruitmentDeliveryStatus }> {
  const statusMap: Record<string, RecruitmentDeliveryStatus> = {
    "email.sent": "accepted_by_provider",
    "email.delivered": "delivered",
    "email.bounced": "bounced",
    "email.complained": "complained",
    "email.delivery_delayed": "accepted_by_provider",
    "email.failed": "delivery_failed",
  };
  const mappedStatus = statusMap[params.eventType];
  if (!mappedStatus || !params.providerMessageId) {
    return { matched: false };
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createPrivilegedOrServerSupabaseClient();
      const { data, error } = await supabase.rpc("record_recruitment_email_webhook", {
        p_provider_message_id: params.providerMessageId,
        p_delivery_status: mappedStatus,
        p_event_type: params.eventType,
        p_error: params.detail || null,
      });
      if (!error && Array.isArray(data) && data.length > 0) {
        return { matched: true, deliveryStatus: mappedStatus };
      }
    } catch {
      // Fall through if fallback allowed
    }
  }

  if (isLocalFallbackAllowed()) {
    const nowIso = new Date().toISOString();
    const all = await readLocalCollection<RecruitmentCommunicationRecord>(COL_RECRUITMENT_COMMS);
    let matched = false;
    const next = all.map((c) => {
      if (c.providerMessageId !== params.providerMessageId) return c;
      matched = true;
      return {
        ...c,
        deliveryStatus:
          c.deliveryStatus === "delivered" && mappedStatus === "accepted_by_provider"
            ? "delivered"
            : mappedStatus,
        lastWebhookEvent: params.eventType,
        errorDetail: params.detail || c.errorDetail,
        deliveredAt: mappedStatus === "delivered" ? c.deliveredAt || nowIso : c.deliveredAt,
        updatedAt: nowIso,
      };
    });
    if (matched) {
      await writeLocalCollection(COL_RECRUITMENT_COMMS, next);
      return { matched: true, deliveryStatus: mappedStatus };
    }
  }

  return { matched: false };
}

export function isRecruitmentEmailDeliveryReady(): boolean {
  return isResendConfigured();
}
