-- AUTO BRIDGE role-based Row Level Security.
-- Mirrors the production migration applied on 2026-09-04.
-- Role source: public.user_profiles; identity source: Supabase Auth JWT email.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

insert into public.user_profiles (
  id,email,full_name,role,permissions,permissions_customized,status,created_by,created_at,updated_at
)
values (
  gen_random_uuid()::text,
  'erdenetogtokh2000@gmail.com',
  'Admin','ADMIN','[]',false,'ACTIVE','rls-migration',current_timestamp::text,current_timestamp::text
)
on conflict (email) do update set role='ADMIN',status='ACTIVE',updated_at=current_timestamp::text;

create or replace function private.current_email()
returns text language sql stable security definer set search_path=''
as $$ select lower(coalesce((select auth.jwt()->>'email'),'')); $$;

create or replace function private.current_role()
returns text language sql stable security definer set search_path=''
as $$
  select up.role from public.user_profiles up
  where lower(up.email)=private.current_email() and up.status='ACTIVE' limit 1;
$$;

create or replace function private.has_permission(requested_permission text)
returns boolean language plpgsql stable security definer set search_path=''
as $$
declare
  r text; customized boolean; raw_permissions text; p jsonb := '[]'::jsonb;
begin
  select role,permissions_customized,permissions into r,customized,raw_permissions
  from public.user_profiles
  where lower(email)=private.current_email() and status='ACTIVE' limit 1;
  if r is null then return false; end if;
  if r='ADMIN' then return true; end if;
  begin p := coalesce(raw_permissions::jsonb,'[]'::jsonb);
  exception when others then p := '[]'::jsonb; end;
  if customized then return p ? requested_permission; end if;
  if r='MANAGER' then
    return requested_permission=any(array['DASHBOARD_VIEW','QUOTES_MANAGE','ORDERS_MANAGE','CATALOG_MANAGE','NOTIFICATIONS_MANAGE','EXPOS_MANAGE','FINANCING_VIEW','REPORTS_VIEW']::text[]);
  elsif r='CUSTOMER' then
    return requested_permission=any(array['CUSTOMER_DASHBOARD_VIEW','CUSTOMER_QUOTES_VIEW','CUSTOMER_QUOTE_DECIDE','CUSTOMER_ORDERS_VIEW','CUSTOMER_DOCUMENT_DOWNLOAD','CUSTOMER_DOCUMENT_UPLOAD','CUSTOMER_PAYMENT_RECEIPT_UPLOAD','CUSTOMER_FINANCING_REQUEST','CUSTOMER_NOTIFICATIONS_VIEW']::text[]);
  elsif r='TRANSPORT' then
    return requested_permission=any(array['TRANSPORT_ASSIGNED_VIEW','TRANSPORT_STATUS_UPDATE','TRANSPORT_NOTIFICATIONS_VIEW']::text[]);
  elsif r='FINANCE' then
    return requested_permission=any(array['FINANCE_REQUEST_VIEW','FINANCE_DECIDE','FINANCE_NOTIFICATIONS_VIEW']::text[]);
  end if;
  return false;
end;
$$;

create or replace function private.owns_order(p_order_id text)
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.orders o where o.id=p_order_id and lower(o.customer_email)=private.current_email()); $$;

create or replace function private.owns_quote(p_quote_id text)
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.quote_requests q where q.id=p_quote_id and lower(coalesce(q.requester_email,''))=private.current_email()); $$;

create or replace function private.is_assigned_transport_order(p_order_id text)
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.shipments s where s.order_id=p_order_id and lower(coalesce(s.transport_employee_email,''))=private.current_email()); $$;

create or replace function private.is_assigned_transport_shipment(p_shipment_id text)
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.shipments s where s.id=p_shipment_id and lower(coalesce(s.transport_employee_email,''))=private.current_email()); $$;

create or replace function private.finance_has_order(p_order_id text)
returns boolean language sql stable security definer set search_path=''
as $$ select private.current_role()='FINANCE' and exists(select 1 from public.financing_requests f where f.order_id=p_order_id); $$;

create or replace function private.can_read_order(p_order_id text)
returns boolean language sql stable security definer set search_path=''
as $$
  select private.current_role()='ADMIN'
    or private.has_permission('ORDERS_MANAGE')
    or private.has_permission('FINANCING_VIEW')
    or (private.current_role()='CUSTOMER' and private.owns_order(p_order_id))
    or (private.current_role()='TRANSPORT' and private.is_assigned_transport_order(p_order_id))
    or private.finance_has_order(p_order_id);
$$;

create or replace function private.can_read_vehicle(p_vehicle_id text)
returns boolean language sql stable security definer set search_path=''
as $$
  select exists(select 1 from public.vehicles v where v.id=p_vehicle_id and v.is_published=true)
    or private.current_role()='ADMIN'
    or private.has_permission('CATALOG_MANAGE')
    or private.has_permission('ORDERS_MANAGE')
    or private.has_permission('FINANCING_VIEW')
    or exists(select 1 from public.orders o where o.vehicle_id=p_vehicle_id and private.can_read_order(o.id));
$$;

create or replace function private.can_read_shipment(p_shipment_id text)
returns boolean language sql stable security definer set search_path=''
as $$
  select exists(select 1 from public.shipments s where s.id=p_shipment_id and (
    private.current_role()='ADMIN'
    or private.has_permission('ORDERS_MANAGE')
    or (private.current_role()='CUSTOMER' and private.owns_order(s.order_id))
    or (private.current_role()='TRANSPORT' and lower(coalesce(s.transport_employee_email,''))=private.current_email())
  ));
$$;

revoke all on function private.current_email() from public;
revoke all on function private.current_role() from public;
revoke all on function private.has_permission(text) from public;
revoke all on function private.owns_order(text) from public;
revoke all on function private.owns_quote(text) from public;
revoke all on function private.is_assigned_transport_order(text) from public;
revoke all on function private.is_assigned_transport_shipment(text) from public;
revoke all on function private.finance_has_order(text) from public;
revoke all on function private.can_read_order(text) from public;
revoke all on function private.can_read_vehicle(text) from public;
revoke all on function private.can_read_shipment(text) from public;
grant execute on function private.current_email(),private.current_role(),private.has_permission(text),private.owns_order(text),private.owns_quote(text),private.is_assigned_transport_order(text),private.is_assigned_transport_shipment(text),private.finance_has_order(text),private.can_read_order(text),private.can_read_vehicle(text),private.can_read_shipment(text) to authenticated;

create index if not exists idx_orders_customer_email_lower on public.orders(lower(customer_email));
create index if not exists idx_quote_requests_requester_email_lower on public.quote_requests(lower(requester_email));
create index if not exists idx_shipments_transport_email_lower on public.shipments(lower(transport_employee_email));
create index if not exists idx_financing_customer_email_lower on public.financing_requests(lower(customer_email));
create index if not exists idx_notifications_recipient_email_lower on public.notifications(lower(recipient_email));
create index if not exists idx_documents_order_id on public.documents(order_id);
create index if not exists idx_payments_order_id on public.payments(order_id);
create index if not exists idx_shipment_events_shipment_id on public.shipment_events(shipment_id);

create policy "vehicles_public_read" on public.vehicles for select to anon using(is_published=true);
create policy "vehicles_authenticated_read" on public.vehicles for select to authenticated using((select private.can_read_vehicle(id)));
create policy "vehicles_manager_write" on public.vehicles for all to authenticated using((select private.current_role()='ADMIN') or (select private.has_permission('CATALOG_MANAGE'))) with check((select private.current_role()='ADMIN') or (select private.has_permission('CATALOG_MANAGE')));
create policy "expos_public_read" on public.expos for select to anon using(is_published=true);
create policy "expos_authenticated_read" on public.expos for select to authenticated using(is_published=true or (select private.current_role()='ADMIN') or (select private.has_permission('EXPOS_MANAGE')));
create policy "expos_manager_write" on public.expos for all to authenticated using((select private.current_role()='ADMIN') or (select private.has_permission('EXPOS_MANAGE'))) with check((select private.current_role()='ADMIN') or (select private.has_permission('EXPOS_MANAGE')));
create policy "quotes_read" on public.quote_requests for select to authenticated using((select private.current_role()='ADMIN') or (select private.has_permission('QUOTES_MANAGE')) or ((select private.current_role()='CUSTOMER') and lower(coalesce(requester_email,''))=(select private.current_email())));
create policy "quotes_manager_write" on public.quote_requests for all to authenticated using((select private.current_role()='ADMIN') or (select private.has_permission('QUOTES_MANAGE'))) with check((select private.current_role()='ADMIN') or (select private.has_permission('QUOTES_MANAGE')));
create policy "quote_estimates_read" on public.quote_estimates for select to authenticated using((select private.current_role()='ADMIN') or (select private.has_permission('QUOTES_MANAGE')) or ((select private.current_role()='CUSTOMER') and (select private.owns_quote(quote_request_id))));
create policy "quote_estimates_manager_write" on public.quote_estimates for all to authenticated using((select private.current_role()='ADMIN') or (select private.has_permission('QUOTES_MANAGE'))) with check((select private.current_role()='ADMIN') or (select private.has_permission('QUOTES_MANAGE')));
create policy "orders_read" on public.orders for select to authenticated using((select private.can_read_order(id)));
create policy "orders_manager_write" on public.orders for all to authenticated using((select private.current_role()='ADMIN') or (select private.has_permission('ORDERS_MANAGE'))) with check((select private.current_role()='ADMIN') or (select private.has_permission('ORDERS_MANAGE')));
create policy "payments_read" on public.payments for select to authenticated using((select private.can_read_order(order_id)));
create policy "payments_manager_write" on public.payments for all to authenticated using((select private.current_role()='ADMIN') or (select private.has_permission('ORDERS_MANAGE'))) with check((select private.current_role()='ADMIN') or (select private.has_permission('ORDERS_MANAGE')));
create policy "shipments_read" on public.shipments for select to authenticated using((select private.can_read_shipment(id)));
create policy "shipments_manager_write" on public.shipments for all to authenticated using((select private.current_role()='ADMIN') or (select private.has_permission('ORDERS_MANAGE'))) with check((select private.current_role()='ADMIN') or (select private.has_permission('ORDERS_MANAGE')));
create policy "shipments_transport_update" on public.shipments for update to authenticated using((select private.current_role()='TRANSPORT') and (select private.has_permission('TRANSPORT_STATUS_UPDATE')) and lower(coalesce(transport_employee_email,''))=(select private.current_email())) with check((select private.current_role()='TRANSPORT') and lower(coalesce(transport_employee_email,''))=(select private.current_email()));
create policy "shipment_events_read" on public.shipment_events for select to authenticated using((select private.can_read_shipment(shipment_id)));
create policy "shipment_events_manager_write" on public.shipment_events for all to authenticated using((select private.current_role()='ADMIN') or (select private.has_permission('ORDERS_MANAGE'))) with check((select private.current_role()='ADMIN') or (select private.has_permission('ORDERS_MANAGE')));
create policy "shipment_events_transport_insert" on public.shipment_events for insert to authenticated with check((select private.current_role()='TRANSPORT') and (select private.has_permission('TRANSPORT_STATUS_UPDATE')) and (select private.is_assigned_transport_shipment(shipment_id)));
create policy "documents_read" on public.documents for select to authenticated using((select private.current_role()='ADMIN') or (select private.has_permission('ORDERS_MANAGE')) or ((select private.current_role()='CUSTOMER') and (select private.owns_order(order_id))) or ((select private.current_role()='TRANSPORT') and (select private.is_assigned_transport_order(order_id))));
create policy "documents_manager_write" on public.documents for all to authenticated using((select private.current_role()='ADMIN') or (select private.has_permission('ORDERS_MANAGE'))) with check((select private.current_role()='ADMIN') or (select private.has_permission('ORDERS_MANAGE')));
create policy "financing_read" on public.financing_requests for select to authenticated using((select private.current_role()='ADMIN') or (select private.has_permission('FINANCING_VIEW')) or ((select private.current_role()='FINANCE') and (select private.has_permission('FINANCE_REQUEST_VIEW'))) or ((select private.current_role()='CUSTOMER') and lower(customer_email)=(select private.current_email())));
create policy "financing_finance_update" on public.financing_requests for update to authenticated using((select private.current_role()='FINANCE') and (select private.has_permission('FINANCE_DECIDE'))) with check((select private.current_role()='FINANCE'));
create policy "financing_admin_write" on public.financing_requests for all to authenticated using((select private.current_role()='ADMIN')) with check((select private.current_role()='ADMIN'));
create policy "notifications_read" on public.notifications for select to authenticated using((select private.current_role()='ADMIN') or ((select private.current_role()='MANAGER') and (select private.has_permission('NOTIFICATIONS_MANAGE')) and recipient_type='ADMIN') or ((select private.current_role()='CUSTOMER') and recipient_type='CUSTOMER' and lower(coalesce(recipient_email,''))=(select private.current_email())) or ((select private.current_role()='TRANSPORT') and recipient_type='TRANSPORT' and (recipient_email is null or lower(recipient_email)=(select private.current_email()))) or ((select private.current_role()='FINANCE') and recipient_type='FINANCE'));
create policy "notifications_admin_manager_write" on public.notifications for all to authenticated using((select private.current_role()='ADMIN') or (select private.has_permission('NOTIFICATIONS_MANAGE'))) with check((select private.current_role()='ADMIN') or (select private.has_permission('NOTIFICATIONS_MANAGE')));
create policy "profiles_read" on public.user_profiles for select to authenticated using((select private.current_role()='ADMIN') or lower(email)=(select private.current_email()));
create policy "profiles_admin_write" on public.user_profiles for all to authenticated using((select private.current_role()='ADMIN')) with check((select private.current_role()='ADMIN'));
create policy "settings_public_read" on public.system_settings for select to anon using(true);
create policy "settings_authenticated_read" on public.system_settings for select to authenticated using(true);
create policy "settings_admin_write" on public.system_settings for all to authenticated using((select private.current_role()='ADMIN') or (select private.has_permission('SETTINGS_MANAGE'))) with check((select private.current_role()='ADMIN') or (select private.has_permission('SETTINGS_MANAGE')));

alter table public.documents enable row level security;
alter table public.expos enable row level security;
alter table public.financing_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.quote_requests enable row level security;
alter table public.vehicles enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.quote_estimates enable row level security;
alter table public.shipment_events enable row level security;
alter table public.shipments enable row level security;
alter table public.system_settings enable row level security;
alter table public.user_profiles enable row level security;

-- Replace broad authenticated Storage access with role-aware policies.
drop policy if exists "auto_bridge_authenticated_files_read" on storage.objects;
drop policy if exists "auto_bridge_authenticated_files_insert" on storage.objects;
drop policy if exists "auto_bridge_authenticated_files_update" on storage.objects;
drop policy if exists "auto_bridge_authenticated_files_delete" on storage.objects;

create policy "auto_bridge_role_files_read" on storage.objects for select to authenticated using(bucket_id='auto-bridge-files' and (name like 'vehicle-images/%' or name like 'expo-images/%' or (name like 'documents/%' and ((select private.current_role()='ADMIN') or (select private.has_permission('ORDERS_MANAGE')) or ((select private.current_role()='CUSTOMER') and (select private.owns_order((storage.foldername(name))[2]))) or ((select private.current_role()='TRANSPORT') and (select private.is_assigned_transport_order((storage.foldername(name))[2])))))));
create policy "auto_bridge_role_files_insert" on storage.objects for insert to authenticated with check(bucket_id='auto-bridge-files' and ((name like 'vehicle-images/%' and ((select private.current_role()='ADMIN') or (select private.has_permission('CATALOG_MANAGE')))) or (name like 'expo-images/%' and ((select private.current_role()='ADMIN') or (select private.has_permission('EXPOS_MANAGE')))) or (name like 'documents/%' and lower(storage.extension(name))=any(array['pdf','jpg','jpeg','png','doc','docx']::text[]) and ((select private.current_role()='ADMIN') or (select private.has_permission('ORDERS_MANAGE')) or ((select private.current_role()='CUSTOMER') and ((select private.has_permission('CUSTOMER_DOCUMENT_UPLOAD')) or (select private.has_permission('CUSTOMER_PAYMENT_RECEIPT_UPLOAD'))) and (select private.owns_order((storage.foldername(name))[2]))) or ((select private.current_role()='TRANSPORT') and (select private.has_permission('TRANSPORT_STATUS_UPDATE')) and (select private.is_assigned_transport_order((storage.foldername(name))[2])))))));
create policy "auto_bridge_role_files_update" on storage.objects for update to authenticated using(bucket_id='auto-bridge-files' and ((name like 'vehicle-images/%' and ((select private.current_role()='ADMIN') or (select private.has_permission('CATALOG_MANAGE')))) or (name like 'expo-images/%' and ((select private.current_role()='ADMIN') or (select private.has_permission('EXPOS_MANAGE')))) or (name like 'documents/%' and ((select private.current_role()='ADMIN') or (select private.has_permission('ORDERS_MANAGE')))))) with check(bucket_id='auto-bridge-files');
create policy "auto_bridge_role_files_delete" on storage.objects for delete to authenticated using(bucket_id='auto-bridge-files' and ((name like 'vehicle-images/%' and ((select private.current_role()='ADMIN') or (select private.has_permission('CATALOG_MANAGE')))) or (name like 'expo-images/%' and ((select private.current_role()='ADMIN') or (select private.has_permission('EXPOS_MANAGE')))) or (name like 'documents/%' and ((select private.current_role()='ADMIN') or (select private.has_permission('ORDERS_MANAGE')) or ((select private.current_role()='CUSTOMER') and (select private.owns_order((storage.foldername(name))[2]))) or ((select private.current_role()='TRANSPORT') and (select private.is_assigned_transport_order((storage.foldername(name))[2])))))));
