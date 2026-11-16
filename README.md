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
- Supabase / PostgreSQL
- Meta WhatsApp Cloud API
- Scheduled jobs for reminders

## Getting started

1. Install Node.js 20 or newer.
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local` and fill in the values.
4. Start development: `npm run dev`

## WhatsApp setup

Configure a Meta app with the WhatsApp product. Set the webhook URL to:

`https://YOUR_PUBLIC_HOST/api/webhooks/whatsapp`

Use the same `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in Meta's webhook verification form and your environment. Configure the Meta app secret to validate webhook signatures.

Only message people who have provided valid consent. Business-initiated messages must use approved templates where required. Honor opt-outs promptly, respect Meta quality/rate limits, and do not use unofficial WhatsApp Web automation libraries.

## Current status

Initial scaffold committed: dashboard shell, health endpoint, webhook verification/signature validation, environment template, and initial database migration. Authentication, database access layer, appointment workflows, and asynchronous event processing remain to be implemented.
