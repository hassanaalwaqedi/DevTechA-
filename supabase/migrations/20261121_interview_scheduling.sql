-- HIRZEXA Intelligence — Enterprise Recruitment Interview Scheduling Migration (2026-11-21)
-- Additive, idempotent, non-destructive migration.
-- DO NOT APPLY TO PRODUCTION WITHOUT EXPLICIT APPROVAL.
--
-- Introduces 7 normalized tables with strict separation of concerns:
--   1. interviewer_availability            (working hours, buffers, notice, advance window)
--   2. interviewer_availability_exceptions (date blocks, holidays, absences, custom overrides)
--   3. interview_invitations               (SHA-256 token hash only; distinct invitation & delivery states)
--   4. interview_appointments              (UTC slots + PostgreSQL GIST exclusion constraint preventing double-booking)
--   5. interview_activity_history          (immutable recruitment scheduling timeline)
--   6. interview_email_events              (idempotent transactional delivery log + webhook tracking)
--   7. interview_reminders                 (persistent, idempotent 24h/1h reminder queue)
--
-- Plus independent PostgreSQL RLS for the `interviews` module and narrow SECURITY DEFINER RPCs
-- so public candidate booking links NEVER inherit admin privileges or expose other candidates.

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

-- ============================================================================
-- 1. Interviewer Weekly Availability & Scheduling Rules
-- ============================================================================
create table if not exists public.interviewer_availability (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  timezone text not null default 'UTC',
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_minute integer not null check (start_minute >= 0 and start_minute < 1440),
  end_minute integer not null check (end_minute > start_minute and end_minute <= 1440),
  slot_duration_minutes integer not null default 30 check (slot_duration_minutes in (15, 20, 30, 45, 60, 90)),
  min_notice_hours integer not null default 12 check (min_notice_hours >= 0 and min_notice_hours <= 336),
  buffer_before_minutes integer not null default 10 check (buffer_before_minutes >= 0 and buffer_before_minutes <= 120),
  buffer_after_minutes integer not null default 10 check (buffer_after_minutes >= 0 and buffer_after_minutes <= 120),
  max_advance_days integer not null default 21 check (max_advance_days >= 1 and max_advance_days <= 90),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, day_of_week, start_minute, end_minute)
);

-- ============================================================================
-- 2. Interviewer Date Exceptions (Holidays, Absences, Specific Date Blocks)
-- ============================================================================
create table if not exists public.interviewer_availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  exception_date date not null,
  is_unavailable boolean not null default true,
  start_minute integer check (start_minute is null or (start_minute >= 0 and start_minute < 1440)),
  end_minute integer check (end_minute is null or (end_minute > 0 and end_minute <= 1440)),
  reason text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 3. Interview Invitations (SHA-256 Token Hash Only — Never Plaintext!)
-- ============================================================================
create table if not exists public.interview_invitations (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.job_applications(id) on delete set null,
  application_reference_id text not null,
  candidate_name text not null,
  candidate_email text not null,
  position_title text not null,
  interview_stage text not null default 'initial_hr_screening',
  interview_type text not null check (interview_type in (
    'initial_hr_screening',
    'technical_interview',
    'hiring_manager_interview',
    'final_interview'
  )),
  interview_format text not null check (interview_format in (
    'online_video',
    'phone',
    'in_person'
  )),
  duration_minutes integer not null default 30 check (duration_minutes in (15, 20, 30, 45, 60, 90)),
  interviewer_employee_id uuid not null references public.employees(id) on delete restrict,
  interviewer_name text not null,
  interviewer_email text not null,
  interviewer_timezone text not null default 'UTC',
  availability_window_start date,
  availability_window_end date,
  meeting_url text,
  location_details text,
  personalized_message text not null default '',
  locale text not null default 'en' check (locale in ('en', 'ar')),
  token_hash text unique not null,
  status text not null default 'draft' check (status in (
    'draft', 'pending_send', 'sent', 'scheduled', 'expired', 'revoked'
  )),
  email_delivery_status text not null default 'created' check (email_delivery_status in (
    'created', 'sending', 'accepted_by_provider', 'delivered', 'delivery_failed', 'bounced', 'complained'
  )),
  provider_message_id text,
  delivery_error text,
  expires_at timestamptz not null,
  sent_at timestamptz,
  delivered_at timestamptz,
  scheduled_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 4. Interview Appointments (Concurrency-Safe Exclusion Constraint!)
-- ============================================================================
create table if not exists public.interview_appointments (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.interview_invitations(id) on delete cascade,
  application_id uuid references public.job_applications(id) on delete set null,
  application_reference_id text not null,
  candidate_name text not null,
  candidate_email text not null,
  position_title text not null,
  interview_stage text not null,
  interview_type text not null,
  interview_format text not null,
  duration_minutes integer not null,
  interviewer_employee_id uuid not null references public.employees(id) on delete restrict,
  interviewer_name text not null,
  interviewer_email text not null,
  scheduled_start_utc timestamptz not null,
  scheduled_end_utc timestamptz not null,
  candidate_timezone text not null default 'UTC',
  interviewer_timezone text not null default 'UTC',
  meeting_url text,
  location_details text,
  status text not null default 'confirmed' check (status in (
    'confirmed', 'completed', 'canceled', 'no_show'
  )),
  outcome text not null default 'pending' check (outcome in (
    'pending', 'follow_up_required', 'advance', 'hold', 'decline'
  )),
  outcome_notes text not null default '',
  reschedule_count integer not null default 0,
  canceled_at timestamptz,
  cancel_reason text,
  external_calendar_provider text,
  external_calendar_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (scheduled_end_utc > scheduled_start_utc)
);

-- Database-level double-booking impossibility for overlapping confirmed interviewer slots
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'interview_appointments_no_overlap_excl'
  ) then
    alter table public.interview_appointments
      add constraint interview_appointments_no_overlap_excl
      exclude using gist (
        interviewer_employee_id with =,
        tstzrange(scheduled_start_utc, scheduled_end_utc, '[)') with &&
      ) where (status = 'confirmed');
  end if;
end $$;

-- ============================================================================
-- 5. Immutable Interview Activity History
-- ============================================================================
create table if not exists public.interview_activity_history (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid references public.interview_invitations(id) on delete cascade,
  appointment_id uuid references public.interview_appointments(id) on delete cascade,
  application_reference_id text not null,
  event_type text not null,
  actor_ref text not null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 6. Interview Transactional Email Delivery Events (Idempotent + Webhook Sync)
-- ============================================================================
create table if not exists public.interview_email_events (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid references public.interview_invitations(id) on delete cascade,
  appointment_id uuid references public.interview_appointments(id) on delete cascade,
  template_type text not null,
  recipient_email text not null,
  idempotency_key text unique not null,
  provider text not null default 'resend',
  provider_message_id text,
  delivery_status text not null default 'created' check (delivery_status in (
    'created', 'sending', 'accepted_by_provider', 'delivered', 'delivery_failed', 'bounced', 'complained'
  )),
  last_webhook_event text,
  error_detail text,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 7. Persistent Idempotent Interview Reminders (24h & 1h Before Confirmed Slot)
-- ============================================================================
create table if not exists public.interview_reminders (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.interview_appointments(id) on delete cascade,
  reminder_kind text not null check (reminder_kind in ('24h', '1h')),
  scheduled_for_utc timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'canceled', 'failed')),
  idempotency_key text unique not null,
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  provider_message_id text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Performance Indexes
create index if not exists interviewer_avail_emp_idx on public.interviewer_availability(employee_id, day_of_week);
create index if not exists interviewer_exc_emp_date_idx on public.interviewer_availability_exceptions(employee_id, exception_date);
create index if not exists interview_inv_app_ref_idx on public.interview_invitations(application_reference_id);
create index if not exists interview_inv_interviewer_idx on public.interview_invitations(interviewer_employee_id, status);
create index if not exists interview_inv_msg_id_idx on public.interview_invitations(provider_message_id) where provider_message_id is not null;
create index if not exists interview_appt_interviewer_time_idx on public.interview_appointments(interviewer_employee_id, scheduled_start_utc);
create index if not exists interview_appt_status_time_idx on public.interview_appointments(status, scheduled_start_utc);
create index if not exists interview_appt_app_ref_idx on public.interview_appointments(application_reference_id);
create index if not exists interview_history_app_idx on public.interview_activity_history(application_reference_id, created_at desc);
create index if not exists interview_email_msg_idx on public.interview_email_events(provider_message_id) where provider_message_id is not null;
create index if not exists interview_reminders_due_idx on public.interview_reminders(status, scheduled_for_utc) where status = 'pending';

-- ============================================================================
-- 8. Update Independent PostgreSQL RBAC Matrix for `interviews` Module
-- ============================================================================
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

  if v_overrides is not null and jsonb_typeof(v_overrides -> p_module) = 'array' then
    v_mod_override := v_overrides -> p_module;
    return exists (
      select 1
      from jsonb_array_elements_text(v_mod_override) as act(val)
      where act.val = p_action or act.val = 'manage'
    );
  end if;

  v_allowed := case v_role
    when 'administrator' then case p_module
      when 'dashboard' then array['view','export']
      when 'crm' then array['view','create','edit','assign','export','manage']
      when 'bookings' then array['view','create','edit','assign','manage']
      when 'recruitment' then array['view','edit','assign','export','manage']
      when 'interviews' then array['view','create','edit','assign','manage']
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
      when 'interviews' then array['view','create','edit','assign','export','manage']
      when 'jobs' then array['view','create','edit','delete','manage']
      when 'tasks' then array['view','create','edit','assign']
      when 'team' then array['view']
      when 'agent' then array['view','create']
      else array[]::text[]
    end
    when 'engineer' then case p_module
      when 'dashboard' then array['view']
      when 'bookings' then array['view']
      when 'interviews' then array['view']
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
      when 'interviews' then array['view']
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

create or replace function public.hirzexa_can_access_interview(p_interviewer_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.hirzexa_has_permission('interviews', 'view')
    and (
      public.hirzexa_has_permission('interviews', 'manage')
      or public.hirzexa_has_permission('recruitment', 'view')
      or (p_interviewer_employee_id is not null and p_interviewer_employee_id = public.hirzexa_actor_employee_id())
    );
$$;

-- ============================================================================
-- 9. Narrow SECURITY DEFINER RPCs for Public Candidate Self-Service Booking
--    Zero raw table privileges are granted to `anon`.
-- ============================================================================
create or replace function public.lookup_interview_invitation_by_hash(p_token_hash text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_inv record;
  v_appt record;
begin
  select * into v_inv
  from public.interview_invitations
  where token_hash = p_token_hash
  limit 1;

  if not found then
    return null;
  end if;

  select * into v_appt
  from public.interview_appointments
  where invitation_id = v_inv.id
  order by created_at desc
  limit 1;

  return jsonb_build_object(
    'invitation', to_jsonb(v_inv) - 'token_hash',
    'appointment', case when v_appt.id is not null then to_jsonb(v_appt) else null end
  );
end;
$$;

create or replace function public.reserve_interview_slot_atomic(
  p_token_hash text,
  p_start_utc timestamptz,
  p_end_utc timestamptz,
  p_candidate_timezone text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv record;
  v_existing record;
  v_appt_id uuid;
begin
  -- Lock the invitation row to make repeated confirmations idempotent
  select * into v_inv
  from public.interview_invitations
  where token_hash = p_token_hash
  for update;

  if not found then
    raise exception 'INVALID_TOKEN';
  end if;

  if v_inv.status = 'revoked' then
    raise exception 'INVITATION_REVOKED';
  end if;

  if v_inv.status = 'expired' or v_inv.expires_at <= now() then
    update public.interview_invitations set status = 'expired', updated_at = now() where id = v_inv.id;
    raise exception 'INVITATION_EXPIRED';
  end if;

  -- Idempotency: if already scheduled for this exact slot, return existing appointment
  select * into v_existing
  from public.interview_appointments
  where invitation_id = v_inv.id
    and status = 'confirmed'
  limit 1;

  if found then
    return jsonb_build_object('appointment', to_jsonb(v_existing), 'idempotent', true);
  end if;

  if v_inv.status not in ('sent', 'pending_send', 'draft') then
    raise exception 'INVITATION_NOT_BOOKABLE';
  end if;

  -- Exclusion constraint `interview_appointments_no_overlap_excl` enforces atomicity against concurrent double-booking
  insert into public.interview_appointments (
    invitation_id, application_id, application_reference_id,
    candidate_name, candidate_email, position_title,
    interview_stage, interview_type, interview_format, duration_minutes,
    interviewer_employee_id, interviewer_name, interviewer_email,
    scheduled_start_utc, scheduled_end_utc,
    candidate_timezone, interviewer_timezone,
    meeting_url, location_details, status
  )
  values (
    v_inv.id, v_inv.application_id, v_inv.application_reference_id,
    v_inv.candidate_name, v_inv.candidate_email, v_inv.position_title,
    v_inv.interview_stage, v_inv.interview_type, v_inv.interview_format, v_inv.duration_minutes,
    v_inv.interviewer_employee_id, v_inv.interviewer_name, v_inv.interviewer_email,
    p_start_utc, p_end_utc,
    coalesce(nullif(trim(p_candidate_timezone), ''), 'UTC'),
    v_inv.interviewer_timezone,
    v_inv.meeting_url, v_inv.location_details, 'confirmed'
  )
  returning id into v_appt_id;

  update public.interview_invitations
  set status = 'scheduled',
      scheduled_at = now(),
      updated_at = now()
  where id = v_inv.id;

  -- Queue idempotent 24h & 1h reminders strictly for future times
  if p_start_utc - interval '24 hours' > now() then
    insert into public.interview_reminders (appointment_id, reminder_kind, scheduled_for_utc, idempotency_key)
    values (v_appt_id, '24h', p_start_utc - interval '24 hours', 'rem:' || v_appt_id::text || ':24h:0')
    on conflict (idempotency_key) do nothing;
  end if;

  if p_start_utc - interval '1 hour' > now() then
    insert into public.interview_reminders (appointment_id, reminder_kind, scheduled_for_utc, idempotency_key)
    values (v_appt_id, '1h', p_start_utc - interval '1 hour', 'rem:' || v_appt_id::text || ':1h:0')
    on conflict (idempotency_key) do nothing;
  end if;

  insert into public.interview_activity_history (
    invitation_id, appointment_id, application_reference_id, event_type, actor_ref, summary, metadata
  )
  values (
    v_inv.id, v_appt_id, v_inv.application_reference_id, 'candidate_scheduled',
    v_inv.candidate_email,
    'Candidate confirmed interview slot (' || to_char(p_start_utc at time zone 'UTC', 'YYYY-MM-DD HH24:MI') || ' UTC).',
    jsonb_build_object('startUtc', p_start_utc, 'endUtc', p_end_utc, 'candidateTimezone', p_candidate_timezone)
  );

  select * into v_existing from public.interview_appointments where id = v_appt_id;
  return jsonb_build_object('appointment', to_jsonb(v_existing), 'idempotent', false);
exception
  when exclusion_violation then
    raise exception 'SLOT_CONFLICT';
end;
$$;

create or replace function public.record_interview_email_webhook(
  p_provider_message_id text,
  p_delivery_status text,
  p_event_type text,
  p_error text default null
)
returns table (
  invitation_id uuid,
  application_reference_id text,
  recipient_email text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv_id uuid;
  v_app_ref text;
  v_recipient text;
begin
  update public.interview_email_events
  set delivery_status = case
        when delivery_status = 'delivered' and p_delivery_status = 'accepted_by_provider' then 'delivered'
        else p_delivery_status
      end,
      last_webhook_event = p_event_type,
      error_detail = coalesce(p_error, error_detail),
      delivered_at = case when p_delivery_status = 'delivered' then coalesce(delivered_at, now()) else delivered_at end,
      updated_at = now()
  where provider_message_id = p_provider_message_id
  returning interview_email_events.invitation_id, interview_email_events.recipient_email
  into v_inv_id, v_recipient;

  if v_inv_id is not null then
    update public.interview_invitations
    set email_delivery_status = case
          when email_delivery_status = 'delivered' and p_delivery_status = 'accepted_by_provider' then 'delivered'
          else p_delivery_status
        end,
        delivery_error = coalesce(p_error, delivery_error),
        delivered_at = case when p_delivery_status = 'delivered' then coalesce(delivered_at, now()) else delivered_at end,
        updated_at = now()
    where id = v_inv_id
      and provider_message_id = p_provider_message_id
    returning interview_invitations.application_reference_id into v_app_ref;

    return query select v_inv_id, coalesce(v_app_ref, ''), coalesce(v_recipient, '');
  end if;
end;
$$;

-- ============================================================================
-- 10. Grants & Independent Row-Level Security Policies
-- ============================================================================
grant select, insert, update, delete on table
  public.interviewer_availability,
  public.interviewer_availability_exceptions,
  public.interview_invitations,
  public.interview_appointments,
  public.interview_reminders
to authenticated, service_role;

grant select, insert on table
  public.interview_activity_history,
  public.interview_email_events
to authenticated, service_role;

grant update on table public.interview_email_events to authenticated, service_role;

grant execute on function public.hirzexa_can_access_interview(uuid) to anon, authenticated, service_role;
grant execute on function public.lookup_interview_invitation_by_hash(text) to anon, authenticated, service_role;
grant execute on function public.reserve_interview_slot_atomic(text, timestamptz, timestamptz, text) to anon, authenticated, service_role;
grant execute on function public.record_interview_email_webhook(text, text, text, text) to anon, authenticated, service_role;

alter table public.interviewer_availability enable row level security;
alter table public.interviewer_availability_exceptions enable row level security;
alter table public.interview_invitations enable row level security;
alter table public.interview_appointments enable row level security;
alter table public.interview_activity_history enable row level security;
alter table public.interview_email_events enable row level security;
alter table public.interview_reminders enable row level security;

-- interviewer_availability
drop policy if exists "interviewer_availability_select_rbac" on public.interviewer_availability;
create policy "interviewer_availability_select_rbac" on public.interviewer_availability
  for select using (
    public.hirzexa_can_access_interview(employee_id)
  );

drop policy if exists "interviewer_availability_manage_rbac" on public.interviewer_availability;
create policy "interviewer_availability_manage_rbac" on public.interviewer_availability
  for all using (
    public.hirzexa_has_permission('interviews', 'manage')
    or (public.hirzexa_has_permission('interviews', 'view') and employee_id = public.hirzexa_actor_employee_id())
  )
  with check (
    public.hirzexa_has_permission('interviews', 'manage')
    or (public.hirzexa_has_permission('interviews', 'view') and employee_id = public.hirzexa_actor_employee_id())
  );

-- interviewer_availability_exceptions
drop policy if exists "interviewer_exceptions_select_rbac" on public.interviewer_availability_exceptions;
create policy "interviewer_exceptions_select_rbac" on public.interviewer_availability_exceptions
  for select using (
    public.hirzexa_can_access_interview(employee_id)
  );

drop policy if exists "interviewer_exceptions_manage_rbac" on public.interviewer_availability_exceptions;
create policy "interviewer_exceptions_manage_rbac" on public.interviewer_availability_exceptions
  for all using (
    public.hirzexa_has_permission('interviews', 'manage')
    or (public.hirzexa_has_permission('interviews', 'view') and employee_id = public.hirzexa_actor_employee_id())
  )
  with check (
    public.hirzexa_has_permission('interviews', 'manage')
    or (public.hirzexa_has_permission('interviews', 'view') and employee_id = public.hirzexa_actor_employee_id())
  );

-- interview_invitations
drop policy if exists "interview_invitations_select_rbac" on public.interview_invitations;
create policy "interview_invitations_select_rbac" on public.interview_invitations
  for select using (public.hirzexa_can_access_interview(interviewer_employee_id));

drop policy if exists "interview_invitations_write_rbac" on public.interview_invitations;
create policy "interview_invitations_write_rbac" on public.interview_invitations
  for insert with check (public.hirzexa_has_permission('interviews', 'create'));

drop policy if exists "interview_invitations_update_rbac" on public.interview_invitations;
create policy "interview_invitations_update_rbac" on public.interview_invitations
  for update using (public.hirzexa_has_permission('interviews', 'edit'))
  with check (public.hirzexa_has_permission('interviews', 'edit'));

-- interview_appointments
drop policy if exists "interview_appointments_select_rbac" on public.interview_appointments;
create policy "interview_appointments_select_rbac" on public.interview_appointments
  for select using (public.hirzexa_can_access_interview(interviewer_employee_id));

drop policy if exists "interview_appointments_write_rbac" on public.interview_appointments;
create policy "interview_appointments_write_rbac" on public.interview_appointments
  for insert with check (public.hirzexa_has_permission('interviews', 'create'));

drop policy if exists "interview_appointments_update_rbac" on public.interview_appointments;
create policy "interview_appointments_update_rbac" on public.interview_appointments
  for update using (
    public.hirzexa_has_permission('interviews', 'edit')
    and public.hirzexa_can_access_interview(interviewer_employee_id)
  )
  with check (
    public.hirzexa_has_permission('interviews', 'edit')
    and public.hirzexa_can_access_interview(interviewer_employee_id)
  );

-- interview_activity_history (append-only)
drop policy if exists "interview_history_select_rbac" on public.interview_activity_history;
create policy "interview_history_select_rbac" on public.interview_activity_history
  for select using (
    public.hirzexa_has_permission('interviews', 'manage')
    or public.hirzexa_has_permission('recruitment', 'view')
    or exists (
      select 1 from public.interview_invitations i
      where i.id = invitation_id and public.hirzexa_can_access_interview(i.interviewer_employee_id)
    )
  );

drop policy if exists "interview_history_insert_rbac" on public.interview_activity_history;
create policy "interview_history_insert_rbac" on public.interview_activity_history
  for insert with check (public.hirzexa_has_permission('interviews', 'view'));

-- interview_email_events & interview_reminders
drop policy if exists "interview_email_events_rbac" on public.interview_email_events;
create policy "interview_email_events_rbac" on public.interview_email_events
  for all using (public.hirzexa_has_permission('interviews', 'manage') or public.hirzexa_has_permission('recruitment', 'view'))
  with check (public.hirzexa_has_permission('interviews', 'create'));

drop policy if exists "interview_reminders_rbac" on public.interview_reminders;
create policy "interview_reminders_rbac" on public.interview_reminders
  for all using (public.hirzexa_has_permission('interviews', 'manage') or public.hirzexa_has_permission('recruitment', 'view'))
  with check (public.hirzexa_has_permission('interviews', 'create'));

notify pgrst, 'reload schema';
