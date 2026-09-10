-- DevTech AI production schema. Apply this file in Supabase SQL editor.
create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(), name text not null, slug text unique not null,
  eyebrow text not null, description text not null, long_description text not null,
  status text not null, platforms text[] not null default '{}', color text not null default '#e6f1ed', image_url text,
  featured boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.products add column if not exists image_url text;
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(), title text not null, slug text unique not null,
  department text not null, description text not null, responsibilities text[] not null default '{}',
  requirements text[] not null default '{}', nice_to_have text[] not null default '{}', location text not null,
  work_mode text not null, employment_type text not null, duration text not null, compensation_type text not null,
  compensation_text text not null, skills text[] not null default '{}', published_at date, deadline date,
  status text not null default 'draft' check (status in ('draft','open','paused','closed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.admin_users (id uuid primary key references auth.users(id) on delete cascade, role text not null default 'admin', created_at timestamptz not null default now());
create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(), reference_id text unique not null,
  job_id uuid not null references public.jobs(id) on delete restrict, full_name text not null,
  email text not null, phone text, country text not null, current_location text not null,
  linkedin_url text, github_url text, portfolio_url text, cv_path text not null, cover_letter_path text,
  "current_role" text not null, experience text not null, technologies text not null,
  education text, work_authorization text not null, sponsorship_required boolean not null default false,
  salary_expectation text, notice_period text, remote_preference text, why_join text not null, why_fit text not null,
  cover_letter_text text, availability text not null, expected_start_date date not null,
  additional_message text, consent boolean not null default false,
  status text not null default 'new' check (status in ('new','reviewing','shortlisted','interview','accepted','rejected')),
  created_at timestamptz not null default now()
);
alter table public.job_applications add column if not exists cover_letter_path text;
alter table public.job_applications add column if not exists education text;
alter table public.job_applications add column if not exists work_authorization text not null default 'Not specified';
alter table public.job_applications add column if not exists sponsorship_required boolean not null default false;
alter table public.job_applications add column if not exists salary_expectation text;
alter table public.job_applications add column if not exists notice_period text;
alter table public.job_applications add column if not exists remote_preference text;
alter table public.job_applications add column if not exists cover_letter_text text;
alter table public.job_applications add column if not exists consent boolean not null default false;
create table if not exists public.application_answers (id uuid primary key default gen_random_uuid(), application_id uuid not null references public.job_applications(id) on delete cascade, question text not null, answer text not null);
create table if not exists public.application_notes (id uuid primary key default gen_random_uuid(), application_id uuid not null references public.job_applications(id) on delete cascade, admin_id uuid references public.admin_users(id), note text not null, created_at timestamptz not null default now());
create table if not exists public.visitor_events (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,
  path text not null,
  job_slug text,
  created_at timestamptz not null default now()
);
create index if not exists jobs_status_idx on public.jobs(status); create index if not exists applications_job_idx on public.job_applications(job_id); create index if not exists applications_status_idx on public.job_applications(status); create index if not exists applications_created_idx on public.job_applications(created_at desc);
create index if not exists visitor_events_created_idx on public.visitor_events(created_at desc); create index if not exists visitor_events_job_idx on public.visitor_events(job_slug); create index if not exists visitor_events_visitor_idx on public.visitor_events(visitor_id);
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('cvs', 'cvs', false, 10485760, array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']) on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = excluded.allowed_mime_types;
alter table public.admin_users enable row level security; alter table public.jobs enable row level security; alter table public.products enable row level security; alter table public.job_applications enable row level security; alter table public.application_notes enable row level security; alter table public.visitor_events enable row level security;
drop policy if exists "published jobs are public" on public.jobs; drop policy if exists "published products are public" on public.products; drop policy if exists "anyone can submit applications" on public.job_applications; drop policy if exists "admins can read own admin record" on public.admin_users; drop policy if exists "admins manage jobs" on public.jobs; drop policy if exists "admins manage applications" on public.job_applications; drop policy if exists "admins update applications" on public.job_applications; drop policy if exists "admins manage notes" on public.application_notes; drop policy if exists "anyone can record page views" on public.visitor_events; drop policy if exists "admins can read page views" on public.visitor_events; drop policy if exists "candidates can upload private cvs" on storage.objects; drop policy if exists "admins can read private cvs" on storage.objects; drop policy if exists "admins can delete private cvs" on storage.objects;
create policy "published jobs are public" on public.jobs for select using (status = 'open');
create policy "published products are public" on public.products for select using (true);
insert into public.products (name, slug, eyebrow, description, long_description, status, platforms, color, image_url, featured)
values ('Khair', 'khair', 'Meaningful events & community', 'Discover meaningful events, join communities, and help organizers bring people together.', 'Khair is a community and events platform for discovering meaningful experiences, joining communities, and helping organizers bring people together.', 'Live platform', array['Web', 'Mobile-ready'], '#10221d', '/khair-discover.png', true)
on conflict (slug) do nothing;
create policy "anyone can submit applications" on public.job_applications for insert with check (true);
create policy "admins can read own admin record" on public.admin_users for select using (id = auth.uid());
create policy "admins manage jobs" on public.jobs for all using (exists (select 1 from public.admin_users where id = auth.uid()));
create policy "admins manage applications" on public.job_applications for select using (exists (select 1 from public.admin_users where id = auth.uid()));
create policy "admins update applications" on public.job_applications for update using (exists (select 1 from public.admin_users where id = auth.uid()));
create policy "admins manage notes" on public.application_notes for all using (exists (select 1 from public.admin_users where id = auth.uid()));
create policy "anyone can record page views" on public.visitor_events for insert to anon, authenticated with check (true);
create policy "admins can read page views" on public.visitor_events for select using (exists (select 1 from public.admin_users where id = auth.uid()));
create policy "candidates can upload private cvs" on storage.objects for insert to anon, authenticated with check (bucket_id = 'cvs');
create policy "admins can read private cvs" on storage.objects for select to authenticated using (bucket_id = 'cvs' and exists (select 1 from public.admin_users where id = auth.uid()));
create policy "admins can delete private cvs" on storage.objects for delete to authenticated using (bucket_id = 'cvs' and exists (select 1 from public.admin_users where id = auth.uid()));
