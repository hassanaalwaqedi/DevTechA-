-- HIRZEXA Intelligence — Independent PostgreSQL RLS Verification for CRM Scope Fix (2026-11-21)
-- Run AFTER applying supabase/migrations/20261121_fix_crm_assignment_and_scope_rls.sql.
-- Executes inside BEGIN ... ROLLBACK so ZERO test rows persist in production.

begin;

do $$
declare
  v_jesika_uid uuid := 'aaaa1111-1111-4111-8111-111111111111';
  v_other_rep_uid uuid := 'bbbb2222-2222-4222-8222-222222222222';
  v_team_sales_uid uuid := 'cccc3333-3333-4333-8333-333333333333';
  v_eng_uid uuid := 'dddd4444-4444-4444-8444-444444444444';

  v_emp_jesika uuid;
  v_emp_other_rep uuid;
  v_emp_team_sales uuid;
  v_emp_eng uuid;

  v_lead_a uuid;
  v_lead_b uuid;
  v_lead_unassigned uuid;
  v_lead_eng uuid;
  v_cnt integer;
begin
  -- Seed temporary auth.users + employees (rolled back at end)
  insert into auth.users (id, email) values
    (v_jesika_uid, 'jesika.rls.test@hirzexa.test'),
    (v_other_rep_uid, 'repb.rls.test@hirzexa.test'),
    (v_team_sales_uid, 'team.sales.rls.test@hirzexa.test'),
    (v_eng_uid, 'eng.rls.test@hirzexa.test')
  on conflict (id) do nothing;

  insert into public.employees (auth_user_id, full_name, email, role_key, department, status)
  values (v_jesika_uid, 'Jesika Test', 'jesika.rls.test@hirzexa.test', 'sales_rep', 'Sales', 'active')
  returning id into v_emp_jesika;

  insert into public.employees (auth_user_id, full_name, email, role_key, department, status)
  values (v_other_rep_uid, 'Rep B Test', 'repb.rls.test@hirzexa.test', 'sales_rep', 'Sales', 'active')
  returning id into v_emp_other_rep;

  insert into public.employees (auth_user_id, full_name, email, role_key, department, scope_override, status)
  values (v_team_sales_uid, 'Sales Team Lead', 'team.sales.rls.test@hirzexa.test', 'sales_rep', 'Sales', 'team', 'active')
  returning id into v_emp_team_sales;

  insert into public.employees (auth_user_id, full_name, email, role_key, department, status)
  values (v_eng_uid, 'Engineering Owner', 'eng.rls.test@hirzexa.test', 'sales_rep', 'Engineering', 'active')
  returning id into v_emp_eng;

  -- Seed controlled leads: Lead A (Jesika), Lead B (Rep B), Lead U (Unassigned), Lead E (Engineering)
  insert into public.crm_leads (reference_id, owner_employee_id, lead_type, stage, service_track, project_summary)
  values ('HRZ-RLS-TEST-A', v_emp_jesika, 'proposal_request', 'new_lead', 'AI Engineering', 'Controlled Lead A assigned to Jesika')
  returning id into v_lead_a;

  insert into public.crm_leads (reference_id, owner_employee_id, lead_type, stage, service_track, project_summary)
  values ('HRZ-RLS-TEST-B', v_emp_other_rep, 'proposal_request', 'new_lead', 'AI Engineering', 'Controlled Lead B assigned to Rep B')
  returning id into v_lead_b;

  insert into public.crm_leads (reference_id, owner_employee_id, lead_type, stage, service_track, project_summary)
  values ('HRZ-RLS-TEST-U', null, 'proposal_request', 'new_lead', 'AI Engineering', 'Controlled Unassigned Lead')
  returning id into v_lead_unassigned;

  insert into public.crm_leads (reference_id, owner_employee_id, lead_type, stage, service_track, project_summary)
  values ('HRZ-RLS-TEST-E', v_emp_eng, 'proposal_request', 'new_lead', 'AI Engineering', 'Controlled Engineering Department Lead')
  returning id into v_lead_eng;

  -- Seed lead events for Lead A and Lead B
  insert into public.business_events (event_type, module, severity, actor_ref, entity_type, entity_id, title, summary, source_href) values
    ('proposal.created', 'crm', 'info', 'Client A', 'lead', v_lead_a::text, 'Lead A Event', 'Belongs to Jesika', '/admin/crm'),
    ('proposal.created', 'crm', 'info', 'Client B', 'lead', v_lead_b::text, 'Lead B Event', 'Belongs to Rep B', '/admin/crm');

  -- =========================================================================
  -- 1. Jesika (Assigned scope): sees Lead A ONLY; blocked from Lead B, Unassigned, Lead E
  -- =========================================================================
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_jesika_uid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_jesika_uid::text, 'role', 'authenticated')::text, true);

  select count(*) into v_cnt from public.crm_leads where id = v_lead_a;
  if v_cnt <> 1 then raise exception 'RLS FAILURE: Jesika (Assigned) could not read Lead A'; end if;

  select count(*) into v_cnt from public.crm_leads where id in (v_lead_b, v_lead_unassigned, v_lead_eng);
  if v_cnt <> 0 then raise exception 'RLS FAILURE: Jesika (Assigned) saw % unauthorized leads', v_cnt; end if;

  -- Jesika's business_events MUST include Lead A and MUST exclude Lead B
  select count(*) into v_cnt from public.business_events where entity_id = v_lead_a::text;
  if v_cnt <> 1 then raise exception 'RLS FAILURE: Jesika could not see Lead A event'; end if;

  select count(*) into v_cnt from public.business_events where entity_id = v_lead_b::text;
  if v_cnt <> 0 then raise exception 'RLS FAILURE: Jesika saw Rep B business_event!'; end if;

  -- =========================================================================
  -- 2. Reassign Lead A to Rep B -> Jesika IMMEDIATELY loses SELECT & UPDATE access
  -- =========================================================================
  execute 'reset role';
  update public.crm_leads set owner_employee_id = v_emp_other_rep where id = v_lead_a;

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', v_jesika_uid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_jesika_uid::text, 'role', 'authenticated')::text, true);

  select count(*) into v_cnt from public.crm_leads where id = v_lead_a;
  if v_cnt <> 0 then raise exception 'RLS FAILURE: Jesika retained SELECT access after Lead A reassignment!'; end if;

  update public.crm_leads set notes = 'unauthorized edit' where id = v_lead_a;
  get diagnostics v_cnt = row_count;
  if v_cnt <> 0 then raise exception 'RLS FAILURE: Jesika updated Lead A after reassignment!'; end if;

  -- =========================================================================
  -- 3. Team scope (Sales): sees Sales-owned Lead A & Lead B; BLOCKED from Unassigned & Engineering!
  -- =========================================================================
  perform set_config('request.jwt.claim.sub', v_team_sales_uid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_team_sales_uid::text, 'role', 'authenticated')::text, true);

  select count(*) into v_cnt from public.crm_leads where id in (v_lead_a, v_lead_b);
  if v_cnt <> 2 then raise exception 'RLS FAILURE: Team-scope Sales user saw % of 2 Sales leads', v_cnt; end if;

  select count(*) into v_cnt from public.crm_leads where id = v_lead_unassigned;
  if v_cnt <> 0 then raise exception 'RLS FAILURE: Team scope leaked Unassigned lead!'; end if;

  select count(*) into v_cnt from public.crm_leads where id = v_lead_eng;
  if v_cnt <> 0 then raise exception 'RLS FAILURE: Team scope leaked Engineering department lead!'; end if;

  -- Owner resolver RPC returns Rep B's display metadata for Team-scope viewer without leaking Engineering owner
  select count(*) into v_cnt
  from public.hirzexa_resolve_lead_owners(array[v_emp_other_rep, v_emp_eng]);
  if v_cnt <> 1 then raise exception 'RLS FAILURE: hirzexa_resolve_lead_owners returned % rows (expected 1)', v_cnt; end if;

  execute 'reset role';
  raise notice 'PASS: All CRM Assigned/Team scope & reassignment PostgreSQL RLS assertions succeeded.';
end $$;

rollback;
