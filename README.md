# Salon WhatsApp Automation

A compliant salon customer-management and appointment-messaging platform built around the **official WhatsApp Cloud API**.

## Planned modules

- Customer records with explicit WhatsApp opt-in and opt-out tracking
- Appointment scheduling and reminder jobs
- Approved WhatsApp template messaging
- Incoming-message and delivery-status webhooks
- Campaign management with consent and suppression checks
- Admin dashboard and audit history

## Stack

- Next.js App Router + TypeScript
- Supabase Auth + PostgreSQL
- Supabase SSR cookie sessions
- Meta WhatsApp Cloud API

## Getting started

1. Use Node.js 20 or newer.
2. Install dependencies: `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` using the values from the Supabase project Connect dialog.
5. Set server-only `SUPABASE_SECRET_KEY` and a long random `CRON_SECRET` in the hosting environment. Add Meta credentials only after official Cloud API onboarding.
6. Start development: `npm run dev`.

Do not place Supabase secret/service-role keys or Meta access tokens in any `NEXT_PUBLIC_*` variable or browser code.

## Owner access setup

The app uses Supabase Auth email/password sign-in. There is no public sign-up screen.

1. In Supabase Dashboard, open Authentication → Users and create/invite the salon owner's account.
2. After the owner account exists, copy its Auth user UUID.
3. Add that user to the Kith and Kin workspace using the SQL editor:

```sql
insert into public.business_members (business_id, user_id, role)
values (
  'ceeef97b-a51d-43fd-9437-56db133abb73',
  'REPLACE_WITH_AUTH_USER_UUID',
  'owner'
)
on conflict (business_id, user_id) do nothing;
```

4. The owner can then sign in at `/login`. The app checks the signed-in user and database membership; row-level security controls access to salon records.

## Reminder validation worker

A protected cron endpoint is available at `/api/cron/reminders`. `vercel.json` schedules it every five minutes on Vercel. Configure `CRON_SECRET` in the deployment environment; Vercel sends it as a Bearer token for scheduled invocations. The endpoint rechecks appointment status, customer opt-in/opt-out, and approved Utility templates. It is currently **dry-run only**: it never calls Meta, never sends a message, and never marks a reminder as sent. It cancels queue rows that are no longer eligible. A hosting plan that supports the configured cron frequency is required.

## WhatsApp setup

Configure a Meta app with the WhatsApp product. Set the webhook URL to:

`https://YOUR_PUBLIC_HOST/api/webhooks/whatsapp`

Use the same `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in Meta's webhook verification form and your environment. Configure the Meta app secret to validate webhook signatures.

Only message people who have provided valid consent. Business-initiated messages must use approved templates where required. Honor opt-outs promptly, respect Meta quality/rate limits, and do not use unofficial WhatsApp Web automation libraries.

## Current implementation status

- Dashboard shell and responsive styling
- Supabase core schema with row-level security
- Supabase SSR browser/server clients and session-refresh middleware
- Email/password login and sign-out
- Customer list backed by Supabase, with search and customer creation
- Customer WhatsApp consent and opt-out management
- Service and appointment management
- Message-template drafts and reminder queue scheduling
- Protected, scheduled reminder validation endpoint (dry-run only)

Still pending: connect a verified WhatsApp Cloud API number, submit/sync Meta templates, implement the actual message dispatcher and delivery webhooks, create the salon owner's Auth account and workspace membership, deploy, and complete end-to-end testing.
