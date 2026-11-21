-- HIRZEXA Intelligence — CRM Assignment & Record-Scope RLS Fix (2026-11-21)
-- Additive, idempotent, non-destructive migration.
-- DO NOT APPLY TO PRODUCTION WITHOUT EXPLICIT APPROVAL.
--
-- Fixes:
-- 1. Enforces strict department matching (fail-closed) for Team scope on crm_leads
--    so Team scope NEVER exposes Unassigned (owner_employee_id IS NULL) or
--    other-department leads.
-- 2. Keeps Assigned/Own scope strictly bound to owner_employee_id = hirzexa_actor_employee_id().
-- 3. Adds hirzexa_resolve_lead_owners(uuid[]) SECURITY DEFINER helper so authorized
--    viewers without team:view see real owner names/departments instead of "Unassigned".
-- 4. Enforces lead-level scope on business_events for lead/booking entities so
--    Assigned-scope reps never see other reps' lead activity events.
-- 5. Safely backfills legacy visitor_events CRM records into normalized crm_leads
--    and reconciles missing owner_employee_id values (matching employees.id,
--    employees.auth_user_id, or lower(employees.email)) without overwriting
--    any existing non-null crm_leads.owner_employee_id.

-- ============================================================================
-- 1. Strict Record-Scope Access Function for CRM Leads
-- ============================================================================
create or replace function public.hirzexa_can_access_lead(p_owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (public.hirzexa_has_permission('crm', 'view') or public.hirzexa_has_permission('bookings', 'view'))
    and (
      public.hirzexa_actor_scope() = 'all'
      or (
        p_owner_id is not null
        and (
          p_owner_id = public.hirzexa_actor_employee_id()
          or (
            public.hirzexa_actor_scope() = 'team'
            and exists (
              select 1
              from public.employees owner_emp
              join public.employees actor_emp
                on actor_emp.auth_user_id = auth.uid()
               and actor_emp.status = 'active'
              where owner_emp.id = p_owner_id
                and nullif(trim(owner_emp.department), '') is not null
                and nullif(trim(actor_emp.department), '') is not null
                and lower(trim(owner_emp.department)) = lower(trim(actor_emp.department))
            )
          )
        )
      )
    );
$$;

-- ============================================================================
-- 2. Safe Scoped Owner Metadata Resolver (fixes false "Unassigned" display)
--    Returns (id, full_name, email, department) ONLY for owners of crm_leads
--    that the calling actor is already authorized to access, or if the actor
--    holds team:view. Does NOT relax employees_select_rbac.
-- ============================================================================
create or replace function public.hirzexa_resolve_lead_owners(p_owner_ids uuid[])
returns table (
  id uuid,
  full_name text,
  email text,
  department text
)
language sql
stable
security definer
set search_path = public
as $$
  select e.id, e.full_name, e.email, e.department
  from public.employees e
  where e.id = any(coalesce(p_owner_ids, array[]::uuid[]))
    and (
      public.hirzexa_has_permission('team', 'view')
      or e.auth_user_id = auth.uid()
      or exists (
        select 1
        from public.crm_leads l
        where l.owner_employee_id = e.id
          and public.hirzexa_can_access_lead(l.owner_employee_id)
      )
    );
$$;

grant execute on function public.hirzexa_resolve_lead_owners(uuid[]) to authenticated, service_role;

-- ============================================================================
-- 3. Tighten crm_leads INSERT Policy (Assigned/Own reps own rows they create)
-- ============================================================================
drop policy if exists "crm_leads_insert_rbac" on public.crm_leads;
create policy "crm_leads_insert_rbac" on public.crm_leads
  for insert with check (
    public.hirzexa_has_permission('crm', 'create')
    and (
      public.hirzexa_has_permission('crm', 'assign')
      or owner_employee_id = public.hirzexa_actor_employee_id()
    )
  );

-- ============================================================================
-- 4. Scope business_events SELECT Policy for Lead/Booking Entities
-- ============================================================================
drop policy if exists "business_events_select_module_rbac" on public.business_events;
create policy "business_events_select_module_rbac" on public.business_events
  for select using (
    public.hirzexa_has_permission(module, 'view')
    and (
      public.hirzexa_actor_scope() = 'all'
      or entity_type not in ('lead', 'booking')
      or exists (
        select 1
        from public.crm_leads l
        where l.id::text = entity_id
          and public.hirzexa_can_access_lead(l.owner_employee_id)
      )
    )
  );

-- ============================================================================
-- 5. Safe Idempotent Backfill: Promote Legacy visitor_events CRM Leads &
--    Reconcile Unset owner_employee_id (Never Overwrites Existing Non-Null Owners)
-- ============================================================================
do $$
declare
  rec record;
  v_json jsonb;
  v_lead_id uuid;
  v_ref text;
  v_owner_emp_id uuid;
  v_raw_owner_id text;
  v_raw_owner_email text;
  v_stage text;
begin
  for rec in
    select distinct on (path) path, job_slug, created_at
    from public.visitor_events
    where path like '/__crm_lead__/%'
      and job_slug is not null
    order by path, created_at desc
  loop
    begin
      v_json := rec.job_slug::jsonb;
    exception when others then
      continue;
    end;

    if coalesce(v_json->>'id', '') = '' or coalesce(v_json->>'referenceId', '') = '' then
      continue;
    end if;

    begin
      v_lead_id := (v_json->>'id')::uuid;
    exception when others then
      continue;
    end;

    v_ref := v_json->>'referenceId';
    v_raw_owner_id := nullif(trim(coalesce(v_json->>'ownerId', '')), '');
    v_raw_owner_email := nullif(lower(trim(coalesce(v_json->>'ownerEmail', ''))), '');
    v_owner_emp_id := null;

    if v_raw_owner_id is not null then
      select e.id into v_owner_emp_id
      from public.employees e
      where e.id::text = v_raw_owner_id
         or e.auth_user_id::text = v_raw_owner_id
      limit 1;
    end if;

    if v_owner_emp_id is null and v_raw_owner_email is not null then
      select e.id into v_owner_emp_id
      from public.employees e
      where lower(e.email) = v_raw_owner_email
      limit 1;
    end if;

    -- Promote missing legacy lead into normalized crm_leads
    if not exists (select 1 from public.crm_leads where id = v_lead_id or reference_id = v_ref) then
      perform public.ingest_public_crm_lead(
        p_id := v_lead_id,
        p_reference_id := v_ref,
        p_lead_type := case when v_json->>'leadType' = 'proposal_request' then 'proposal_request' else 'discovery_call' end,
        p_stage := case when nullif(v_json->>'scheduledSlotIso', '') is not null then 'meeting_booked' else 'new_lead' end,
        p_full_name := coalesce(nullif(trim(v_json->>'fullName'), ''), 'Client Contact'),
        p_email := coalesce(nullif(trim(v_json->>'email'), ''), 'unknown@hirzexa.com'),
        p_phone := nullif(trim(coalesce(v_json->>'phone', '')), ''),
        p_company := coalesce(v_json->>'company', ''),
        p_role_title := nullif(trim(coalesce(v_json->>'roleTitle', '')), ''),
        p_service_track := coalesce(nullif(trim(v_json->>'serviceTrack'), ''), 'AI & Software Engineering'),
        p_budget_range := nullif(trim(coalesce(v_json->>'budgetRange', '')), ''),
        p_timeline := nullif(trim(coalesce(v_json->>'timeline', '')), ''),
        p_duration_minutes := case when (v_json->>'durationMinutes') = '20' then 20 else 30 end,
        p_scheduled_slot_iso := nullif(trim(coalesce(v_json->>'scheduledSlotIso', '')), '')::timestamptz,
        p_preferred_window := nullif(trim(coalesce(v_json->>'preferredWindow', '')), ''),
        p_timezone := coalesce(nullif(trim(v_json->>'timezone'), ''), 'UTC'),
        p_meeting_link := nullif(trim(coalesce(v_json->>'meetingLink', '')), ''),
        p_project_summary := coalesce(v_json->>'projectSummary', ''),
        p_current_stack := nullif(trim(coalesce(v_json->>'currentStack', '')), ''),
        p_consent := coalesce((v_json->>'consent')::boolean, true),
        p_locale := case when v_json->>'locale' = 'ar' then 'ar' else 'en' end,
        p_activities := coalesce(v_json->'activities', '[]'::jsonb)
      );

      v_stage := coalesce(v_json->>'stage', 'new_lead');
      if v_stage not in ('new_lead','meeting_booked','discovery_completed','proposal_sent','negotiation','won','lost') then
        v_stage := 'new_lead';
      end if;

      update public.crm_leads
      set stage = v_stage,
          owner_employee_id = v_owner_emp_id,
          notes = coalesce(v_json->>'notes', notes),
          updated_at = coalesce(nullif(v_json->>'updatedAt', '')::timestamptz, updated_at)
      where id = v_lead_id;
    elsif v_owner_emp_id is not null then
      -- Reconcile owner_employee_id ONLY when currently NULL in crm_leads
      update public.crm_leads
      set owner_employee_id = v_owner_emp_id,
          updated_at = now()
      where (id = v_lead_id or reference_id = v_ref)
        and owner_employee_id is null;
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
