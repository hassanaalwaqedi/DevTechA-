-- HIRZEXA Intelligence — External Candidate Management & Recruitment Communications Migration (2026-11-21)
-- Additive, idempotent, non-destructive migration.
-- Preserves 100% of existing website job_applications rows while extending the table for
-- LinkedIn/external candidates, prospects, and tracked recruitment communications.

create extension if not exists pgcrypto;

-- ============================================================================
-- 1. Extend existing `public.job_applications` for External Candidates & Prospects
-- ============================================================================
alter table public.job_applications alter column job_id drop not null;
alter table public.job_applications alter column cv_path drop not null;
alter table public.job_applications alter column expected_start_date drop not null;

alter table public.job_applications
  add column if not exists candidate_source text not null default 'website';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'job_applications_candidate_source_check'
  ) then
    alter table public.job_applications
      add constraint job_applications_candidate_source_check
      check (candidate_source in ('website', 'linkedin', 'email', 'referral', 'other'));
  end if;
end $$;

alter table public.job_applications
  add column if not exists is_external_prospect boolean not null default false;

alter table public.job_applications
  add column if not exists custom_position_title text;

alter table public.job_applications
  add column if not exists internal_notes text;

alter table public.job_applications
  add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table public.job_applications
  add column if not exists created_by_email text;

alter table public.job_applications
  add column if not exists email_opt_out boolean not null default false;

create index if not exists job_applications_source_idx
  on public.job_applications(candidate_source);

create index if not exists job_applications_email_lower_idx
  on public.job_applications(lower(email));

-- Ensure authorized recruitment staff can also insert/manage external candidates under RLS
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'job_applications') then
    execute 'drop policy if exists "rbac_hr_insert_applications" on public.job_applications';
    execute 'create policy "rbac_hr_insert_applications" on public.job_applications for insert with check (public.hirzexa_has_permission(''recruitment'', ''create'') or public.hirzexa_has_permission(''recruitment'', ''edit''))';
  end if;
end $$;

-- ============================================================================
-- 2. Recruitment Communications History (Manual Emails + Delivery Tracking)
-- ============================================================================
create table if not exists public.recruitment_communications (
  id uuid primary key default gen_random_uuid(),
  recipient_email text not null,
  recipient_name text,
  application_id uuid references public.job_applications(id) on delete set null,
  application_reference_id text,
  interview_invitation_id uuid references public.interview_invitations(id) on delete set null,
  message_type text not null check (message_type in (
    'application_thank_you',
    'general_recruitment',
    'interview_invitation',
    'interview_follow_up',
    'request_info',
    'application_update',
    'custom'
  )),
  locale text not null default 'en' check (locale in ('en', 'ar')),
  subject text not null,
  body_text text not null,
  body_html_safe text not null default '',
  sender_auth_user_id uuid references auth.users(id) on delete set null,
  sender_employee_id uuid references public.employees(id) on delete set null,
  sender_email text not null,
  sender_name text not null,
  idempotency_key text unique not null,
  provider text not null default 'resend',
  provider_message_id text,
  delivery_status text not null default 'draft' check (delivery_status in (
    'draft',
    'queued',
    'accepted_by_provider',
    'delivered',
    'delivery_failed',
    'bounced',
    'complained'
  )),
  last_webhook_event text,
  error_detail text,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure message_type check constraint stays up to date when re-running migration idempotently
alter table public.recruitment_communications
  drop constraint if exists recruitment_communications_message_type_check;

alter table public.recruitment_communications
  add constraint recruitment_communications_message_type_check
  check (message_type in (
    'application_thank_you',
    'general_recruitment',
    'interview_invitation',
    'interview_follow_up',
    'request_info',
    'application_update',
    'custom'
  ));

create index if not exists recruitment_comm_recipient_idx
  on public.recruitment_communications(lower(recipient_email), created_at desc);

create index if not exists recruitment_comm_app_ref_idx
  on public.recruitment_communications(application_reference_id, created_at desc)
  where application_reference_id is not null;

create index if not exists recruitment_comm_msg_id_idx
  on public.recruitment_communications(provider_message_id)
  where provider_message_id is not null;

-- ============================================================================
-- 3. Narrow SECURITY DEFINER RPC for Verified Resend Webhook Delivery Sync
-- ============================================================================
create or replace function public.record_recruitment_email_webhook(
  p_provider_message_id text,
  p_delivery_status text,
  p_event_type text,
  p_error text default null
)
returns table (
  communication_id uuid,
  application_reference_id text,
  recipient_email text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comm_id uuid;
  v_app_ref text;
  v_recipient text;
begin
  update public.recruitment_communications
  set delivery_status = case
        when delivery_status = 'delivered' and p_delivery_status = 'accepted_by_provider' then 'delivered'
        else p_delivery_status
      end,
      last_webhook_event = p_event_type,
      error_detail = coalesce(p_error, error_detail),
      delivered_at = case
        when p_delivery_status = 'delivered' then coalesce(delivered_at, now())
        else delivered_at
      end,
      updated_at = now()
  where provider_message_id = p_provider_message_id
  returning
    recruitment_communications.id,
    recruitment_communications.application_reference_id,
    recruitment_communications.recipient_email
  into v_comm_id, v_app_ref, v_recipient;

  if v_comm_id is not null then
    return query select v_comm_id, coalesce(v_app_ref, ''), coalesce(v_recipient, '');
  end if;
end;
$$;

-- ============================================================================
-- 4. Grants & Independent Row-Level Security on `recruitment_communications`
-- ============================================================================
grant select, insert, update on table public.recruitment_communications
  to authenticated, service_role;

grant execute on function public.record_recruitment_email_webhook(text, text, text, text)
  to anon, authenticated, service_role;

alter table public.recruitment_communications enable row level security;

drop policy if exists "recruitment_comm_select_rbac" on public.recruitment_communications;
create policy "recruitment_comm_select_rbac" on public.recruitment_communications
  for select using (public.hirzexa_has_permission('recruitment', 'view'));

drop policy if exists "recruitment_comm_insert_rbac" on public.recruitment_communications;
create policy "recruitment_comm_insert_rbac" on public.recruitment_communications
  for insert with check (
    public.hirzexa_has_permission('recruitment', 'create')
    or public.hirzexa_has_permission('recruitment', 'edit')
  );

drop policy if exists "recruitment_comm_update_rbac" on public.recruitment_communications;
create policy "recruitment_comm_update_rbac" on public.recruitment_communications
  for update using (
    public.hirzexa_has_permission('recruitment', 'create')
    or public.hirzexa_has_permission('recruitment', 'edit')
  )
  with check (
    public.hirzexa_has_permission('recruitment', 'create')
    or public.hirzexa_has_permission('recruitment', 'edit')
  );

notify pgrst, 'reload schema';
