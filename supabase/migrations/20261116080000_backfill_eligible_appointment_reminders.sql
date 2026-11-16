create or replace function private.backfill_customer_appointment_reminders()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_template public.message_templates%rowtype;
  v_appointment public.appointments%rowtype;
begin
  if auth.uid() is not null and not exists (
    select 1 from public.business_members m where m.business_id=new.business_id and m.user_id=auth.uid()
  ) then raise exception 'Not authorized to manage reminders for this customer'; end if;
  if new.whatsapp_opt_in=false or new.opted_out_at is not null then return new; end if;
  select * into v_template from public.message_templates t
  where t.business_id=new.business_id and t.category='UTILITY' and t.status='approved'
  order by t.created_at asc limit 1;
  if not found then return new; end if;
  for v_appointment in
    select * from public.appointments a
    where a.business_id=new.business_id and a.customer_id=new.id
      and a.status in ('booked','confirmed') and a.starts_at>now()
  loop
    insert into public.reminder_queue
      (business_id,appointment_id,customer_id,reminder_type,template_name,scheduled_for)
    values
      (new.business_id,v_appointment.id,new.id,'day_before',
       coalesce(nullif(v_template.meta_template_name,''),v_template.name),v_appointment.starts_at-interval '24 hours'),
      (new.business_id,v_appointment.id,new.id,'two_hours_before',
       coalesce(nullif(v_template.meta_template_name,''),v_template.name),v_appointment.starts_at-interval '2 hours')
    on conflict (appointment_id,reminder_type) do update
      set template_name=excluded.template_name,scheduled_for=excluded.scheduled_for,
          status=case when public.reminder_queue.status='cancelled' then 'pending' else public.reminder_queue.status end,
          updated_at=now()
      where public.reminder_queue.status in ('pending','cancelled');
  end loop;
  update public.reminder_queue set status='cancelled',updated_at=now()
  where customer_id=new.id and status='pending' and scheduled_for<=now();
  return new;
end;
$$;

create or replace function private.backfill_template_appointment_reminders()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_appointment public.appointments%rowtype;
begin
  if new.status<>'approved' or new.category<>'UTILITY' then return new; end if;
  if auth.uid() is not null and not exists (
    select 1 from public.business_members m where m.business_id=new.business_id and m.user_id=auth.uid()
  ) then raise exception 'Not authorized to manage reminders for this business'; end if;
  for v_appointment in
    select a.* from public.appointments a
    join public.customers c on c.id=a.customer_id and c.business_id=a.business_id
    where a.business_id=new.business_id and a.status in ('booked','confirmed')
      and a.starts_at>now() and c.whatsapp_opt_in=true and c.opted_out_at is null
  loop
    insert into public.reminder_queue
      (business_id,appointment_id,customer_id,reminder_type,template_name,scheduled_for)
    values
      (new.business_id,v_appointment.id,v_appointment.customer_id,'day_before',
       coalesce(nullif(new.meta_template_name,''),new.name),v_appointment.starts_at-interval '24 hours'),
      (new.business_id,v_appointment.id,v_appointment.customer_id,'two_hours_before',
       coalesce(nullif(new.meta_template_name,''),new.name),v_appointment.starts_at-interval '2 hours')
    on conflict (appointment_id,reminder_type) do update
      set template_name=excluded.template_name,scheduled_for=excluded.scheduled_for,
          status=case when public.reminder_queue.status='cancelled' then 'pending' else public.reminder_queue.status end,
          updated_at=now()
      where public.reminder_queue.status in ('pending','cancelled');
  end loop;
  update public.reminder_queue set status='cancelled',updated_at=now()
  where business_id=new.business_id and status='pending' and scheduled_for<=now();
  return new;
end;
$$;

drop trigger if exists customers_backfill_pending_reminders on public.customers;
create trigger customers_backfill_pending_reminders
after update of whatsapp_opt_in,opted_out_at on public.customers
for each row execute function private.backfill_customer_appointment_reminders();

drop trigger if exists templates_backfill_pending_reminders on public.message_templates;
create trigger templates_backfill_pending_reminders
after insert or update of status,meta_template_name on public.message_templates
for each row execute function private.backfill_template_appointment_reminders();

revoke all on function private.backfill_customer_appointment_reminders() from public,anon,authenticated;
revoke all on function private.backfill_template_appointment_reminders() from public,anon,authenticated;
