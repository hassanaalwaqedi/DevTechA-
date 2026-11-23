-- HIRZEXA — Secure Server-Side Google Calendar OAuth 2.0 & Meet Integration Migration (2026-11-23)
-- Additive, idempotent, non-destructive migration.
-- Stores AES-256-GCM encrypted OAuth refresh/access tokens in a service_role-only table
-- so neither anonymous nor authenticated browser clients can ever query token ciphertext.

create extension if not exists pgcrypto;

-- ============================================================================
-- 1. Encrypted Google Calendar OAuth Connections (service_role ONLY)
-- ============================================================================
create table if not exists public.google_calendar_connections (
  workspace_key text primary key default 'default',
  provider text not null default 'google_calendar' check (provider = 'google_calendar'),
  connected_email text not null,
  calendar_id text not null default 'primary',
  scopes text[] not null default array[]::text[],
  encrypted_refresh_token text not null,
  encrypted_access_token text,
  access_token_expires_at timestamptz,
  token_key_version text not null default 'v1',
  connected_by_actor_id text,
  connected_by_email text,
  last_verified_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Strict least-privilege table lockdown: ONLY server-side service_role can read/write tokens.
revoke all on table public.google_calendar_connections from public, anon, authenticated;
grant select, insert, update, delete on table public.google_calendar_connections to service_role;

alter table public.google_calendar_connections enable row level security;

-- ============================================================================
-- 2. Track Google Calendar Event ID on Sales CRM Leads for Reschedule / Cancel Sync
-- ============================================================================
alter table if exists public.crm_leads
  add column if not exists google_calendar_event_id text;

create index if not exists crm_leads_gcal_event_id_idx
  on public.crm_leads(google_calendar_event_id)
  where google_calendar_event_id is not null;
