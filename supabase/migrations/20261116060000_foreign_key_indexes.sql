create index if not exists appointments_customer_idx on public.appointments(customer_id);
create index if not exists appointments_service_idx on public.appointments(service_id);
create index if not exists campaigns_business_idx on public.campaigns(business_id);
create index if not exists message_logs_appointment_idx on public.message_logs(appointment_id);
create index if not exists message_logs_campaign_idx on public.message_logs(campaign_id);
create index if not exists message_logs_customer_idx on public.message_logs(customer_id);
create index if not exists webhook_events_business_idx on public.webhook_events(business_id);