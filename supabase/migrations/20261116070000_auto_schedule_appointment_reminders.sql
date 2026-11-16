create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.sync_appointment_reminders()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer public.customers%rowtype;
  v_template public.message_templates%rowtype;
begin
  if auth.uid() is not null and not exists (
    select 1 from public.business_members m
    where m.business_id = new.business_id and m.user_id = auth.uid()
  ) then
    raise exception 'Not authorized to manage reminders for this business';
  end if;

  if tg_op = 'UPDATE' and (
    new.status not in ('booked','confirmed')
    or new.customer_id is distinct from old.customer_id
    or new.starts_at is distinct from old.starts_at
  ) then
    update public.reminder_queue set status = 'cancelled', updated_at = now()
    where appointment_id = new.id and status = 'pending';
  end if;

  if new.status not in ('booked','confirmed') then return new; end if;

  select * into v_customer from public.customers c
  where c.id = new.customer_id and c.business_id = new.business_id;
  if not found or not v_customer.whatsapp_opt_in or v_customer.opted_out_at is not null then return new; end if;

  select * into v_template from public.message_templates t
  where t.business_id = new.business_id and t.category = 'UTILITY' and t.status = 'approved'
  order by t.created_at asc limit 1;
  if not found then return new; end if;

  insert into public.reminder_queue
    (business_id, appointment_id, customer_id, reminder_type, template_name, scheduled_for)
  values
    (new.business_id, new.id, new.customer_id, 'day_before',
     coalesce(nullif(v_template.meta_template_name,''), v_template.name), new.starts_at - interval '24 hours'),
    (new.business_id, new.id, new.customer_id, 'two_hours_before',
     coalesce(nullif(v_template.meta_template_name,''), v_template.name), new.starts_at - interval '2 hours')
  on conflict (appointment_id, reminder_type) do update
    set customer_id = excluded.customer_id, template_name = excluded.template_name,
        scheduled_for = excluded.scheduled_for,
        status = case when public.reminder_queue.status = 'cancelled' then 'pending'
                      else public.reminder_queue.status end,
        updated_at = now()
    where public.reminder_queue.status in ('pending','cancelled');

  update public.reminder_queue set status = 'cancelled', updated_at = now()
  where appointment_id = new.id and status = 'pending' and scheduled_for <= now();
  return new;
end;
$$;

create or replace function private.cancel_customer_reminders_on_optout()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and not exists (
    select 1 from public.business_members m
    where m.business_id = new.business_id and m.user_id = auth.uid()
  ) then
    raise exception 'Not authorized to manage this customer';
  end if;
  if (new.whatsapp_opt_in = false or new.opted_out_at is not null)
     and (old.whatsapp_opt_in is distinct from new.whatsapp_opt_in
          or old.opted_out_at is distinct from new.opted_out_at) then
    update public.reminder_queue set status = 'cancelled', updated_at = now()
    where customer_id = new.id and status = 'pending';
  end if;
  return new;
end;
$$;

drop trigger if exists appointments_sync_reminders on public.appointments;
create trigger appointments_sync_reminders
after insert or update of starts_at, status, customer_id on public.appointments
for each row execute function private.sync_appointment_reminders();

drop trigger if exists customers_cancel_pending_reminders on public.customers;
create trigger customers_cancel_pending_reminders
after update of whatsapp_opt_in, opted_out_at on public.customers
for each row execute function private.cancel_customer_reminders_on_optout();

revoke all on function private.sync_appointment_reminders() from public, anon, authenticated;
revoke all on function private.cancel_customer_reminders_on_optout() from public, anon, authenticated;
