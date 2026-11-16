-- Weekly opening hours and one-off closure dates for salon availability.
create table if not exists public.salon_business_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  is_closed boolean not null default true,
  opens_at time,
  closes_at time,
  break_starts_at time,
  break_ends_at time,
  updated_at timestamptz not null default now(),
  constraint salon_hours_unique_day unique (business_id, day_of_week),
  constraint salon_hours_open_close check (
    (is_closed and opens_at is null and closes_at is null)
    or
    (not is_closed and opens_at is not null and closes_at is not null and closes_at > opens_at)
  ),
  constraint salon_hours_break_pair check (
    (break_starts_at is null and break_ends_at is null)
    or
    (break_starts_at is not null and break_ends_at is not null
      and break_ends_at > break_starts_at
      and opens_at is not null and break_starts_at > opens_at
      and closes_at is not null and break_ends_at < closes_at)
  )
);

create table if not exists public.salon_closures (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  closed_on date not null,
  reason text,
  created_at timestamptz not null default now(),
  constraint salon_closures_unique_day unique (business_id, closed_on)
);

create index if not exists salon_closures_business_date_idx
  on public.salon_closures (business_id, closed_on);

alter table public.salon_business_hours enable row level security;
alter table public.salon_closures enable row level security;

drop policy if exists "members can manage salon business hours" on public.salon_business_hours;
create policy "members can manage salon business hours"
on public.salon_business_hours for all
using (exists (select 1 from public.business_members m where m.business_id = salon_business_hours.business_id and m.user_id = (select auth.uid())))
with check (exists (select 1 from public.business_members m where m.business_id = salon_business_hours.business_id and m.user_id = (select auth.uid())));

drop policy if exists "members can manage salon closures" on public.salon_closures;
create policy "members can manage salon closures"
on public.salon_closures for all
using (exists (select 1 from public.business_members m where m.business_id = salon_closures.business_id and m.user_id = (select auth.uid())))
with check (exists (select 1 from public.business_members m where m.business_id = salon_closures.business_id and m.user_id = (select auth.uid())));
