-- HIRZEXA Intelligence — Independent PostgreSQL RLS & Double-Booking Verification (2026-11-21)
-- Run AFTER applying supabase/migrations/20261121_interview_scheduling.sql.
-- Executes inside BEGIN ... ROLLBACK so ZERO test rows persist in production.

begin;

do $$
declare
  v_hr_uid uuid := 'e1111111-1111-4111-8111-111111111111';
  v_eng_uid uuid := 'e2222222-2222-4222-8222-222222222222';
  v_other_eng_uid uuid := 'e3333333-3333-4333-8333-333333333333';
  v_sales_uid uuid := 'e4444444-4444-4444-8444-444444444444';

  v_emp_hr uuid;
  v_emp_eng uuid;
  v_emp_other_eng uuid;
  v_emp_sales uuid;

  v_inv_1 uuid;
  v_inv_2 uuid;
  v_cnt integer;
  v_conflict_caught boolean := false;
  v_slot_start timestamptz := date_trunc('hour', now()) + interval '2 days';
  v_slot_end timestamptz := date_trunc('hour', now()) + interval '2 days 30 minutes';
begin
  insert into auth.users (id, email) values
    (v_hr_uid, 'hr.intv.rls@hirzexa.test'),
    (v_eng_uid, 'eng1.intv.rls@hirzexa.test'),
    (v_other_eng_uid, 'eng2.intv.rls@hirzexa.test'),
    (v_sales_uid, 'sales.intv.rls@hirzexa.test')
  on conflict (id) do nothing;

  insert into public.employees (auth_user_id, full_name, email, role_key, department, status)
  values (v_hr_uid, 'HR RLS', 'hr.intv.rls@hirzexa.test', 'hr_manager', 'HR', 'active')
  returning id into v_emp_hr;

  insert into public.employees (auth_user_id, full_name, email, role_key, department, status)
  values (v_eng_uid, 'Eng 1 RLS', 'eng1.intv.rls@hirzexa.test', 'engineer', 'Engineering', 'active')
  returning id into v_emp_eng;

  insert into public.employees (auth_user_id, full_name, email, role_key, department, status)
  values (v_other_eng_uid, 'Eng 2 RLS', 'eng2.intv.rls@hirzexa.test', 'engineer', 'Engineering', 'active')
  returning id into v_emp_other_eng;

  insert into public.employees (auth_user_id, full_name, email, role_key, department, status)
  values (v_sales_uid, 'Sales RLS', 'sales.intv.rls@hirzexa.test', 'sales_rep', 'Sales', 'active')
  returning id into v_emp_sales;

  -- Seed two invitations assigned to Eng 1
  insert into public.interview_invitations (
    application_reference_id, candidate_name, candidate_email, position_title,
    interview_stage, interview_type, interview_format, duration_minutes,
    interviewer_employee_id, interviewer_name, interviewer_email,
    token_hash, status, expires_at
  ) values (
    'DEV-RLS-INTV-1', 'Candidate One', 'cand1@hirzexa.test', 'Senior AI Engineer',
    'technical_interview', 'technical_interview', 'online_video', 30,
    v_emp_eng, 'Eng 1 RLS', 'eng1.intv.rls@hirzexa.test',
    'hash_rls_token_one_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'sent', now() + interval '5 days'
  ) returning id into v_inv_1;

  insert into public.interview_invitations (
    application_reference_id, candidate_name, candidate_email, position_title,
    interview_stage, interview_type, interview_format, duration_minutes,
    interviewer_employee_id, interviewer_name, interviewer_email,
    token_hash, status, expires_at
  ) values (
    'DEV-RLS-INTV-2', 'Candidate Two', 'cand2@hirzexa.test', 'Senior AI Engineer',
    'technical_interview', 'technical_interview', 'online_video', 30,
    v_emp_eng, 'Eng 1 RLS', 'eng1.intv.rls@hirzexa.test',
    'hash_rls_token_two_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'sent', now() + interval '5 days'
  ) returning id into v_inv_2;

  -- TEST 1: Reserve slot atomically for Candidate One
  perform public.reserve_interview_slot_atomic(
    'hash_rls_token_one_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    v_slot_start, v_slot_end, 'UTC'
  );

  -- TEST 2: Second candidate attempting overlapping slot MUST fail with SLOT_CONFLICT (GIST exclusion!)
  begin
    perform public.reserve_interview_slot_atomic(
      'hash_rls_token_two_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      v_slot_start + interval '15 minutes', v_slot_end + interval '15 minutes', 'UTC'
    );
  exception when others then
    if sqlerrm like '%SLOT_CONFLICT%' then
      v_conflict_caught := true;
    else
      raise;
    end if;
  end;
  if not v_conflict_caught then
    raise exception 'DOUBLE-BOOKING FAILURE: Overlapping slot was not rejected!';
  end if;

  -- TEST 3: Anonymous role reads ZERO rows from raw interview tables
  execute 'set local role anon';
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '{}', true);

  select count(*) into v_cnt from public.interview_invitations;
  if v_cnt <> 0 then raise exception 'RLS FAILURE: anon read % interview_invitations', v_cnt; end if;

  select count(*) into v_cnt from public.interview_appointments;
  if v_cnt <> 0 then raise exception 'RLS FAILURE: anon read % interview_appointments', v_cnt; end if;

  -- TEST 4: Sales Rep reads ZERO interview rows
  execute 'reset role';
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_sales_uid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_sales_uid::text, 'role', 'authenticated')::text, true);

  select count(*) into v_cnt from public.interview_appointments;
  if v_cnt <> 0 then raise exception 'RLS FAILURE: sales_rep read % interview_appointments', v_cnt; end if;

  -- TEST 5: Assigned Engineer (Eng 1) sees own assigned interview; Other Engineer (Eng 2) sees ZERO
  perform set_config('request.jwt.claim.sub', v_eng_uid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_eng_uid::text, 'role', 'authenticated')::text, true);

  select count(*) into v_cnt from public.interview_appointments where invitation_id = v_inv_1;
  if v_cnt <> 1 then raise exception 'RLS FAILURE: Assigned interviewer could not see own interview'; end if;

  perform set_config('request.jwt.claim.sub', v_other_eng_uid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_other_eng_uid::text, 'role', 'authenticated')::text, true);

  select count(*) into v_cnt from public.interview_appointments where invitation_id = v_inv_1;
  if v_cnt <> 0 then raise exception 'RLS FAILURE: Unassigned engineer read another interviewer appointment!'; end if;

  -- TEST 6: HR Manager sees all recruitment interviews
  perform set_config('request.jwt.claim.sub', v_hr_uid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_hr_uid::text, 'role', 'authenticated')::text, true);

  select count(*) into v_cnt from public.interview_appointments where invitation_id = v_inv_1;
  if v_cnt <> 1 then raise exception 'RLS FAILURE: hr_manager could not read interview_appointments'; end if;

  execute 'reset role';
  raise notice 'PASS: All Interview Scheduling RLS & GIST double-booking exclusion assertions succeeded.';
end $$;

rollback;
