# Salon Messaging & Operations

An example salon customer-management and appointment-messaging application built with Next.js, Supabase, and the official WhatsApp Cloud API.

This repository is a work in progress. It is intended as a reusable starter project, not a production-ready messaging service.

## Features in this repository

- Customer records with WhatsApp consent and opt-out tracking
- Service and appointment management
- Message-template drafts and reminder queue scheduling
- Supabase authentication and row-level security
- WhatsApp webhook verification and event persistence
- A protected reminder validation endpoint (dry-run only)

## Technology

- Next.js App Router and TypeScript
- Supabase Auth and PostgreSQL
- Supabase SSR
- Meta WhatsApp Cloud API

## Requirements

- Node.js 20 or newer
- A Supabase project
- A Meta app with the WhatsApp product (only if configuring WhatsApp integration)

## Local setup

1. Clone this repository and install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template:

   ```bash
   cp .env.example .env.local
   ```

3. Configure the Supabase URL and publishable key in `.env.local`.
4. Configure server-only secrets in your local environment or deployment platform. Never expose secret keys or Meta access tokens through `NEXT_PUBLIC_*` variables.
5. Start the development server:

   ```bash
   npm run dev
   ```

The app uses Supabase Auth email/password sign-in and currently has no public sign-up screen. To test it, create a test user in your own Supabase project and provision a matching business and membership record using the migrations as a guide. Do not use production customer records for development.

## Environment variables

See [`.env.example`](.env.example) for the complete list of variable names. Use only credentials from services and projects that you own or are authorized to administer.

## Reminder worker status

The endpoint `/api/cron/reminders` validates queued reminders but is **dry-run only**. It does not call Meta, send messages, or mark reminders as sent. The current `vercel.json` schedule is daily at 03:30 UTC. Change the schedule only after considering your hosting plan and operational requirements.

## WhatsApp integration status

The webhook endpoint supports Meta verification and signature validation, and persists incoming message and delivery-status events. Actual outbound dispatch and inbound conversation automation are not implemented. A verified WhatsApp Business number, approved templates, production configuration, and end-to-end tests are still required before real messaging can be enabled.

Only message people who have provided valid consent. Honor opt-outs promptly, use approved templates where required, and follow Meta's applicable policies and rate limits. Do not use unofficial WhatsApp Web automation libraries.

## Security and privacy

- Never commit `.env.local`, access tokens, service-role keys, database credentials, customer exports, or real message payloads.
- Use synthetic data in screenshots, tests, issues, and pull requests.
- Review the [Security Policy](SECURITY.md) before reporting a vulnerability.
- This project has not yet undergone an independent security audit. Do not deploy it with real customer data without your own security, privacy, and compliance review.

## Project status

This is an evolving starter project. The code and documentation may change, and features should be treated as experimental until tested in your own environment.
