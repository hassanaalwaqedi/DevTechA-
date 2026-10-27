-- Product Studio Admin upgrade.
-- Safe to run more than once in the Supabase SQL editor.

alter table public.products add column if not exists gallery_urls text[] not null default '{}';
alter table public.products add column if not exists launch_url text;
alter table public.products add column if not exists is_published boolean not null default true;

drop policy if exists "published products are public" on public.products;
drop policy if exists "admins manage products" on public.products;

create policy "published products are public"
on public.products for select
using (is_published = true);

create policy "admins manage products"
on public.products for all
using (exists (select 1 from public.admin_users where id = auth.uid()))
with check (exists (select 1 from public.admin_users where id = auth.uid()));
