-- Initial schema for Salon WhatsApp Automation.
-- Apply using the Supabase SQL editor or Supabase CLI migrations.
-- Store phone numbers in normalized international E.164 format.
create extension if not exists pgcrypto;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone_e164 text not null unique,
  whatsapp_opt_in boolean not null default false,
  opt_in_at timestamptz,
  opt_in_source text,
  opted_out_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_opt_in_timestamp check (
    (whatsapp_opt_in = false) or (opt_in_at is not null)
  )
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  starts_at timestamptz not null,
  service_name text not null,
  status text not null default 'booked'
    check (status in ('booked', 'confirmed', 'completed', 'cancelled', 'no_show')),
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.message_logs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  direction text not null check (direction in ('outbound', 'inbound')),
  message_type text not null,
  template_name text,
  meta_message_id text unique,
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'delivered', 'read', 'failed', 'received')),
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists appointments_starts_at_idx
  on public.appointments (starts_at) where status in ('booked', 'confirmed');
create index if not exists message_logs_customer_created_idx
  on public.message_logs (customer_id, created_at desc);

-- Enable RLS immediately. Add role-specific policies before exposing any table
-- through the Supabase client. Do not use the service-role key in a browser.
alter table public.customers enable row level security;
alter table public.appointments enable row level security;
alter table public.message_logs enable row level security;
