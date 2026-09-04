-- Keep payment details limited to Admin, order managers and the owning customer.
drop policy if exists "payments_read" on public.payments;
create policy "payments_read"
on public.payments
for select
to authenticated
using (
  (select private.current_role()='ADMIN')
  or (select private.has_permission('ORDERS_MANAGE'))
  or (
    (select private.current_role()='CUSTOMER')
    and (select private.owns_order(order_id))
  )
);
