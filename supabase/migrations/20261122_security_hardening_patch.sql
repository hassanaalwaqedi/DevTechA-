-- HIRZEXA — Enterprise Security Audit Hardening Patch (2026-11-22)
-- DO NOT APPLY TO PRODUCTION WITHOUT EXPLICIT OPERATOR REVIEW & STAGING VERIFICATION.
--
-- Remediates database & storage findings from SECURITY_AUDIT.md:
--   SEC-008: Hardens SECURITY DEFINER RPCs (webhook RPCs restricted to service_role once
--            server uses SUPABASE_SERVICE_ROLE_KEY; prevents public contact overwrite in
--            ingest_public_crm_lead; validates source_href in ingest_public_business_event).
--   SEC-009: Enables Row-Level Security on public.application_answers; tightens anonymous
--            INSERT checks on public.job_applications and public.visitor_events; adds HR
--            storage read access aligned with RBAC.
--   SEC-010: Enforces record-level scope isolation on public.crm_contacts &
--            public.crm_companies so Assigned/Team-scoped users cannot dump org-wide contacts;
--            blocks non-Super Admin self-privilege-escalation in employees_update_rbac.

-- ============================================================================
-- 1. SEC-009: Enable RLS on public.application_answers
-- ============================================================================
alter table if exists public.application_answers enable row level security;

drop policy if exists "rbac_hr_read_application_answers" on public.application_answers;
create policy "rbac_hr_read_application_answers" on public.application_answers
  for select using (
    exists (select 1 from public.admin_users where id = auth.uid())
    or public.hirzexa_has_permission('recruitment', 'view')
  );

drop policy if exists "rbac_hr_manage_application_answers" on public.application_answers;
create policy "rbac_hr_manage_application_answers" on public.application_answers
  for all using (
    exists (select 1 from public.admin_users where id = auth.uid())
    or public.hirzexa_has_permission('recruitment', 'edit')
  )
  with check (
    exists (select 1 from public.admin_users where id = auth.uid())
    or public.hirzexa_has_permission('recruitment', 'edit')
  );

-- ============================================================================
-- 2. SEC-009: Tighten Anonymous INSERT Policies (Prevent Forged Status / CRM Injection)
-- ============================================================================
drop policy if exists "anyone can submit applications" on public.job_applications;
create policy "anyone can submit applications" on public.job_applications
  for insert to anon
  with check (
    status = 'new'
    and consent = true
    and coalesce(candidate_source, 'website') = 'website'
    and coalesce(is_external_prospect, false) = false
    and job_id is not null
    and exists (
      select 1 from public.jobs j
      where j.id = job_id
        and j.status = 'open'
        and (j.deadline is null or j.deadline >= current_date)
    )
  );

drop policy if exists "anyone can record page views" on public.visitor_events;
create policy "anyone can record page views" on public.visitor_events
  for insert to anon, authenticated
  with check (
    path like '/%'
    and path not like '/__%'
    and length(path) <= 200
    and length(visitor_id) between 20 and 80
  );

-- Align storage read access for authorized HR Managers (in addition to admin_users)
drop policy if exists "rbac_hr_read_private_cvs" on storage.objects;
create policy "rbac_hr_read_private_cvs" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'cvs'
    and public.hirzexa_has_permission('recruitment', 'view')
  );

-- ============================================================================
-- 3. SEC-010: Record-Level Scope Isolation on crm_contacts & crm_companies
-- ============================================================================
drop policy if exists "crm_contacts_select_rbac" on public.crm_contacts;
create policy "crm_contacts_select_rbac" on public.crm_contacts
  for select using (
    (public.hirzexa_has_permission('crm', 'view') or public.hirzexa_has_permission('bookings', 'view'))
    and (
      public.hirzexa_actor_scope() = 'all'
      or exists (
        select 1
        from public.crm_leads l
        where l.contact_id = public.crm_contacts.id
          and public.hirzexa_can_access_lead(l.owner_employee_id)
      )
    )
  );

drop policy if exists "crm_companies_select_rbac" on public.crm_companies;
create policy "crm_companies_select_rbac" on public.crm_companies
  for select using (
    (public.hirzexa_has_permission('crm', 'view') or public.hirzexa_has_permission('bookings', 'view'))
    and (
      public.hirzexa_actor_scope() = 'all'
      or exists (
        select 1
        from public.crm_leads l
        where l.company_id = public.crm_companies.id
          and public.hirzexa_can_access_lead(l.owner_employee_id)
      )
    )
  );

-- Prevent non-Super Admin self-escalation via direct PostgREST UPDATE on public.employees
drop policy if exists "employees_update_rbac" on public.employees;
create policy "employees_update_rbac" on public.employees
  for update using (
    public.hirzexa_has_permission('team', 'edit')
    and (
      public.hirzexa_actor_role() = 'super_admin'
      or (role_key <> 'super_admin' and auth_user_id is distinct from auth.uid())
    )
  )
  with check (
    public.hirzexa_has_permission('team', 'edit')
    and (
      public.hirzexa_actor_role() = 'super_admin'
      or (
        role_key <> 'super_admin'
        and auth_user_id is distinct from auth.uid()
        and not (coalesce(permission_overrides -> 'team', '[]'::jsonb) ?| array['manage','delete'])
        and not (coalesce(permission_overrides -> 'audit', '[]'::jsonb) ?| array['manage','delete'])
      )
    )
  );

-- ============================================================================
-- 4. SEC-008: Harden ingest_public_crm_lead & ingest_public_business_event
--    - Do NOT overwrite existing crm_contacts PII on anonymous email collision.
--    - Enforce safe internal path on p_source_href (block javascript:/external URLs).
-- ============================================================================
create or replace function public.ingest_public_crm_lead(
  p_id uuid,
  p_reference_id text,
  p_lead_type text,
  p_stage text,
  p_full_name text,
  p_email text,
  p_phone text default null,
  p_company text default '',
  p_role_title text default null,
  p_service_track text default 'AI & Software Engineering',
  p_budget_range text default null,
  p_timeline text default null,
  p_duration_minutes integer default 30,
  p_scheduled_slot_iso timestamptz default null,
  p_preferred_window text default null,
  p_timezone text default 'UTC',
  p_meeting_link text default null,
  p_project_summary text default '',
  p_current_stack text default null,
  p_consent boolean default true,
  p_locale text default 'en',
  p_activities jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_contact_id uuid;
  v_norm_company text;
  v_clean_email text := lower(trim(coalesce(p_email, '')));
begin
  if p_lead_type not in ('discovery_call', 'proposal_request') then
    raise exception 'Invalid lead_type';
  end if;
  if p_stage not in ('new_lead', 'meeting_booked') then
    raise exception 'Public ingestion may only initialize new_lead or meeting_booked';
  end if;
  if length(trim(coalesce(p_full_name, ''))) < 2 or position('@' in v_clean_email) = 0 then
    raise exception 'Invalid contact name or email';
  end if;

  v_norm_company := lower(regexp_replace(trim(coalesce(p_company, '')), '\s+', ' ', 'g'));
  if length(v_norm_company) > 0 then
    insert into public.crm_companies (name, normalized_name)
    values (trim(p_company), v_norm_company)
    on conflict (normalized_name) do update set updated_at = now()
    returning id into v_company_id;
  end if;

  -- Preserve existing contact PII on conflict instead of allowing unauthenticated overwrite
  insert into public.crm_contacts (
    company_id, full_name, email, phone, role_title, locale, consent, consent_at
  )
  values (
    v_company_id,
    trim(p_full_name),
    v_clean_email,
    nullif(trim(coalesce(p_phone, '')), ''),
    nullif(trim(coalesce(p_role_title, '')), ''),
    case when p_locale = 'ar' then 'ar' else 'en' end,
    coalesce(p_consent, true),
    now()
  )
  on conflict (email) do update set
    updated_at = now()
  returning id into v_contact_id;

  insert into public.crm_leads (
    id, reference_id, company_id, contact_id, lead_type, stage, service_track,
    budget_range, timeline, duration_minutes, scheduled_slot_iso, preferred_window,
    timezone, meeting_link, project_summary, current_stack, next_follow_up_at, activities
  )
  values (
    coalesce(p_id, gen_random_uuid()),
    p_reference_id,
    v_company_id,
    v_contact_id,
    p_lead_type,
    p_stage,
    left(trim(coalesce(p_service_track, 'AI & Software Engineering')), 140),
    nullif(trim(coalesce(p_budget_range, '')), ''),
    nullif(trim(coalesce(p_timeline, '')), ''),
    case when p_duration_minutes = 20 then 20 else 30 end,
    p_scheduled_slot_iso,
    nullif(trim(coalesce(p_preferred_window, '')), ''),
    left(coalesce(p_timezone, 'UTC'), 64),
    nullif(trim(coalesce(p_meeting_link, '')), ''),
    left(coalesce(p_project_summary, ''), 4000),
    nullif(left(trim(coalesce(p_current_stack, '')), 1000), ''),
    p_scheduled_slot_iso,
    coalesce(p_activities, '[]'::jsonb)
  )
  on conflict (reference_id) do nothing
  returning id into p_id;

  if p_id is not null then
    insert into public.crm_stage_history (lead_id, from_stage, to_stage, changed_by, reason)
    values (p_id, null, p_stage, v_clean_email, 'Public booking/proposal submission');

    insert into public.business_events (
      event_type, module, severity, actor_ref, entity_type, entity_id,
      title, summary, source_href, payload, idempotency_key
    )
    values (
      case when p_lead_type = 'discovery_call' then 'booking.created' else 'proposal.created' end,
      case when p_lead_type = 'discovery_call' then 'bookings' else 'crm' end,
      case when p_scheduled_slot_iso is not null then 'attention' else 'info' end,
      trim(p_full_name),
      'lead',
      p_id::text,
      left(
        case when p_lead_type = 'discovery_call' then 'Discovery call booked: ' else 'Proposal requested: ' end
        || coalesce(nullif(trim(p_company), ''), trim(p_full_name)),
        180
      ),
      left(p_reference_id || ' · ' || coalesce(p_service_track, ''), 420),
      '/admin/crm?lead=' || p_id::text,
      jsonb_build_object('referenceId', p_reference_id, 'stage', p_stage, 'serviceTrack', p_service_track),
      'lead-created:' || p_id::text
    )
    on conflict (idempotency_key) do nothing;
  end if;

  return p_id;
end;
$$;

create or replace function public.ingest_public_business_event(
  p_event_type text,
  p_module text,
  p_severity text,
  p_actor_ref text,
  p_entity_type text,
  p_entity_id text,
  p_title text,
  p_summary text,
  p_source_href text,
  p_payload jsonb default '{}'::jsonb,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_safe_href text;
begin
  if p_event_type not in ('booking.created', 'proposal.created', 'application.received') then
    raise exception 'Event type not permitted for public ingestion';
  end if;
  if p_module not in ('bookings', 'crm', 'recruitment') then
    raise exception 'Module not permitted for public ingestion';
  end if;

  -- Allow strictly internal /admin relative paths (block javascript:, data:, external URLs)
  v_safe_href := case
    when coalesce(p_source_href, '') ~ '^/admin(/[A-Za-z0-9._?=&%-]*)?$' then left(p_source_href, 240)
    else '/admin'
  end;

  insert into public.business_events (
    event_type, module, severity, actor_ref, entity_type, entity_id,
    title, summary, source_href, payload, idempotency_key
  )
  values (
    p_event_type,
    p_module,
    case when p_severity in ('info','attention','urgent') then p_severity else 'info' end,
    left(coalesce(p_actor_ref, 'public'), 120),
    left(coalesce(p_entity_type, 'record'), 60),
    left(coalesce(p_entity_id, ''), 120),
    left(coalesce(p_title, ''), 180),
    left(coalesce(p_summary, ''), 420),
    v_safe_href,
    coalesce(p_payload, '{}'::jsonb),
    p_idempotency_key
  )
  on conflict (idempotency_key) do nothing
  returning id into v_id;

  return v_id;
end;
$$;

-- NOTE FOR PHASE 2 SERVICE-ROLE MIGRATION (uncomment ONLY AFTER configuring
-- SUPABASE_SERVICE_ROLE_KEY in /api/webhooks/resend and /api/applications):
-- revoke execute on function public.record_invitation_webhook_event(text, text, text, text) from anon, authenticated;
-- revoke execute on function public.record_interview_email_webhook(text, text, text, text) from anon, authenticated;
-- revoke execute on function public.record_recruitment_email_webhook(text, text, text, text) from anon, authenticated;
-- grant execute on function public.record_invitation_webhook_event(text, text, text, text) to service_role;
-- grant execute on function public.record_interview_email_webhook(text, text, text, text) to service_role;
-- grant execute on function public.record_recruitment_email_webhook(text, text, text, text) to service_role;
-- drop policy if exists "candidates can upload private cvs" on storage.objects;

notify pgrst, 'reload schema';
