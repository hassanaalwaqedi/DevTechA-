-- HIRZEXA Intelligence — Interview Public Scheduling RPC Patch (2026-11-21)
-- Additive, idempotent, zero-downtime function update.
-- Enables unauthenticated (incognito) candidates with a valid SHA-256 token hash to:
--   1. Load real interviewer availability rules, date exceptions, and PII-free busy UTC slots
--      without granting `anon` any direct table SELECT privileges.
--   2. Atomically confirm, reschedule, or cancel their own appointment under strict RLS.
--   3. Non-destructively advance `job_applications.status` to `interview` on slot confirmation.

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
  v_rules jsonb := '[]'::jsonb;
  v_exceptions jsonb := '[]'::jsonb;
  v_busy jsonb := '[]'::jsonb;
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

  -- Return PII-free scheduling inputs for active invitations so unauthenticated
  -- candidate links compute real slots without granting raw table SELECT to `anon`.
  if v_inv.status <> 'revoked' then
    select coalesce(jsonb_agg(to_jsonb(r) order by r.day_of_week, r.start_minute), '[]'::jsonb)
      into v_rules
    from public.interviewer_availability r
    where r.employee_id = v_inv.interviewer_employee_id
      and r.is_active = true;

    select coalesce(jsonb_agg(to_jsonb(e) order by e.exception_date), '[]'::jsonb)
      into v_exceptions
    from public.interviewer_availability_exceptions e
    where e.employee_id = v_inv.interviewer_employee_id;

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'scheduled_start_utc', a.scheduled_start_utc,
          'scheduled_end_utc', a.scheduled_end_utc,
          'status', a.status
        )
      ),
      '[]'::jsonb
    )
      into v_busy
    from public.interview_appointments a
    where a.interviewer_employee_id = v_inv.interviewer_employee_id
      and a.status = 'confirmed';
  end if;

  return jsonb_build_object(
    'invitation', to_jsonb(v_inv) - 'token_hash',
    'appointment', case when v_appt.id is not null then to_jsonb(v_appt) else null end,
    'availability_rules', v_rules,
    'availability_exceptions', v_exceptions,
    'busy_slots', v_busy
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

  update public.job_applications
  set status = 'interview'
  where reference_id = v_inv.application_reference_id
    and status in ('new', 'reviewing', 'shortlisted');

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

create or replace function public.reschedule_interview_slot_atomic(
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
  v_appt record;
  v_next_count integer;
begin
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

  select * into v_appt
  from public.interview_appointments
  where invitation_id = v_inv.id
    and status = 'confirmed'
  order by created_at desc
  limit 1
  for update;

  if not found then
    raise exception 'APPOINTMENT_NOT_FOUND';
  end if;

  v_next_count := coalesce(v_appt.reschedule_count, 0) + 1;

  update public.interview_appointments
  set scheduled_start_utc = p_start_utc,
      scheduled_end_utc = p_end_utc,
      candidate_timezone = coalesce(nullif(trim(p_candidate_timezone), ''), v_appt.candidate_timezone, 'UTC'),
      reschedule_count = v_next_count,
      updated_at = now()
  where id = v_appt.id
  returning * into v_appt;

  update public.interview_reminders
  set status = 'canceled', updated_at = now()
  where appointment_id = v_appt.id and status = 'pending';

  if p_start_utc - interval '24 hours' > now() then
    insert into public.interview_reminders (appointment_id, reminder_kind, scheduled_for_utc, idempotency_key)
    values (v_appt.id, '24h', p_start_utc - interval '24 hours', 'rem:' || v_appt.id::text || ':24h:' || v_next_count::text)
    on conflict (idempotency_key) do nothing;
  end if;

  if p_start_utc - interval '1 hour' > now() then
    insert into public.interview_reminders (appointment_id, reminder_kind, scheduled_for_utc, idempotency_key)
    values (v_appt.id, '1h', p_start_utc - interval '1 hour', 'rem:' || v_appt.id::text || ':1h:' || v_next_count::text)
    on conflict (idempotency_key) do nothing;
  end if;

  insert into public.interview_activity_history (
    invitation_id, appointment_id, application_reference_id, event_type, actor_ref, summary, metadata
  )
  values (
    v_inv.id, v_appt.id, v_inv.application_reference_id, 'rescheduled',
    v_inv.candidate_email,
    'Candidate rescheduled interview slot (' || to_char(p_start_utc at time zone 'UTC', 'YYYY-MM-DD HH24:MI') || ' UTC).',
    jsonb_build_object('startUtc', p_start_utc, 'endUtc', p_end_utc, 'rescheduleCount', v_next_count)
  );

  return jsonb_build_object('appointment', to_jsonb(v_appt));
exception
  when exclusion_violation then
    raise exception 'SLOT_CONFLICT';
end;
$$;

create or replace function public.cancel_interview_by_token(
  p_token_hash text,
  p_reason text default null
)
returns jsonb
language plpgsql
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
  for update;

  if not found then
    raise exception 'INVALID_TOKEN';
  end if;

  select * into v_appt
  from public.interview_appointments
  where invitation_id = v_inv.id
  order by created_at desc
  limit 1
  for update;

  if not found then
    raise exception 'APPOINTMENT_NOT_FOUND';
  end if;

  if v_appt.status <> 'canceled' then
    update public.interview_appointments
    set status = 'canceled',
        canceled_at = now(),
        cancel_reason = nullif(trim(coalesce(p_reason, '')), ''),
        updated_at = now()
    where id = v_appt.id
    returning * into v_appt;

    update public.interview_reminders
    set status = 'canceled', updated_at = now()
    where appointment_id = v_appt.id and status = 'pending';

    insert into public.interview_activity_history (
      invitation_id, appointment_id, application_reference_id, event_type, actor_ref, summary
    )
    values (
      v_inv.id, v_appt.id, v_inv.application_reference_id, 'canceled',
      v_inv.candidate_email,
      'Candidate canceled interview appointment' || case when nullif(trim(coalesce(p_reason, '')), '') is not null then ': ' || trim(p_reason) else '.' end
    );
  end if;

  return jsonb_build_object('ok', true, 'appointment', to_jsonb(v_appt));
end;
$$;

grant execute on function public.lookup_interview_invitation_by_hash(text) to anon, authenticated, service_role;
grant execute on function public.reserve_interview_slot_atomic(text, timestamptz, timestamptz, text) to anon, authenticated, service_role;
grant execute on function public.reschedule_interview_slot_atomic(text, timestamptz, timestamptz, text) to anon, authenticated, service_role;
grant execute on function public.cancel_interview_by_token(text, text) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
