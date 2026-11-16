-- Secure appointment reminder queue.
-- Authenticated salon users can inspect queue records but cannot enqueue or dispatch messages.
-- Only trusted server-side workers using the service role can write queue state.
create table if not exists public.reminder_queue (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  reminder_type text not null check (reminder_type in ('day_before','two_hours_before')),
  template_name text not null,
  scheduled_for timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending','processing','sent','failed','cancelled')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reminder_queue_once_per_type unique (appointment_id, reminder_type)
);
create index if not exists reminder_queue_due_idx
  on public.reminder_queue(status, scheduled_for) where status = 'pending';
create index if not exists reminder_queue_business_idx
  on public.reminder_queue(business_id, scheduled_for desc);
alter table public.reminder_queue enable row level security;
create policy "members can view reminder queue"
  on public.reminder_queue for select to authenticated
  using (exists (
    select 1 from public.business_members m
    where m.business_id = reminder_queue.business_id
      and m.user_id = (select auth.uid())
  ));
revoke all on public.reminder_queue from anon;
revoke insert, update, delete on public.reminder_queue from authenticated;
grant select on public.reminder_queue to authenticated;
grant all on public.reminder_queue to service_role;
