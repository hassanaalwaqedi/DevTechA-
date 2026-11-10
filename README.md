# HIRZEXA

Next.js App Router site and careers platform backed by Supabase PostgreSQL.

## Local setup

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL editor. It is safe to rerun and adds the recruitment fields and visitor analytics used by the application.
3. Create an admin user in Supabase Authentication.
4. Insert that user into `public.admin_users`:

```sql
insert into public.admin_users (id, role)
values ('AUTH_USER_UUID', 'admin');
```

5. Copy `.env.example` to `.env.local` and set the project URL and anon key.
6. Start the app with `npm run dev`.

The frontend does not contain production fallback data. Without Supabase configured, public database-driven sections are empty and protected operations return configuration/authentication errors.

## Render deployment

This repository includes [`render.yaml`](./render.yaml) for a single full-stack Next.js web service. Create a new Render Blueprint from the repository, then set these environment variables in Render:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-key
NEXT_PUBLIC_SITE_URL=https://hirzexa.com
```

Firebase Hosting/App Hosting is not required for this architecture.

The public brand and canonical URLs use `https://hirzexa.com`. The existing Render service name and Supabase identifiers remain unchanged for deployment and data compatibility.

## Backend surface

- `GET/POST /api/jobs`, `PATCH/DELETE /api/jobs/[id]`
- `GET/POST /api/products`, `PATCH/DELETE /api/products/[slug]`
- `POST /api/applications` with multipart CV and optional cover-letter uploads
- `GET /api/applications` for authenticated admins
- `PATCH /api/applications/[id]` for status and notes
- `GET /api/applications/[id]/cv` for a short-lived signed CV URL
- `GET /api/metrics` for database-backed ATS metrics
- `POST /api/analytics/page-view` for anonymous first-party page-view tracking
- `GET /api/health` for a PostgreSQL connectivity check

## Company email and contact delivery

All public addresses and `mailto:` links come from [`lib/company-emails.ts`](./lib/company-emails.ts). The nine Google Workspace addresses are aliases of one account; this application does not create accounts or sign in to an alias. The primary administrator mailbox is not part of the public configuration.

The contact form sends JSON to `POST /api/contact`. The server validates the fields, limits requests to five per IP per hour (best effort per running process), and selects a recipient from the submitted category. Computer Vision, Edge AI, AEGIS AI, software, and other technical enquiries target `support@hirzexa.com`; device enquiries target `orders@hirzexa.com`; technology partnerships target `partnerships@hirzexa.com`. The browser cannot select an arbitrary recipient. The endpoint does not store contact messages.

Set `CONTACT_WEBHOOK_URL` as a **server-only** environment variable in the deployment. It must point to an HTTPS service that accepts the JSON payload and forwards it to the `recipient` address. The payload contains `name`, `email`, `company`, `category`, `budget`, `overview`, `recipient`, `department`, and `source`. The website reports success only after that endpoint responds with HTTP 2xx. Missing configuration returns 503; failed delivery returns 502. Both cases include `contact@hirzexa.com` as a fallback, and the Contact page provides a clickable email link. Local form delivery is unavailable unless `.env.local` contains a working webhook URL.

Before release, verify every alias in Google Workspace, configure the webhook to forward to the supplied recipient, and submit a test enquiry for each routing group. A Google Workspace alias is not an independent SMTP account. If direct Gmail API delivery is later required, authorize the primary account with a secure OAuth or service-account process and store credentials only on the server.

Admin authorization is checked server-side against `auth.users` plus `public.admin_users`. CVs and cover letters are stored in the private `cvs` bucket and only exposed to admins through short-lived signed URLs.

Visitor analytics stores a random browser ID, page path, job slug, and timestamp. It does not store IP addresses, user agents, names, or contact details, and respects the browser's Do Not Track setting.
