-- Salon WhatsApp core schema. Multi-tenant ready; all tenant data is scoped by business_id.
create extension if not exists pgcrypto;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'Asia/Kolkata',
  phone_e164 text,
  whatsapp_phone_number_id text,
  whatsapp_business_account_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_members (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','admin','staff')),
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);
create index if not exists business_members_user_idx on public.business_members(user_id);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  full_name text not null,
  phone_e164 text not null,
  whatsapp_opt_in boolean not null default false,
  opt_in_at timestamptz,
  opt_in_source text,
  opted_out_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, phone_e164),
  constraint customer_opt_in_timestamp check (not whatsapp_opt_in or opt_in_at is not null)
);
create index if not exists customers_business_name_idx on public.customers(business_id, full_name);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  duration_minutes integer not null default 30 check (duration_minutes > 0),
  price numeric(10,2) check (price is null or price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (business_id, name)
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  service_id uuid references public.services(id) on delete set null,
  service_name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null default 'booked'
    check (status in ('booked','confirmed','completed','cancelled','no_show')),
  reminder_sent_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointment_time_order check (ends_at is null or ends_at > starts_at)
);
create index if not exists appointments_business_starts_idx
  on public.appointments(business_id, starts_at) where status in ('booked','confirmed');

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  template_name text not null,
  status text not null default 'draft'
    check (status in ('draft','scheduled','processing','completed','paused','cancelled')),
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.message_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  direction text not null check (direction in ('outbound','inbound')),
  message_type text not null,
  template_name text,
  meta_message_id text unique,
  status text not null default 'queued'
    check (status in ('queued','sent','delivered','read','failed','received')),
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists message_logs_business_created_idx
  on public.message_logs(business_id, created_at desc);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete set null,
  event_type text not null,
  meta_event_id text unique,
  payload jsonb not null,
  processed_at timestamptz,
  processing_error text,
  received_at timestamptz not null default now()
);
create index if not exists webhook_events_unprocessed_idx
  on public.webhook_events(received_at) where processed_at is null;

-- Every exposed table is protected by RLS and tenant membership.
alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.customers enable row level security;
alter table public.services enable row level security;
alter table public.appointments enable row level security;
alter table public.campaigns enable row level security;
alter table public.message_logs enable row level security;
alter table public.webhook_events enable row level security;

create policy "members can view their businesses" on public.businesses
for select to authenticated using (
  exists (select 1 from public.business_members m where m.business_id = id and m.user_id = (select auth.uid()))
);
create policy "members can view their membership" on public.business_members
for select to authenticated using (user_id = (select auth.uid()));
create policy "members can manage customers" on public.customers
for all to authenticated using (
  exists (select 1 from public.business_members m where m.business_id = customers.business_id and m.user_id = (select auth.uid()))
) with check (
  exists (select 1 from public.business_members m where m.business_id = customers.business_id and m.user_id = (select auth.uid()))
);
create policy "members can manage services" on public.services
for all to authenticated using (
  exists (select 1 from public.business_members m where m.business_id = services.business_id and m.user_id = (select auth.uid()))
) with check (
  exists (select 1 from public.business_members m where m.business_id = services.business_id and m.user_id = (select auth.uid()))
);
create policy "members can manage appointments" on public.appointments
for all to authenticated using (
  exists (select 1 from public.business_members m where m.business_id = appointments.business_id and m.user_id = (select auth.uid()))
) with check (
  exists (select 1 from public.business_members m where m.business_id = appointments.business_id and m.user_id = (select auth.uid()))
);
create policy "members can manage campaigns" on public.campaigns
for all to authenticated using (
  exists (select 1 from public.business_members m where m.business_id = campaigns.business_id and m.user_id = (select auth.uid()))
) with check (
  exists (select 1 from public.business_members m where m.business_id = campaigns.business_id and m.user_id = (select auth.uid()))
);
create policy "members can view message logs" on public.message_logs
for all to authenticated using (
  exists (select 1 from public.business_members m where m.business_id = message_logs.business_id and m.user_id = (select auth.uid()))
) with check (
  exists (select 1 from public.business_members m where m.business_id = message_logs.business_id and m.user_id = (select auth.uid()))
);
create policy "members can view webhook events" on public.webhook_events
for select to authenticated using (
  exists (select 1 from public.business_members m where m.business_id = webhook_events.business_id and m.user_id = (select auth.uid()))
);

-- No anon access. Server-side webhook/worker code uses a secret key stored only on the server.
revoke all on public.businesses, public.business_members, public.customers, public.services,
  public.appointments, public.campaigns, public.message_logs, public.webhook_events from anon;
grant select, insert, update, delete on public.businesses, public.business_members, public.customers,
  public.services, public.appointments, public.campaigns, public.message_logs, public.webhook_events to authenticated;
