-- HIRZEXA Intelligence — Phase 1 Additive Production Migration (2026-11-20)
-- Safe, idempotent, and non-destructive: preserves all existing tables and records.
-- Enforces independent PostgreSQL Row-Level Security (RLS) for all 9 RBAC roles
-- and record access scopes, completely separate from application/UI authorization.
--
-- Apply via Supabase SQL Editor, then run supabase/migrations/verify_20261120_rls.sql
-- inside a rolled-back transaction to independently verify RLS enforcement.

create extension if not exists pgcrypto;

-- ============================================================================
-- 1. Organizational Employees & RBAC Profiles
-- ============================================================================
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null,
  email text unique not null,
  job_title text not null default '',
  department text not null default 'Operations',
  role_key text not null check (role_key in (
    'super_admin','administrator','sales_manager','sales_rep',
    'marketing_specialist','marketing_intern','hr_manager','engineer','project_manager'
  )),
  scope_override text check (scope_override is null or scope_override in ('own','assigned','team','all')),
  permission_overrides jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('invited','active','suspended')),
  mfa_enrolled boolean not null default false,
  session_version integer not null default 1,
  last_active_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 2. Single-Use Time-Limited Employee Activation Invitations (SHA-256 hash only)
-- ============================================================================
create table if not exists public.employee_invitations (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  email text not null,
  role_key text not null,
  token_hash text unique not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 3. Immutable Security & Operational Audit Logs (Append-Only)
-- ============================================================================
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id text not null,
  actor_email text not null,
  actor_role text not null,
  module text not null,
  action text not null,
  entity_type text not null,
  entity_id text,
  outcome text not null check (outcome in ('allowed','denied','error','pending_confirmation')),
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 4. Normalized CRM Entities (Companies, Contacts, Leads, Stage History)
-- ============================================================================
create table if not exists public.crm_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text unique not null,
  domain text,
  industry text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.crm_companies(id) on delete set null,
  full_name text not null,
  email text unique not null,
  phone text,
  role_title text,
  locale text not null default 'en',
  consent boolean not null default false,
  consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_leads (
  id uuid primary key default gen_random_uuid(),
  reference_id text unique not null,
  company_id uuid references public.crm_companies(id) on delete set null,
  contact_id uuid references public.crm_contacts(id) on delete set null,
  owner_employee_id uuid references public.employees(id) on delete set null,
  lead_type text not null check (lead_type in ('discovery_call','proposal_request')),
  stage text not null check (stage in (
    'new_lead','meeting_booked','discovery_completed','proposal_sent','negotiation','won','lost'
  )),
  service_track text not null,
  budget_range text,
  timeline text,
  duration_minutes integer not null default 30,
  scheduled_slot_iso timestamptz,
  preferred_window text,
  timezone text not null default 'UTC',
  meeting_link text,
  project_summary text not null,
  current_stack text,
  next_follow_up_at timestamptz,
  notes text not null default '',
  activities jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_stage_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.crm_leads(id) on delete cascade,
  from_stage text,
  to_stage text not null,
  changed_by text not null,
  reason text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 5. Operational Follow-Up Tasks
-- ============================================================================
create table if not exists public.crm_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  status text not null default 'open' check (status in ('open','in_progress','completed','cancelled')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  due_at timestamptz,
  entity_type text check (entity_type is null or entity_type in ('lead','booking','application','job','general')),
  entity_id text,
  entity_label text,
  assigned_to_id text,
  assigned_to_email text,
  created_by_id text not null,
  created_by_email text not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 6. Event-Driven Business Intelligence Stream (Append-Only)
-- ============================================================================
create table if not exists public.business_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  module text not null,
  severity text not null default 'info' check (severity in ('info','attention','urgent')),
  actor_ref text not null,
  entity_type text not null,
  entity_id text not null,
  title text not null,
  summary text not null,
  source_href text not null,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text unique,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 7. AI Agent Conversations, Messages & Human-Approval Action Queue
-- ============================================================================
create table if not exists public.agent_conversations (
  id uuid primary key default gen_random_uuid(),
  actor_id text not null,
  actor_email text not null,
  title text not null,
  locale text not null default 'en',
  page_context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.agent_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  tool_calls jsonb not null default '[]'::jsonb,
  citations jsonb not null default '[]'::jsonb,
  pending_action jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_pending_actions (
  id uuid primary key default gen_random_uuid(),
  conversation_id text not null,
  actor_id text not null,
  actor_email text not null,
  tool_name text not null,
  summary text not null,
  args jsonb not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','expired','executed')),
  execution_result jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- ============================================================================
-- 8. Performance Indexes
-- ============================================================================
create index if not exists employees_role_idx on public.employees(role_key);
create index if not exists employees_status_idx on public.employees(status);
create index if not exists employees_auth_user_idx on public.employees(auth_user_id);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);
create index if not exists audit_logs_module_idx on public.audit_logs(module);
create index if not exists crm_leads_stage_idx on public.crm_leads(stage);
create index if not exists crm_leads_owner_idx on public.crm_leads(owner_employee_id);
create index if not exists crm_leads_created_idx on public.crm_leads(created_at desc);
create index if not exists crm_stage_history_lead_idx on public.crm_stage_history(lead_id, created_at desc);
create index if not exists crm_tasks_status_due_idx on public.crm_tasks(status, due_at);
create index if not exists crm_tasks_assignee_idx on public.crm_tasks(assigned_to_id);
create index if not exists business_events_created_idx on public.business_events(created_at desc);
create index if not exists business_events_module_idx on public.business_events(module);
create index if not exists agent_conversations_actor_idx on public.agent_conversations(actor_id, updated_at desc);
create index if not exists agent_pending_actor_idx on public.agent_pending_actions(actor_id, status);

-- ============================================================================
-- 9. Independent PostgreSQL RBAC & Record-Scope Helper Functions
--    Evaluates permissions strictly inside Postgres from auth.uid(),
--    independent of frontend or Next.js middleware authorization.
-- ============================================================================
create or replace function public.hirzexa_actor_role()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
begin
  if v_uid is null then
    return null;
  end if;

  if exists (select 1 from public.admin_users where id = v_uid) then
    return 'super_admin';
  end if;

  select e.role_key into v_role
  from public.employees e
  where e.auth_user_id = v_uid
    and e.status = 'active'
  limit 1;

  return v_role;
end;
$$;

create or replace function public.hirzexa_actor_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select e.id
  from public.employees e
  where e.auth_user_id = auth.uid()
    and e.status = 'active'
  limit 1;
$$;

create or replace function public.hirzexa_actor_scope()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_override text;
begin
  if v_uid is null then
    return null;
  end if;

  if exists (select 1 from public.admin_users where id = v_uid) then
    return 'all';
  end if;

  select e.role_key, e.scope_override
    into v_role, v_override
  from public.employees e
  where e.auth_user_id = v_uid
    and e.status = 'active'
  limit 1;

  if v_role is null then
    return null;
  end if;

  if v_override is not null then
    return v_override;
  end if;

  return case v_role
    when 'super_admin' then 'all'
    when 'administrator' then 'all'
    when 'sales_manager' then 'all'
    when 'hr_manager' then 'all'
    when 'marketing_specialist' then 'team'
    when 'project_manager' then 'team'
    when 'sales_rep' then 'assigned'
    when 'engineer' then 'assigned'
    when 'marketing_intern' then 'own'
    else 'own'
  end;
end;
$$;

create or replace function public.hirzexa_has_permission(p_module text, p_action text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_overrides jsonb;
  v_mod_override jsonb;
  v_allowed text[];
begin
  if v_uid is null then
    return false;
  end if;

  if exists (select 1 from public.admin_users where id = v_uid) then
    return true;
  end if;

  select e.role_key, e.permission_overrides
    into v_role, v_overrides
  from public.employees e
  where e.auth_user_id = v_uid
    and e.status = 'active'
  limit 1;

  if v_role is null then
    return false;
  end if;

  if v_role = 'super_admin' then
    return true;
  end if;

  -- Evaluate explicit per-employee JSONB module override if present
  if v_overrides is not null and jsonb_typeof(v_overrides -> p_module) = 'array' then
    v_mod_override := v_overrides -> p_module;
    return exists (
      select 1
      from jsonb_array_elements_text(v_mod_override) as act(val)
      where act.val = p_action or act.val = 'manage'
    );
  end if;

  -- Evaluate canonical 9-role RBAC matrix (mirrors lib/rbac.ts)
  v_allowed := case v_role
    when 'administrator' then case p_module
      when 'dashboard' then array['view','export']
      when 'crm' then array['view','create','edit','assign','export','manage']
      when 'bookings' then array['view','create','edit','assign','manage']
      when 'recruitment' then array['view','edit','assign','export','manage']
      when 'jobs' then array['view','create','edit','delete','manage']
      when 'products' then array['view','create','edit','delete','manage']
      when 'demonstrations' then array['view','edit','manage']
      when 'tasks' then array['view','create','edit','delete','assign','manage']
      when 'team' then array['view','create','edit']
      when 'audit' then array['view']
      when 'agent' then array['view','create']
      when 'settings' then array['view','edit']
      else array[]::text[]
    end
    when 'sales_manager' then case p_module
      when 'dashboard' then array['view']
      when 'crm' then array['view','create','edit','assign','export','manage']
      when 'bookings' then array['view','create','edit','assign','manage']
      when 'jobs' then array['view']
      when 'products' then array['view']
      when 'tasks' then array['view','create','edit','assign','manage']
      when 'agent' then array['view','create']
      else array[]::text[]
    end
    when 'sales_rep' then case p_module
      when 'dashboard' then array['view']
      when 'crm' then array['view','create','edit']
      when 'bookings' then array['view','edit']
      when 'products' then array['view']
      when 'tasks' then array['view','create','edit']
      when 'agent' then array['view','create']
      else array[]::text[]
    end
    when 'marketing_specialist' then case p_module
      when 'dashboard' then array['view']
      when 'crm' then array['view']
      when 'bookings' then array['view']
      when 'jobs' then array['view']
      when 'products' then array['view','edit']
      when 'demonstrations' then array['view','edit','manage']
      when 'tasks' then array['view','create','edit']
      when 'agent' then array['view','create']
      else array[]::text[]
    end
    when 'marketing_intern' then case p_module
      when 'dashboard' then array['view']
      when 'jobs' then array['view']
      when 'products' then array['view']
      when 'tasks' then array['view','create']
      when 'agent' then array['view']
      else array[]::text[]
    end
    when 'hr_manager' then case p_module
      when 'dashboard' then array['view']
      when 'recruitment' then array['view','create','edit','assign','export','manage']
      when 'jobs' then array['view','create','edit','delete','manage']
      when 'tasks' then array['view','create','edit','assign']
      when 'team' then array['view']
      when 'agent' then array['view','create']
      else array[]::text[]
    end
    when 'engineer' then case p_module
      when 'dashboard' then array['view']
      when 'bookings' then array['view']
      when 'products' then array['view','edit']
      when 'demonstrations' then array['view','edit']
      when 'jobs' then array['view']
      when 'tasks' then array['view','create','edit']
      when 'agent' then array['view']
      else array[]::text[]
    end
    when 'project_manager' then case p_module
      when 'dashboard' then array['view']
      when 'crm' then array['view']
      when 'bookings' then array['view']
      when 'products' then array['view']
      when 'jobs' then array['view']
      when 'tasks' then array['view','create','edit','assign','manage']
      when 'agent' then array['view','create']
      else array[]::text[]
    end
    else array[]::text[]
  end;

  return (p_action = any(v_allowed)) or ('manage' = any(v_allowed));
end;
$$;

create or replace function public.hirzexa_can_access_lead(p_owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (public.hirzexa_has_permission('crm', 'view') or public.hirzexa_has_permission('bookings', 'view'))
    and (
      public.hirzexa_actor_scope() in ('all', 'team')
      or (p_owner_id is not null and p_owner_id = public.hirzexa_actor_employee_id())
    );
$$;

create or replace function public.hirzexa_can_access_task(p_assigned_to_id text, p_created_by_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.hirzexa_has_permission('tasks', 'view')
    and (
      public.hirzexa_actor_scope() in ('all', 'team')
      or p_assigned_to_id = auth.uid()::text
      or p_assigned_to_id = public.hirzexa_actor_employee_id()::text
      or p_created_by_id = auth.uid()::text
      or p_created_by_id = public.hirzexa_actor_employee_id()::text
    );
$$;

-- Retain legacy helper name for backwards compatibility
create or replace function public.is_hirzexa_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.hirzexa_actor_role() is not null;
$$;

-- ============================================================================
-- 10. Narrow SECURITY DEFINER RPCs for Safe Public Ingestion & Token Activation
--     Allows public website forms & activation links to persist safely without
--     exposing raw table SELECT/UPDATE/DELETE privileges to the anon role.
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
    company_id = coalesce(excluded.company_id, public.crm_contacts.company_id),
    full_name = excluded.full_name,
    phone = coalesce(excluded.phone, public.crm_contacts.phone),
    role_title = coalesce(excluded.role_title, public.crm_contacts.role_title),
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
begin
  if p_event_type not in ('booking.created', 'proposal.created', 'application.received') then
    raise exception 'Event type not permitted for public ingestion';
  end if;
  if p_module not in ('bookings', 'crm', 'recruitment') then
    raise exception 'Module not permitted for public ingestion';
  end if;

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
    left(coalesce(p_source_href, '/admin'), 240),
    coalesce(p_payload, '{}'::jsonb),
    p_idempotency_key
  )
  on conflict (idempotency_key) do nothing
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.verify_employee_invitation(p_token_hash text)
returns table (
  invitation_id uuid,
  employee_id uuid,
  full_name text,
  email text,
  department text,
  role_key text,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select i.id, e.id, e.full_name, e.email, e.department, e.role_key, i.expires_at
  from public.employee_invitations i
  join public.employees e on e.id = i.employee_id
  where i.token_hash = p_token_hash
    and i.consumed_at is null
    and i.revoked_at is null
    and i.expires_at > now()
    and e.status <> 'suspended'
  limit 1;
$$;

create or replace function public.consume_employee_invitation(
  p_token_hash text,
  p_auth_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv_id uuid;
  v_emp_id uuid;
begin
  select i.id, i.employee_id into v_inv_id, v_emp_id
  from public.employee_invitations i
  join public.employees e on e.id = i.employee_id
  where i.token_hash = p_token_hash
    and i.consumed_at is null
    and i.revoked_at is null
    and i.expires_at > now()
    and e.status <> 'suspended'
  limit 1
  for update;

  if v_inv_id is null then
    return false;
  end if;

  update public.employee_invitations
  set consumed_at = now()
  where id = v_inv_id;

  update public.employees
  set auth_user_id = coalesce(p_auth_user_id, auth_user_id),
      status = 'active',
      updated_at = now()
  where id = v_emp_id;

  return true;
end;
$$;

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on table
  public.employees,
  public.employee_invitations,
  public.crm_companies,
  public.crm_contacts,
  public.crm_leads,
  public.crm_stage_history,
  public.crm_tasks,
  public.agent_conversations,
  public.agent_messages,
  public.agent_pending_actions
to authenticated, service_role;

grant select, insert on table
  public.audit_logs,
  public.business_events
to authenticated, service_role;

grant execute on function public.hirzexa_actor_role() to anon, authenticated, service_role;
grant execute on function public.hirzexa_actor_employee_id() to anon, authenticated, service_role;
grant execute on function public.hirzexa_actor_scope() to anon, authenticated, service_role;
grant execute on function public.hirzexa_has_permission(text, text) to anon, authenticated, service_role;
grant execute on function public.hirzexa_can_access_lead(uuid) to anon, authenticated, service_role;
grant execute on function public.hirzexa_can_access_task(text, text) to anon, authenticated, service_role;
grant execute on function public.is_hirzexa_staff() to anon, authenticated, service_role;
grant execute on function public.ingest_public_crm_lead to anon, authenticated, service_role;
grant execute on function public.ingest_public_business_event to anon, authenticated, service_role;
grant execute on function public.verify_employee_invitation to anon, authenticated, service_role;
grant execute on function public.consume_employee_invitation to anon, authenticated, service_role;

-- ============================================================================
-- 11. Granular Row-Level Security Policies (Independent of Frontend/Node RBAC)
-- ============================================================================
alter table public.employees enable row level security;
alter table public.employee_invitations enable row level security;
alter table public.audit_logs enable row level security;
alter table public.crm_companies enable row level security;
alter table public.crm_contacts enable row level security;
alter table public.crm_leads enable row level security;
alter table public.crm_stage_history enable row level security;
alter table public.crm_tasks enable row level security;
alter table public.business_events enable row level security;
alter table public.agent_conversations enable row level security;
alter table public.agent_messages enable row level security;
alter table public.agent_pending_actions enable row level security;

-- Drop any broad prototype policies if present
drop policy if exists "staff access employees" on public.employees;
drop policy if exists "staff access invitations" on public.employee_invitations;
drop policy if exists "staff access audit logs" on public.audit_logs;
drop policy if exists "staff access crm_companies" on public.crm_companies;
drop policy if exists "staff access crm_contacts" on public.crm_contacts;
drop policy if exists "staff access crm_leads" on public.crm_leads;
drop policy if exists "staff access crm_stage_history" on public.crm_stage_history;
drop policy if exists "staff access crm_tasks" on public.crm_tasks;
drop policy if exists "staff access business_events" on public.business_events;
drop policy if exists "staff access agent_conversations" on public.agent_conversations;
drop policy if exists "staff access agent_messages" on public.agent_messages;
drop policy if exists "staff access agent_pending_actions" on public.agent_pending_actions;

-- employees: view self or team:view; create/edit require team permissions; prevent self-escalation
drop policy if exists "employees_select_rbac" on public.employees;
create policy "employees_select_rbac" on public.employees
  for select using (
    auth_user_id = auth.uid()
    or public.hirzexa_has_permission('team', 'view')
  );

drop policy if exists "employees_insert_rbac" on public.employees;
create policy "employees_insert_rbac" on public.employees
  for insert with check (
    public.hirzexa_has_permission('team', 'create')
    and (role_key <> 'super_admin' or public.hirzexa_actor_role() = 'super_admin')
  );

drop policy if exists "employees_update_rbac" on public.employees;
create policy "employees_update_rbac" on public.employees
  for update using (
    public.hirzexa_has_permission('team', 'edit')
    and (role_key <> 'super_admin' or public.hirzexa_actor_role() = 'super_admin')
  )
  with check (
    public.hirzexa_has_permission('team', 'edit')
    and (role_key <> 'super_admin' or public.hirzexa_actor_role() = 'super_admin')
  );

drop policy if exists "employees_delete_super_admin" on public.employees;
create policy "employees_delete_super_admin" on public.employees
  for delete using (public.hirzexa_actor_role() = 'super_admin');

-- employee_invitations: strictly restricted to team:create (no non-admin token hash exposure)
drop policy if exists "invitations_manage_rbac" on public.employee_invitations;
create policy "invitations_manage_rbac" on public.employee_invitations
  for all using (public.hirzexa_has_permission('team', 'create'))
  with check (public.hirzexa_has_permission('team', 'create'));

-- audit_logs: strictly APPEND-ONLY; readable only by audit:view (Super Admin / Administrator)
drop policy if exists "audit_logs_select_rbac" on public.audit_logs;
create policy "audit_logs_select_rbac" on public.audit_logs
  for select using (public.hirzexa_has_permission('audit', 'view'));

drop policy if exists "audit_logs_insert_staff" on public.audit_logs;
create policy "audit_logs_insert_staff" on public.audit_logs
  for insert with check (public.hirzexa_actor_role() is not null);
-- Intentionally NO UPDATE or DELETE policy on public.audit_logs.

-- crm_companies & crm_contacts
drop policy if exists "crm_companies_select_rbac" on public.crm_companies;
create policy "crm_companies_select_rbac" on public.crm_companies
  for select using (
    public.hirzexa_has_permission('crm', 'view')
    or public.hirzexa_has_permission('bookings', 'view')
  );

drop policy if exists "crm_companies_write_rbac" on public.crm_companies;
create policy "crm_companies_write_rbac" on public.crm_companies
  for insert with check (public.hirzexa_has_permission('crm', 'create'));

drop policy if exists "crm_companies_update_rbac" on public.crm_companies;
create policy "crm_companies_update_rbac" on public.crm_companies
  for update using (public.hirzexa_has_permission('crm', 'edit'))
  with check (public.hirzexa_has_permission('crm', 'edit'));

drop policy if exists "crm_contacts_select_rbac" on public.crm_contacts;
create policy "crm_contacts_select_rbac" on public.crm_contacts
  for select using (
    public.hirzexa_has_permission('crm', 'view')
    or public.hirzexa_has_permission('bookings', 'view')
  );

drop policy if exists "crm_contacts_write_rbac" on public.crm_contacts;
create policy "crm_contacts_write_rbac" on public.crm_contacts
  for insert with check (public.hirzexa_has_permission('crm', 'create'));

drop policy if exists "crm_contacts_update_rbac" on public.crm_contacts;
create policy "crm_contacts_update_rbac" on public.crm_contacts
  for update using (public.hirzexa_has_permission('crm', 'edit'))
  with check (public.hirzexa_has_permission('crm', 'edit'));

-- crm_leads: role + record-owner scope isolation enforced inside Postgres
drop policy if exists "crm_leads_select_scoped" on public.crm_leads;
create policy "crm_leads_select_scoped" on public.crm_leads
  for select using (public.hirzexa_can_access_lead(owner_employee_id));

drop policy if exists "crm_leads_insert_rbac" on public.crm_leads;
create policy "crm_leads_insert_rbac" on public.crm_leads
  for insert with check (public.hirzexa_has_permission('crm', 'create'));

drop policy if exists "crm_leads_update_scoped" on public.crm_leads;
create policy "crm_leads_update_scoped" on public.crm_leads
  for update using (
    public.hirzexa_has_permission('crm', 'edit')
    and public.hirzexa_can_access_lead(owner_employee_id)
  )
  with check (
    public.hirzexa_has_permission('crm', 'edit')
    and public.hirzexa_can_access_lead(owner_employee_id)
  );

drop policy if exists "crm_leads_delete_rbac" on public.crm_leads;
create policy "crm_leads_delete_rbac" on public.crm_leads
  for delete using (public.hirzexa_has_permission('crm', 'delete'));

-- crm_stage_history: append-only for authorized CRM users
drop policy if exists "crm_stage_history_select_rbac" on public.crm_stage_history;
create policy "crm_stage_history_select_rbac" on public.crm_stage_history
  for select using (
    exists (
      select 1 from public.crm_leads l
      where l.id = lead_id and public.hirzexa_can_access_lead(l.owner_employee_id)
    )
  );

drop policy if exists "crm_stage_history_insert_rbac" on public.crm_stage_history;
create policy "crm_stage_history_insert_rbac" on public.crm_stage_history
  for insert with check (
    public.hirzexa_has_permission('crm', 'edit')
    or public.hirzexa_has_permission('crm', 'create')
  );

-- crm_tasks: scoped per user/team/all
drop policy if exists "crm_tasks_select_scoped" on public.crm_tasks;
create policy "crm_tasks_select_scoped" on public.crm_tasks
  for select using (public.hirzexa_can_access_task(assigned_to_id, created_by_id));

drop policy if exists "crm_tasks_insert_rbac" on public.crm_tasks;
create policy "crm_tasks_insert_rbac" on public.crm_tasks
  for insert with check (public.hirzexa_has_permission('tasks', 'create'));

drop policy if exists "crm_tasks_update_scoped" on public.crm_tasks;
create policy "crm_tasks_update_scoped" on public.crm_tasks
  for update using (
    public.hirzexa_has_permission('tasks', 'edit')
    and public.hirzexa_can_access_task(assigned_to_id, created_by_id)
  )
  with check (
    public.hirzexa_has_permission('tasks', 'edit')
    and public.hirzexa_can_access_task(assigned_to_id, created_by_id)
  );

drop policy if exists "crm_tasks_delete_rbac" on public.crm_tasks;
create policy "crm_tasks_delete_rbac" on public.crm_tasks
  for delete using (public.hirzexa_has_permission('tasks', 'delete'));

-- business_events: append-only & PER-ROW MODULE RBAC enforced directly in Postgres!
drop policy if exists "business_events_select_module_rbac" on public.business_events;
create policy "business_events_select_module_rbac" on public.business_events
  for select using (public.hirzexa_has_permission(module, 'view'));

drop policy if exists "business_events_insert_staff" on public.business_events;
create policy "business_events_insert_staff" on public.business_events
  for insert with check (public.hirzexa_actor_role() is not null);
-- Intentionally NO UPDATE or DELETE policy on public.business_events.

-- agent_conversations / agent_messages / agent_pending_actions: strict per-actor isolation
drop policy if exists "agent_conversations_owner_only" on public.agent_conversations;
create policy "agent_conversations_owner_only" on public.agent_conversations
  for all using (
    public.hirzexa_has_permission('agent', 'view')
    and (actor_id = auth.uid()::text or public.hirzexa_actor_role() = 'super_admin')
  )
  with check (
    public.hirzexa_has_permission('agent', 'view')
    and actor_id = auth.uid()::text
  );

drop policy if exists "agent_messages_owner_only" on public.agent_messages;
create policy "agent_messages_owner_only" on public.agent_messages
  for all using (
    exists (
      select 1 from public.agent_conversations c
      where c.id = conversation_id
        and (c.actor_id = auth.uid()::text or public.hirzexa_actor_role() = 'super_admin')
    )
  )
  with check (
    exists (
      select 1 from public.agent_conversations c
      where c.id = conversation_id
        and c.actor_id = auth.uid()::text
    )
  );

drop policy if exists "agent_pending_actions_owner_only" on public.agent_pending_actions;
create policy "agent_pending_actions_owner_only" on public.agent_pending_actions
  for all using (
    actor_id = auth.uid()::text or public.hirzexa_actor_role() = 'super_admin'
  )
  with check (
    actor_id = auth.uid()::text
  );

-- ============================================================================
-- 12. Additive RBAC Policies on Pre-Existing Recruitment Tables
--     Preserves existing admin_users policies; adds scoped HR employee access.
-- ============================================================================
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'job_applications') then
    execute 'drop policy if exists "rbac_hr_read_applications" on public.job_applications';
    execute 'create policy "rbac_hr_read_applications" on public.job_applications for select using (public.hirzexa_has_permission(''recruitment'', ''view''))';
    execute 'drop policy if exists "rbac_hr_update_applications" on public.job_applications';
    execute 'create policy "rbac_hr_update_applications" on public.job_applications for update using (public.hirzexa_has_permission(''recruitment'', ''edit''))';
  end if;

  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'application_notes') then
    execute 'drop policy if exists "rbac_hr_manage_application_notes" on public.application_notes';
    execute 'create policy "rbac_hr_manage_application_notes" on public.application_notes for all using (public.hirzexa_has_permission(''recruitment'', ''edit'')) with check (public.hirzexa_has_permission(''recruitment'', ''edit''))';
  end if;
end $$;

-- Reload PostgREST schema cache immediately so all 12 tables and 11 functions are exposed
notify pgrst, 'reload schema';
