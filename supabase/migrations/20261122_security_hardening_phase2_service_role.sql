-- HIRZEXA — P0 Security Hardening PHASE 2: Service-Role Exclusive Lock (2026-11-22)
-- DO NOT APPLY BEFORE:
--   1. `20261122_security_hardening_patch.sql` (Phase 1) is applied and verified.
--   2. This code branch (`security/p0-remediation-20261122`) is deployed to Render.
--   3. `SUPABASE_SERVICE_ROLE_KEY` is configured as a server-only env var on Render.
--
-- Once those 3 prerequisites are met, this migration removes ALL direct `anon`/`authenticated`
-- access to webhook RPCs, invitation consumption RPC, and direct `cvs` storage uploads,
-- forcing all traffic through Next.js server-side validation, rate limiting, and HMAC verification.

begin;

-- 1. Restrict Resend webhook delivery-tracking RPCs strictly to service_role
revoke execute on function public.record_invitation_webhook_event(text, text, text, text) from public, anon, authenticated;
revoke execute on function public.record_interview_email_webhook(text, text, text, text) from public, anon, authenticated;
revoke execute on function public.record_recruitment_email_webhook(text, text, text, text) from public, anon, authenticated;
grant execute on function public.record_invitation_webhook_event(text, text, text, text) to service_role;
grant execute on function public.record_interview_email_webhook(text, text, text, text) to service_role;
grant execute on function public.record_recruitment_email_webhook(text, text, text, text) to service_role;

-- 2. Restrict single-use employee invitation verification/consumption RPCs strictly to service_role
revoke execute on function public.verify_employee_invitation(text) from public, anon, authenticated;
revoke execute on function public.consume_employee_invitation(text, uuid) from public, anon, authenticated;
grant execute on function public.verify_employee_invitation(text) to service_role;
grant execute on function public.consume_employee_invitation(text, uuid) to service_role;

-- 3. Drop direct anonymous uploads to private `cvs` bucket (uploads now go via validated POST /api/applications)
drop policy if exists "candidates can upload private cvs" on storage.objects;

-- Allow authorized HR staff uploading external candidate CVs via authenticated session (in addition to service_role)
drop policy if exists "rbac_hr_upload_private_cvs" on storage.objects;
create policy "rbac_hr_upload_private_cvs" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'cvs'
    and (
      exists (select 1 from public.admin_users where id = auth.uid())
      or public.hirzexa_has_permission('recruitment', 'create')
      or public.hirzexa_has_permission('recruitment', 'edit')
    )
  );

commit;

notify pgrst, 'reload schema';
