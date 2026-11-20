-- HIRZEXA Intelligence — Additive Employee Invitation Email Delivery Tracking (2026-11-21)
-- Safe, idempotent, non-destructive migration: preserves all existing rows and RLS policies.
-- Run in Supabase SQL Editor on canonical production project (uczbfgksnrpjdajoyjge).

alter table public.employee_invitations
  add column if not exists delivery_status text not null default 'created'
    check (delivery_status in (
      'created',
      'sending',
      'accepted_by_provider',
      'delivered',
      'delivery_failed',
      'bounced',
      'complained'
    )),
  add column if not exists email_provider text,
  add column if not exists provider_message_id text,
  add column if not exists delivery_error text,
  add column if not exists sent_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists last_webhook_event text,
  add column if not exists last_webhook_at timestamptz;

create index if not exists idx_employee_invitations_provider_msg_id
  on public.employee_invitations (provider_message_id)
  where provider_message_id is not null;

create index if not exists idx_employee_invitations_employee_created
  on public.employee_invitations (employee_id, created_at desc);

-- ============================================================================
-- Controlled RPC for verified Resend webhook delivery updates.
-- Called ONLY after cryptographic Svix/Resend HMAC-SHA256 signature validation
-- in /api/webhooks/resend. Never exposes invitation tokens or hashes.
-- ============================================================================
create or replace function public.record_invitation_webhook_event(
  p_provider_message_id text,
  p_delivery_status text,
  p_event_type text,
  p_error text default null
)
returns table (
  invitation_id uuid,
  employee_id uuid,
  email text,
  delivery_status text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_delivery_status not in (
    'accepted_by_provider',
    'delivered',
    'delivery_failed',
    'bounced',
    'complained'
  ) then
    raise exception 'Invalid delivery status: %', p_delivery_status;
  end if;

  return query
  update public.employee_invitations ei
  set
    delivery_status = p_delivery_status,
    delivered_at = case
      when p_delivery_status = 'delivered' then coalesce(ei.delivered_at, now())
      else ei.delivered_at
    end,
    delivery_error = case
      when p_error is not null and length(trim(p_error)) > 0 then left(p_error, 500)
      when p_delivery_status = 'delivered' then null
      else ei.delivery_error
    end,
    last_webhook_event = left(coalesce(p_event_type, ''), 120),
    last_webhook_at = now()
  where ei.provider_message_id = p_provider_message_id
  returning ei.id, ei.employee_id, ei.email, ei.delivery_status;
end;
$$;

revoke all on function public.record_invitation_webhook_event(text, text, text, text) from public;
grant execute on function public.record_invitation_webhook_event(text, text, text, text) to anon, authenticated;
