-- HIRZEXA — Google Meet Provisioning Reliability & Retry Queue Migration (2026-11-23)
-- Additive, idempotent migration adding persistent Meet provisioning status,
-- actionable error tracking, bounded retry scheduling, and atomic worker claim RPC.

-- ============================================================================
-- 1. Extend public.crm_leads with Persistent Google Meet Provisioning State
-- ============================================================================
alter table if exists public.crm_leads
  add column if not exists google_calendar_event_id text;

alter table if exists public.crm_leads
  add column if not exists meet_provisioning_status text not null default 'not_applicable';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'crm_leads_meet_provisioning_status_check'
  ) then
    alter table public.crm_leads
      add constraint crm_leads_meet_provisioning_status_check
      check (meet_provisioning_status in ('not_applicable', 'pending', 'ready', 'failed'));
  end if;
end $$;

alter table if exists public.crm_leads
  add column if not exists meet_provisioning_error text;

alter table if exists public.crm_leads
  add column if not exists meet_provisioning_attempts integer not null default 0;

alter table if exists public.crm_leads
  add column if not exists meet_next_retry_at timestamptz;

create index if not exists crm_leads_meet_retry_idx
  on public.crm_leads(meet_provisioning_status, meet_next_retry_at)
  where meet_provisioning_status in ('pending', 'failed');

-- ============================================================================
-- 2. Atomic Concurrency-Safe Worker Claim RPC for Google Meet Retries
--    Restricted strictly to service_role.
-- ============================================================================
create or replace function public.claim_due_google_meet_provisioning_leads(
  p_limit integer default 10
)
returns table (
  id uuid,
  reference_id text,
  scheduled_slot_iso timestamptz,
  google_calendar_event_id text,
  meet_provisioning_attempts integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 10), 25));
begin
  return query
  with candidates as (
    select l.id
    from public.crm_leads l
    where l.lead_type = 'discovery_call'
      and l.scheduled_slot_iso is not null
      and l.scheduled_slot_iso > now()
      and l.stage not in ('lost', 'won', 'discovery_completed')
      and l.meet_provisioning_status in ('pending', 'failed')
      and l.meet_provisioning_attempts < 5
      and coalesce(l.meet_next_retry_at, l.created_at) <= now()
    order by coalesce(l.meet_next_retry_at, l.created_at) asc
    limit v_limit
    for update skip locked
  )
  update public.crm_leads l
  set meet_provisioning_status = 'pending',
      meet_provisioning_attempts = l.meet_provisioning_attempts + 1,
      meet_next_retry_at = now() + interval '10 minutes',
      updated_at = now()
  from candidates
  where l.id = candidates.id
  returning
    l.id,
    l.reference_id,
    l.scheduled_slot_iso,
    l.google_calendar_event_id,
    l.meet_provisioning_attempts;
end;
$$;

revoke all on function public.claim_due_google_meet_provisioning_leads(integer)
  from public, anon, authenticated;
grant execute on function public.claim_due_google_meet_provisioning_leads(integer)
  to service_role;
