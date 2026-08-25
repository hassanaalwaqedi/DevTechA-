# DevTech AI

Next.js App Router site and careers platform backed by Supabase PostgreSQL.

## Local setup

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL editor.
3. Create an admin user in Supabase Authentication.
4. Insert that user into `public.admin_users`:

```sql
insert into public.admin_users (id, role)
values ('AUTH_USER_UUID', 'admin');
```

5. Copy `.env.example` to `.env.local` and set the project URL, anon key, and admin email.
6. Start the app with `npm run dev`.

The frontend does not contain production fallback data. Without Supabase configured, public database-driven sections are empty and protected operations return configuration/authentication errors.

## Render deployment

This repository includes [`render.yaml`](./render.yaml) for a single full-stack Next.js web service. Create a new Render Blueprint from the repository, then set these environment variables in Render:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-key
NEXT_PUBLIC_SITE_URL=https://your-render-service.onrender.com
```

Firebase Hosting/App Hosting is not required for this architecture.

## Backend surface

- `GET/POST /api/jobs`, `PATCH/DELETE /api/jobs/[id]`
- `GET/POST /api/products`, `PATCH/DELETE /api/products/[slug]`
- `POST /api/applications` with multipart CV upload
- `GET /api/applications` for authenticated admins
- `PATCH /api/applications/[id]` for status and notes
- `GET /api/applications/[id]/cv` for a short-lived signed CV URL
- `GET /api/metrics` for database-backed ATS metrics
- `GET /api/health` for a PostgreSQL connectivity check

Admin authorization is checked server-side against `auth.users` plus `public.admin_users`. CVs are stored in the private `cvs` bucket and never exposed through a public URL.
