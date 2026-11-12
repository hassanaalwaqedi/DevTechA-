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

All public operational addresses and `mailto:` links come from [`lib/company-emails.ts`](./lib/company-emails.ts), and server-side departmental notification/acknowledgment templates live in [`lib/email-templates.ts`](./lib/email-templates.ts). These Google Workspace addresses are aliases under one primary administration mailbox (`hassan@hirzexa.com`, kept non-public); receiving email on an alias does not automatically enable sending from that alias without verifying sender identity and SPF/DKIM/DMARC.

The contact form sends JSON to `POST /api/contact`. The server validates all fields, checks honeypot and URL-flood spam guards, limits requests to five per IP per hour (best effort per running process), assigns a reference ID (`HRZ-YYYY-NNNNN`), and selects the target department on the server from the submitted category across `contact@hirzexa.com`, `business@hirzexa.com`, `support@hirzexa.com`, `partnerships@hirzexa.com`, `investors@hirzexa.com`, `careers@hirzexa.com`, `orders@hirzexa.com`, `finance@hirzexa.com`, `privacy@hirzexa.com`, and `legal@hirzexa.com`. The browser cannot override `recipient`.

Set `CONTACT_WEBHOOK_URL` (and optionally `CONTACT_WEBHOOK_SECRET`) as **server-only** environment variables in deployment. The payload includes the validated fields, `recipient`, `department`, `reference`, `internalNotification`, `acknowledgment` (using `noreply@hirzexa.com` with explicit departmental `replyTo`), and `autoAckAuthorized` (which stays `false` until `VERIFIED_EMAIL_SENDER_ENABLED=true` is explicitly set after verifying Google Workspace sender identity). Missing webhook configuration returns HTTP 503 and failed webhook delivery returns HTTP 502, both with the department-specific fallback email.

Before enabling automated messages, confirm every alias in the Google Workspace Admin Console, verify "Send mail as" / SMTP or Gmail API OAuth/service-account credentials server-side, verify SPF/DKIM/DMARC DNS records for `hirzexa.com`, and run live test enquiries for each routing department.

Admin authorization is checked server-side against `auth.users` plus `public.admin_users`. CVs and cover letters are stored in the private `cvs` bucket and only exposed to admins through short-lived signed URLs.

Visitor analytics stores a random browser ID, page path, job slug, and timestamp. It does not store IP addresses, user agents, names, or contact details, and respects the browser's Do Not Track setting.
