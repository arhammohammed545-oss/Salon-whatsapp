-- Hybrid WhatsApp appointment confirmation workflow.
-- Available WhatsApp slots can be confirmed automatically; exceptional requests
-- are stored as pending_approval for the salon owner to review.

alter table public.appointments
  drop constraint if exists appointments_status_check;

alter table public.appointments
  add constraint appointments_status_check
  check (status in ('booked','pending_approval','confirmed','completed','cancelled','no_show'));

alter table public.appointments
  add column if not exists booking_channel text not null default 'dashboard'
    check (booking_channel in ('dashboard','whatsapp','phone','walk_in')),
  add column if not exists confirmation_mode text not null default 'owner_approval'
    check (confirmation_mode in ('automatic','owner_approval')),
  add column if not exists approval_reason text,
  add column if not exists requested_at timestamptz not null default now();

create index if not exists appointments_pending_approval_idx
  on public.appointments (business_id, requested_at desc)
  where status = 'pending_approval';
