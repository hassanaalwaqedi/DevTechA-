-- HIRZEXA — P0 Database Security Hardening Verification Script (Rolled-Back Transaction)
-- Run in Supabase SQL Editor on STAGING after applying `20261122_security_hardening_patch.sql`.
-- Runs entirely inside BEGIN ... ROLLBACK so zero test records persist.

begin;

do $$
declare
  v_rls_enabled boolean;
  v_rep_a_uid uuid := gen_random_uuid();
  v_rep_b_uid uuid := gen_random_uuid();
  v_admin_uid uuid := gen_random_uuid();
  v_rep_a_emp uuid := gen_random_uuid();
  v_rep_b_emp uuid := gen_random_uuid();
  v_admin_emp uuid := gen_random_uuid();
  v_comp_a uuid := gen_random_uuid();
  v_comp_b uuid := gen_random_uuid();
  v_contact_a uuid := gen_random_uuid();
  v_contact_b uuid := gen_random_uuid();
  v_lead_a uuid := gen_random_uuid();
  v_lead_b uuid := gen_random_uuid();
  v_count integer;
  v_preserved_name text;
  v_event_id uuid;
  v_saved_href text;
begin
  -- 1. Verify RLS is enabled on public.application_answers (SEC-009)
  select rowsecurity into v_rls_enabled
  from pg_tables
  where schemaname = 'public' and tablename = 'application_answers';
  if coalesce(v_rls_enabled, false) is not true then
    raise exception 'FAIL SEC-009: RLS is NOT enabled on public.application_answers';
  end if;

  -- Seed isolated test fixtures (rolled back at end)
  insert into auth.users (id, email) values
    (v_rep_a_uid, 'verify-rep-a@hirzexa.test'),
    (v_rep_b_uid, 'verify-rep-b@hirzexa.test'),
    (v_admin_uid, 'verify-admin@hirzexa.test');

  insert into public.employees (id, auth_user_id, full_name, email, department, role_key, status) values
    (v_rep_a_emp, v_rep_a_uid, 'Rep A', 'verify-rep-a@hirzexa.test', 'Sales', 'sales_rep', 'active'),
    (v_rep_b_emp, v_rep_b_uid, 'Rep B', 'verify-rep-b@hirzexa.test', 'Sales', 'sales_rep', 'active'),
    (v_admin_emp, v_admin_uid, 'Admin Test', 'verify-admin@hirzexa.test', 'Operations', 'administrator', 'active');

  insert into public.crm_companies (id, name, normalized_name) values
    (v_comp_a, 'Alpha Security Corp', 'alpha security corp'),
    (v_comp_b, 'Beta Confidential LLC', 'beta confidential llc');

  insert into public.crm_contacts (id, company_id, full_name, email, consent) values
    (v_contact_a, v_comp_a, 'Alice Prospect', 'alice@alpha.test', true),
    (v_contact_b, v_comp_b, 'Bob Confidential', 'bob@beta.test', true);

  insert into public.crm_leads (
    id, reference_id, company_id, contact_id, owner_employee_id,
    lead_type, stage, service_track, project_summary
  ) values
    (v_lead_a, 'HRZ-VER-A', v_comp_a, v_contact_a, v_rep_a_emp, 'discovery_call', 'new_lead', 'AI', 'Lead A scope'),
    (v_lead_b, 'HRZ-VER-B', v_comp_b, v_contact_b, v_rep_b_emp, 'discovery_call', 'new_lead', 'AI', 'Lead B scope');

  -- 2. Verify ingest_public_crm_lead does NOT overwrite existing crm_contacts PII (SEC-008)
  perform public.ingest_public_crm_lead(
    p_id := gen_random_uuid(),
    p_reference_id := 'HRZ-VER-OVERWRITE',
    p_lead_type := 'proposal_request',
    p_stage := 'new_lead',
    p_full_name := 'ATTACKER SPOOFED NAME',
    p_email := 'alice@alpha.test',
    p_company := 'Spoofed Corp',
    p_project_summary := 'Attempted contact overwrite'
  );
  select full_name into v_preserved_name from public.crm_contacts where email = 'alice@alpha.test';
  if v_preserved_name <> 'Alice Prospect' then
    raise exception 'FAIL SEC-008: ingest_public_crm_lead overwrote existing contact name to %', v_preserved_name;
  end if;

  -- 3. Verify ingest_public_business_event sanitizes malicious source_href (SEC-008)
  v_event_id := public.ingest_public_business_event(
    'booking.created', 'bookings', 'info', 'attacker', 'lead', '123',
    'Test', 'Summary', 'javascript:alert(1)', '{}'::jsonb, 'verify-xss-href-key'
  );
  select source_href into v_saved_href from public.business_events where id = v_event_id;
  if v_saved_href <> '/admin' then
    raise exception 'FAIL SEC-008: unsafe source_href persisted as %', v_saved_href;
  end if;

  -- 4. Verify Rep A (Assigned scope) sees ONLY Contact A & Company A, NOT Contact B / Company B (SEC-010)
  perform set_config('request.jwt.claims', json_build_object('sub', v_rep_a_uid::text, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into v_count from public.crm_contacts where id in (v_contact_a, v_contact_b);
  if v_count <> 1 then
    raise exception 'FAIL SEC-010: Assigned sales_rep saw % contacts instead of 1', v_count;
  end if;

  select count(*) into v_count from public.crm_companies where id in (v_comp_a, v_comp_b);
  if v_count <> 1 then
    raise exception 'FAIL SEC-010: Assigned sales_rep saw % companies instead of 1', v_count;
  end if;

  -- 5. Verify non-Super Admin cannot self-update permission_overrides on public.employees (SEC-010)
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin_uid::text, 'role', 'authenticated')::text, true);
  set local role authenticated;

  update public.employees
  set permission_overrides = '{"team":["manage"],"audit":["manage"]}'::jsonb
  where id = v_admin_emp;
  get diagnostics v_count = row_count;
  if v_count <> 0 then
    raise exception 'FAIL SEC-010: Non-Super Admin self-updated own employee row (% rows)', v_count;
  end if;

  -- 6. Verify anon cannot insert forged /__crm_lead__/ row into visitor_events (SEC-009)
  reset role;
  set local role anon;
  begin
    insert into public.visitor_events (visitor_id, path, job_slug)
    values ('1234567890123456789012', '/__crm_lead__/HRZ-FAKE', '{}');
    raise exception 'FAIL SEC-009: anon inserted forged /__crm_lead__/ path into visitor_events';
  exception when insufficient_privilege then
    -- Expected RLS violation
    null;
  end;

  reset role;
  raise notice 'ALL P0 DATABASE HARDENING CHECKS (SEC-008, SEC-009, SEC-010) PASSED!';
end $$;

rollback;
