create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  category text not null check (category in ('UTILITY','MARKETING','AUTHENTICATION')),
  language text not null default 'en',
  body text not null,
  status text not null default 'draft' check (status in ('draft','submitted','approved','rejected','paused')),
  meta_template_name text,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, name, language)
);
create index if not exists message_templates_business_idx on public.message_templates(business_id, created_at desc);
alter table public.message_templates enable row level security;
create policy "members can manage message templates" on public.message_templates
for all to authenticated
using (exists (select 1 from public.business_members m where m.business_id = message_templates.business_id and m.user_id = (select auth.uid())))
with check (exists (select 1 from public.business_members m where m.business_id = message_templates.business_id and m.user_id = (select auth.uid())));
revoke all on public.message_templates from anon;
grant select, insert, update, delete on public.message_templates to authenticated;