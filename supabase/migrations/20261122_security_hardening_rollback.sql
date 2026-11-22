-- HIRZEXA — Enterprise Security Audit Hardening ROLLBACK Procedure (2026-11-22)
-- USE ONLY IF AN EMERGENCY ROLLBACK OF `20261122_security_hardening_patch.sql` IS REQUIRED.
--
-- PRE-MIGRATION BACKUP PROCEDURE (Execute BEFORE applying hardening patch):
--   1. Trigger an on-demand Supabase database backup / confirm PITR recovery timestamp
--      in Supabase Dashboard -> Database -> Backups.
--   2. Export current pg_policies & function definitions for audit trail:
--        pg_dump --schema-only --schema=public "$DATABASE_URL" > pre_20261122_schema_backup.sql
--   3. Record exact UTC timestamp before running `20261122_security_hardening_patch.sql`.
--
-- ROLLBACK PROCEDURE (Restores prior policies without dropping any tables or customer data):

begin;

-- 1. Restore permissive policies only if an unexpected client regression occurs
drop policy if exists "rbac_hr_read_application_answers" on public.application_answers;
drop policy if exists "rbac_hr_manage_application_answers" on public.application_answers;
-- Note: Keep RLS enabled on application_answers; do NOT disable RLS unless explicitly approved.

drop policy if exists "anyone can submit applications" on public.job_applications;
create policy "anyone can submit applications" on public.job_applications
  for insert with check (true);

drop policy if exists "anyone can record page views" on public.visitor_events;
create policy "anyone can record page views" on public.visitor_events
  for insert to anon, authenticated with check (true);

drop policy if exists "crm_contacts_select_rbac" on public.crm_contacts;
create policy "crm_contacts_select_rbac" on public.crm_contacts
  for select using (
    public.hirzexa_has_permission('crm', 'view')
    or public.hirzexa_has_permission('bookings', 'view')
  );

drop policy if exists "crm_companies_select_rbac" on public.crm_companies;
create policy "crm_companies_select_rbac" on public.crm_companies
  for select using (
    public.hirzexa_has_permission('crm', 'view')
    or public.hirzexa_has_permission('bookings', 'view')
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

-- If Phase 2 service_role revocations were applied and must be rolled back:
grant execute on function public.record_invitation_webhook_event(text, text, text, text) to anon, authenticated;
grant execute on function public.record_interview_email_webhook(text, text, text, text) to anon, authenticated, service_role;
grant execute on function public.record_recruitment_email_webhook(text, text, text, text) to anon, authenticated, service_role;
grant execute on function public.verify_employee_invitation(text) to anon, authenticated, service_role;
grant execute on function public.consume_employee_invitation(text, uuid) to anon, authenticated, service_role;

drop policy if exists "rbac_hr_upload_private_cvs" on storage.objects;
drop policy if exists "candidates can upload private cvs" on storage.objects;
create policy "candidates can upload private cvs" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'cvs');

commit;

notify pgrst, 'reload schema';
