-- HIRZEXA — Intelligent Meeting Email & Automated Reminder System Migration (2026-11-23)
-- Additive, idempotent, non-destructive migration for Sales CRM meeting communications,
-- persistent UTC reminder queue, concurrency-safe job claiming, and webhook delivery sync.

create extension if not exists pgcrypto;

-- ============================================================================
-- 1. Sales CRM Meeting Communications & Persistent Reminder Job Queue
-- ============================================================================
create table if not exists public.crm_meeting_communications (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.crm_leads(id) on delete cascade,
  lead_reference_id text not null,
  recipient_email text not null,
  recipient_name text not null,
  template_type text not null check (template_type in (
    'meeting_confirmation',
    'meeting_reminder_24h',
    'meeting_reminder_1h',
    'meeting_reminder_custom',
    'meeting_rescheduled',
    'meeting_cancelled',
    'post_meeting_followup',
    'custom_email'
  )),
  trigger_source text not null check (trigger_source in (
    'booking_auto',
    'scheduler_auto',
    'manual_staff',
    'reschedule_auto',
    'cancel_auto',
    'ai_assisted_manual'
  )),
  locale text not null default 'en' check (locale in ('en', 'ar')),
  subject text not null,
  body_text text not null,
  body_html text not null default '',
  meeting_slot_iso timestamptz,
  meeting_timezone text not null default 'UTC',
  meeting_link text,
  sender_address text not null,
  reply_to_address text not null,
  initiated_by_actor_id text,
  initiated_by_email text,
  initiated_by_name text,
  scheduled_for timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  status text not null default 'queued' check (status in (
    'draft',
    'queued',
    'processing',
    'submitted',
    'delivered',
    'failed',
    'bounced',
    'complained',
    'cancelled',
    'skipped'
  )),
  idempotency_key text unique not null,
  provider text not null default 'resend',
  provider_message_id text,
  last_webhook_event text,
  failure_reason text,
  attempts integer not null default 0 check (attempts >= 0 and attempts <= 10),
  max_attempts integer not null default 3 check (max_attempts >= 1 and max_attempts <= 10),
  next_retry_at timestamptz,
  locked_at timestamptz,
  locked_by text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_meeting_comm_lead_created_idx
  on public.crm_meeting_communications(lead_id, created_at desc);

create index if not exists crm_meeting_comm_due_jobs_idx
  on public.crm_meeting_communications(status, coalesce(next_retry_at, scheduled_for))
  where status in ('queued', 'processing');

create index if not exists crm_meeting_comm_provider_msg_idx
  on public.crm_meeting_communications(provider_message_id)
  where provider_message_id is not null;

-- ============================================================================
-- 2. Per-Lead Configurable Meeting Reminder Schedule
-- ============================================================================
create table if not exists public.crm_meeting_reminder_configs (
  lead_id uuid primary key references public.crm_leads(id) on delete cascade,
  enabled boolean not null default true,
  offsets_minutes integer[] not null default array[1440, 60],
  updated_by text,
  updated_at timestamptz not null default now(),
  constraint crm_meeting_reminder_offsets_bounds check (
    cardinality(offsets_minutes) <= 5
  )
);

-- ============================================================================
-- 3. Atomic Concurrency-Safe Worker Claim RPC (FOR UPDATE SKIP LOCKED)
--    Prevents duplicate sending when multiple scheduler workers run concurrently.
--    Restricted strictly to service_role.
-- ============================================================================
create or replace function public.claim_due_crm_meeting_email_jobs(
  p_worker_id text,
  p_limit integer default 20
)
returns setof public.crm_meeting_communications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 20), 50));
begin
  return query
  with candidates as (
    select id
    from public.crm_meeting_communications
    where (
      status = 'queued'
      and coalesce(next_retry_at, scheduled_for, created_at) <= now()
      and attempts < max_attempts
    ) or (
      status = 'processing'
      and locked_at is not null
      and locked_at < now() - interval '10 minutes'
      and attempts < max_attempts
    )
    order by coalesce(next_retry_at, scheduled_for, created_at) asc
    limit v_limit
    for update skip locked
  )
  update public.crm_meeting_communications c
  set status = 'processing',
      attempts = c.attempts + 1,
      locked_at = now(),
      locked_by = left(coalesce(nullif(trim(p_worker_id), ''), 'worker'), 80),
      updated_at = now()
  from candidates
  where c.id = candidates.id
  returning c.*;
end;
$$;

-- ============================================================================
-- 4. Narrow SECURITY DEFINER RPC for Verified Resend Webhook Delivery Sync
--    Only webhook evidence promotes `submitted` -> `delivered`.
--    Restricted strictly to service_role.
-- ============================================================================
create or replace function public.record_crm_meeting_email_webhook(
  p_provider_message_id text,
  p_status text,
  p_event_type text,
  p_error text default null
)
returns table (
  communication_id uuid,
  lead_id uuid,
  lead_reference_id text,
  recipient_email text,
  template_type text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comm_id uuid;
  v_lead_id uuid;
  v_ref text;
  v_recipient text;
  v_template text;
begin
  if p_status not in ('submitted', 'delivered', 'failed', 'bounced', 'complained') then
    return;
  end if;

  update public.crm_meeting_communications
  set status = case
        when status = 'delivered' and p_status = 'submitted' then 'delivered'
        else p_status
      end,
      last_webhook_event = left(coalesce(p_event_type, ''), 80),
      failure_reason = coalesce(left(p_error, 400), failure_reason),
      delivered_at = case
        when p_status = 'delivered' then coalesce(delivered_at, now())
        else delivered_at
      end,
      updated_at = now()
  where provider_message_id = p_provider_message_id
  returning
    crm_meeting_communications.id,
    crm_meeting_communications.lead_id,
    crm_meeting_communications.lead_reference_id,
    crm_meeting_communications.recipient_email,
    crm_meeting_communications.template_type
  into v_comm_id, v_lead_id, v_ref, v_recipient, v_template;

  if v_comm_id is not null then
    return query select v_comm_id, v_lead_id, v_ref, v_recipient, v_template;
  end if;
end;
$$;

-- ============================================================================
-- 5. Grants & Independent Scope-Aware Row-Level Security (RBAC + Ownership)
-- ============================================================================
revoke all on table public.crm_meeting_communications from public, anon;
revoke all on table public.crm_meeting_reminder_configs from public, anon;

grant select, insert, update on table public.crm_meeting_communications
  to authenticated, service_role;
grant select, insert, update on table public.crm_meeting_reminder_configs
  to authenticated, service_role;

revoke all on function public.claim_due_crm_meeting_email_jobs(text, integer) from public, anon, authenticated;
grant execute on function public.claim_due_crm_meeting_email_jobs(text, integer) to service_role;

revoke all on function public.record_crm_meeting_email_webhook(text, text, text, text) from public, anon, authenticated;
grant execute on function public.record_crm_meeting_email_webhook(text, text, text, text) to service_role;

alter table public.crm_meeting_communications enable row level security;
alter table public.crm_meeting_reminder_configs enable row level security;

drop policy if exists "crm_meeting_comm_select_rbac" on public.crm_meeting_communications;
create policy "crm_meeting_comm_select_rbac" on public.crm_meeting_communications
  for select using (
    (public.hirzexa_has_permission('crm', 'view') or public.hirzexa_has_permission('bookings', 'view'))
    and exists (
      select 1
      from public.crm_leads l
      where l.id = public.crm_meeting_communications.lead_id
        and public.hirzexa_can_access_lead(l.owner_employee_id)
    )
  );

drop policy if exists "crm_meeting_comm_insert_rbac" on public.crm_meeting_communications;
create policy "crm_meeting_comm_insert_rbac" on public.crm_meeting_communications
  for insert with check (
    (public.hirzexa_has_permission('crm', 'edit') or public.hirzexa_has_permission('bookings', 'edit'))
    and exists (
      select 1
      from public.crm_leads l
      where l.id = public.crm_meeting_communications.lead_id
        and public.hirzexa_can_access_lead(l.owner_employee_id)
    )
  );

drop policy if exists "crm_meeting_comm_update_rbac" on public.crm_meeting_communications;
create policy "crm_meeting_comm_update_rbac" on public.crm_meeting_communications
  for update using (
    (public.hirzexa_has_permission('crm', 'edit') or public.hirzexa_has_permission('bookings', 'edit'))
    and exists (
      select 1
      from public.crm_leads l
      where l.id = public.crm_meeting_communications.lead_id
        and public.hirzexa_can_access_lead(l.owner_employee_id)
    )
  )
  with check (
    (public.hirzexa_has_permission('crm', 'edit') or public.hirzexa_has_permission('bookings', 'edit'))
    and exists (
      select 1
      from public.crm_leads l
      where l.id = public.crm_meeting_communications.lead_id
        and public.hirzexa_can_access_lead(l.owner_employee_id)
    )
  );

drop policy if exists "crm_meeting_cfg_select_rbac" on public.crm_meeting_reminder_configs;
create policy "crm_meeting_cfg_select_rbac" on public.crm_meeting_reminder_configs
  for select using (
    (public.hirzexa_has_permission('crm', 'view') or public.hirzexa_has_permission('bookings', 'view'))
    and exists (
      select 1
      from public.crm_leads l
      where l.id = public.crm_meeting_reminder_configs.lead_id
        and public.hirzexa_can_access_lead(l.owner_employee_id)
    )
  );

drop policy if exists "crm_meeting_cfg_write_rbac" on public.crm_meeting_reminder_configs;
create policy "crm_meeting_cfg_write_rbac" on public.crm_meeting_reminder_configs
  for all using (
    (public.hirzexa_has_permission('crm', 'edit') or public.hirzexa_has_permission('bookings', 'edit'))
    and exists (
      select 1
      from public.crm_leads l
      where l.id = public.crm_meeting_reminder_configs.lead_id
        and public.hirzexa_can_access_lead(l.owner_employee_id)
    )
  )
  with check (
    (public.hirzexa_has_permission('crm', 'edit') or public.hirzexa_has_permission('bookings', 'edit'))
    and exists (
      select 1
      from public.crm_leads l
      where l.id = public.crm_meeting_reminder_configs.lead_id
        and public.hirzexa_can_access_lead(l.owner_employee_id)
    )
  );
