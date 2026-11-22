-- HIRZEXA — Safe Super Admin Email Migration (admin@devtech.ai -> hassan@hirzexa.com)
-- Run in Supabase SQL Editor. Idempotent, transactional, zero-lockout.
--
-- What this does:
--   1. Updates the existing Supabase Auth Super Admin identity in-place from
--      `admin@devtech.ai` to `hassan@hirzexa.com` (keeping the SAME UUID and SAME password,
--      so all foreign keys, CRM leads, interviews, and sessions remain intact).
--      If `hassan@hirzexa.com` already exists as a separate auth.users account, it promotes
--      that account to super_admin and suspends the legacy `admin@devtech.ai` employee row.
--   2. Syncs `public.employees` and operational email display columns (interviews, tasks,
--      applications, agent conversations) so outbound notifications never target @devtech.ai.
--   3. Preserves immutable historical `public.audit_logs` and appends a migration audit entry.

begin;

do $$
declare
  v_legacy_email constant text := 'admin@devtech.ai';
  v_target_email constant text := 'hassan@hirzexa.com';
  v_legacy_uid uuid;
  v_target_uid uuid;
  v_legacy_emp_id uuid;
  v_target_emp_id uuid;
begin
  select id into v_legacy_uid from auth.users where lower(email) = v_legacy_email limit 1;
  select id into v_target_uid from auth.users where lower(email) = v_target_email limit 1;

  if v_legacy_uid is not null and v_target_uid is null then
    -- Case A (Standard): Update existing auth.users row in-place (preserves UUID & password!)
    update auth.users
    set email = v_target_email,
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
          || jsonb_build_object('email', v_target_email, 'email_verified', true),
        updated_at = now()
    where id = v_legacy_uid;

    -- Sync Supabase Auth email identity provider metadata (leaves generated columns untouched)
    update auth.identities
    set identity_data = coalesce(identity_data, '{}'::jsonb)
          || jsonb_build_object('email', v_target_email, 'email_verified', true),
        updated_at = now()
    where user_id = v_legacy_uid
      and provider = 'email';

    v_target_uid := v_legacy_uid;
    raise notice 'Updated auth.users (%) email in-place: % -> %', v_target_uid, v_legacy_email, v_target_email;

  elsif v_legacy_uid is not null and v_target_uid is not null and v_legacy_uid <> v_target_uid then
    -- Case B: hassan@hirzexa.com already exists as a separate auth.users account
    insert into public.admin_users (id, role)
    values (v_target_uid, 'admin')
    on conflict (id) do nothing;

    delete from public.admin_users where id = v_legacy_uid;
    raise notice 'Promoted existing auth.users (%) (%) to admin_users and removed legacy % from admin_users.',
      v_target_uid, v_target_email, v_legacy_email;

  elsif v_target_uid is not null then
    raise notice 'auth.users already migrated to % (%).', v_target_email, v_target_uid;
  else
    raise notice 'No auth.users row found for % or %; skipping auth.users update.', v_legacy_email, v_target_email;
  end if;

  -- Sync public.employees cleanly without unique-email collisions
  select id into v_legacy_emp_id from public.employees where lower(email) = v_legacy_email limit 1;
  select id into v_target_emp_id from public.employees where lower(email) = v_target_email limit 1;

  if v_legacy_emp_id is not null and v_target_emp_id is null then
    update public.employees
    set email = v_target_email,
        auth_user_id = coalesce(v_target_uid, auth_user_id),
        role_key = 'super_admin',
        status = 'active',
        updated_at = now()
    where id = v_legacy_emp_id;
    v_target_emp_id := v_legacy_emp_id;
  elsif v_legacy_emp_id is not null and v_target_emp_id is not null and v_legacy_emp_id <> v_target_emp_id then
    -- Repoint existing employee-linked records to target employee row before suspending legacy
    update public.crm_leads set owner_employee_id = v_target_emp_id where owner_employee_id = v_legacy_emp_id;
    update public.interview_invitations set interviewer_employee_id = v_target_emp_id where interviewer_employee_id = v_legacy_emp_id;
    update public.interview_appointments set interviewer_employee_id = v_target_emp_id where interviewer_employee_id = v_legacy_emp_id;

    update public.employees
    set auth_user_id = coalesce(v_target_uid, auth_user_id),
        role_key = 'super_admin',
        status = 'active',
        updated_at = now()
    where id = v_target_emp_id;

    update public.employees
    set status = 'suspended',
        auth_user_id = null,
        session_version = session_version + 1,
        updated_at = now()
    where id = v_legacy_emp_id;
  end if;

  -- Sync operational email columns so outbound emails & filters use hassan@hirzexa.com
  update public.interview_invitations
  set interviewer_email = v_target_email, updated_at = now()
  where lower(interviewer_email) = v_legacy_email;

  update public.interview_appointments
  set interviewer_email = v_target_email, updated_at = now()
  where lower(interviewer_email) = v_legacy_email;

  update public.crm_tasks
  set assigned_to_email = v_target_email, updated_at = now()
  where lower(assigned_to_email) = v_legacy_email;

  update public.crm_tasks
  set created_by_email = v_target_email, updated_at = now()
  where lower(created_by_email) = v_legacy_email;

  update public.job_applications
  set created_by_email = v_target_email
  where lower(created_by_email) = v_legacy_email;

  update public.agent_conversations
  set actor_email = v_target_email
  where lower(actor_email) = v_legacy_email;

  update public.agent_pending_actions
  set actor_email = v_target_email
  where lower(actor_email) = v_legacy_email;

  -- Record immutable security audit trail entry
  insert into public.audit_logs (
    actor_id, actor_email, actor_role, module, action,
    entity_type, entity_id, outcome, summary
  )
  values (
    coalesce(v_target_uid::text, 'system:migration'),
    v_target_email,
    'super_admin',
    'auth',
    'migrate_super_admin_email',
    'employee',
    coalesce(v_target_emp_id::text, v_target_uid::text),
    'allowed',
    'Migrated legacy Super Admin identity from admin@devtech.ai to canonical hassan@hirzexa.com.'
  );
end $$;

commit;

-- Quick verification query (read-only)
select id, email, role_key, status, mfa_enrolled
from public.employees
where lower(email) in ('hassan@hirzexa.com', 'admin@devtech.ai');
