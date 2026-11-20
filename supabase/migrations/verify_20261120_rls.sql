-- HIRZEXA Intelligence — Independent PostgreSQL RLS Verification Script
-- Run AFTER applying supabase/migrations/20261120_hirzexa_intelligence.sql.
-- Executes inside BEGIN ... ROLLBACK so ZERO test records persist in production.
-- Raises an exception immediately if ANY role bypasses PostgreSQL RLS.

begin;

do $$
declare
  v_intern_uid uuid := '11111111-1111-4111-8111-111111111111';
  v_sales_rep_a_uid uuid := '22222222-2222-4222-8222-222222222222';
  v_sales_rep_b_uid uuid := '33333333-3333-4333-8333-333333333333';
  v_hr_uid uuid := '44444444-4444-4444-8444-444444444444';
  v_suspended_uid uuid := '55555555-5555-4555-8555-555555555555';

  v_emp_rep_a uuid;
  v_emp_rep_b uuid;
  v_lead_a uuid;
  v_lead_b uuid;
  v_cnt integer;
begin
  -- Seed temporary auth.users rows for RLS role simulation (rolled back at end)
  insert into auth.users (id, email) values
    (v_intern_uid, 'rls-intern@hirzexa.test'),
    (v_sales_rep_a_uid, 'rls-rep-a@hirzexa.test'),
    (v_sales_rep_b_uid, 'rls-rep-b@hirzexa.test'),
    (v_hr_uid, 'rls-hr@hirzexa.test'),
    (v_suspended_uid, 'rls-suspended@hirzexa.test')
  on conflict (id) do nothing;

  insert into public.employees (auth_user_id, full_name, email, role_key, department, status) values
    (v_intern_uid, 'RLS Intern', 'rls-intern@hirzexa.test', 'marketing_intern', 'Marketing', 'active'),
    (v_hr_uid, 'RLS HR', 'rls-hr@hirzexa.test', 'hr_manager', 'HR', 'active'),
    (v_suspended_uid, 'RLS Suspended', 'rls-suspended@hirzexa.test', 'super_admin', 'Executive', 'suspended');

  insert into public.employees (auth_user_id, full_name, email, role_key, department, status)
  values (v_sales_rep_a_uid, 'RLS Rep A', 'rls-rep-a@hirzexa.test', 'sales_rep', 'Sales', 'active')
  returning id into v_emp_rep_a;

  insert into public.employees (auth_user_id, full_name, email, role_key, department, status)
  values (v_sales_rep_b_uid, 'RLS Rep B', 'rls-rep-b@hirzexa.test', 'sales_rep', 'Sales', 'active')
  returning id into v_emp_rep_b;

  -- Seed two leads owned by different reps + confidential events + audit log
  insert into public.crm_leads (reference_id, owner_employee_id, lead_type, stage, service_track, project_summary)
  values ('HRZ-RLS-A', v_emp_rep_a, 'discovery_call', 'meeting_booked', 'AI Engineering', 'Lead owned by Rep A')
  returning id into v_lead_a;

  insert into public.crm_leads (reference_id, owner_employee_id, lead_type, stage, service_track, project_summary)
  values ('HRZ-RLS-B', v_emp_rep_b, 'discovery_call', 'meeting_booked', 'AI Engineering', 'Lead owned by Rep B')
  returning id into v_lead_b;

  insert into public.business_events (event_type, module, severity, actor_ref, entity_type, entity_id, title, summary, source_href) values
    ('booking.created', 'bookings', 'attention', 'Client A', 'lead', v_lead_a::text, 'RLS Test Booking', 'Confidential client booking', '/admin/crm'),
    ('application.received', 'recruitment', 'attention', 'Applicant X', 'application', 'APP-RLS-1', 'RLS Test Candidate', 'Confidential applicant', '/admin/applications');

  insert into public.audit_logs (actor_id, actor_email, actor_role, module, action, entity_type, outcome, summary)
  values ('system', 'system@hirzexa.test', 'super_admin', 'security', 'rls_test', 'system', 'allowed', 'RLS test audit entry');

  -- =========================================================================
  -- TEST 1: Anonymous user CANNOT read employees, crm_leads, events, audit_logs
  -- =========================================================================
  execute 'set local role anon';
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '{}', true);

  select count(*) into v_cnt from public.employees;
  if v_cnt <> 0 then raise exception 'RLS FAILURE: anon read % employee rows', v_cnt; end if;

  select count(*) into v_cnt from public.crm_leads;
  if v_cnt <> 0 then raise exception 'RLS FAILURE: anon read % crm_leads rows', v_cnt; end if;

  select count(*) into v_cnt from public.business_events;
  if v_cnt <> 0 then raise exception 'RLS FAILURE: anon read % business_events rows', v_cnt; end if;

  select count(*) into v_cnt from public.audit_logs;
  if v_cnt <> 0 then raise exception 'RLS FAILURE: anon read % audit_logs rows', v_cnt; end if;

  -- =========================================================================
  -- TEST 2: Marketing Intern CANNOT read crm_leads, HR/booking events, or audit_logs
  --         and CANNOT self-escalate own role_key to super_admin
  -- =========================================================================
  execute 'reset role';
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_intern_uid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_intern_uid::text, 'role', 'authenticated')::text, true);

  select count(*) into v_cnt from public.crm_leads;
  if v_cnt <> 0 then raise exception 'RLS FAILURE: marketing_intern saw % crm_leads', v_cnt; end if;

  select count(*) into v_cnt from public.business_events where module in ('recruitment', 'bookings', 'crm');
  if v_cnt <> 0 then raise exception 'RLS FAILURE: marketing_intern saw % restricted events', v_cnt; end if;

  select count(*) into v_cnt from public.audit_logs;
  if v_cnt <> 0 then raise exception 'RLS FAILURE: marketing_intern saw % audit_logs', v_cnt; end if;

  update public.employees set role_key = 'super_admin' where auth_user_id = v_intern_uid;
  get diagnostics v_cnt = row_count;
  if v_cnt <> 0 then raise exception 'RLS FAILURE: marketing_intern escalated own role!'; end if;

  -- =========================================================================
  -- TEST 3: Sales Rep A ONLY sees own assigned lead, NEVER Rep B's lead or HR events
  -- =========================================================================
  perform set_config('request.jwt.claim.sub', v_sales_rep_a_uid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_sales_rep_a_uid::text, 'role', 'authenticated')::text, true);

  select count(*) into v_cnt from public.crm_leads where id = v_lead_a;
  if v_cnt <> 1 then raise exception 'RLS FAILURE: sales_rep A could not read own lead'; end if;

  select count(*) into v_cnt from public.crm_leads where id = v_lead_b;
  if v_cnt <> 0 then raise exception 'RLS FAILURE: sales_rep A read Rep B lead!'; end if;

  select count(*) into v_cnt from public.business_events where module = 'recruitment';
  if v_cnt <> 0 then raise exception 'RLS FAILURE: sales_rep A read recruitment events!'; end if;

  -- =========================================================================
  -- TEST 4: HR Manager sees recruitment events, ZERO crm_leads and ZERO audit_logs
  -- =========================================================================
  perform set_config('request.jwt.claim.sub', v_hr_uid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_hr_uid::text, 'role', 'authenticated')::text, true);

  select count(*) into v_cnt from public.business_events where module = 'recruitment';
  if v_cnt < 1 then raise exception 'RLS FAILURE: hr_manager could not see recruitment events'; end if;

  select count(*) into v_cnt from public.crm_leads;
  if v_cnt <> 0 then raise exception 'RLS FAILURE: hr_manager saw % crm_leads', v_cnt; end if;

  select count(*) into v_cnt from public.audit_logs;
  if v_cnt <> 0 then raise exception 'RLS FAILURE: hr_manager saw % audit_logs', v_cnt; end if;

  -- =========================================================================
  -- TEST 5: Suspended Super Admin sees ZERO CRM/events/audit rows
  -- =========================================================================
  perform set_config('request.jwt.claim.sub', v_suspended_uid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_suspended_uid::text, 'role', 'authenticated')::text, true);

  select count(*) into v_cnt from public.crm_leads;
  if v_cnt <> 0 then raise exception 'RLS FAILURE: suspended account saw % crm_leads', v_cnt; end if;

  select count(*) into v_cnt from public.audit_logs;
  if v_cnt <> 0 then raise exception 'RLS FAILURE: suspended account saw % audit_logs', v_cnt; end if;

  -- =========================================================================
  -- TEST 6: Immutable audit_logs cannot be deleted even by authenticated roles
  -- =========================================================================
  delete from public.audit_logs;
  get diagnostics v_cnt = row_count;
  if v_cnt <> 0 then raise exception 'RLS FAILURE: audit_logs rows were deleted!'; end if;

  execute 'reset role';
  raise notice 'PASS: All independent PostgreSQL RLS isolation assertions succeeded.';
end $$;

rollback;
