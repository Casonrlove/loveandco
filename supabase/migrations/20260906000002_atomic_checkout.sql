begin;

-- Invoker privileges apply. Only the trusted server can call this function.
create or replace function public.create_order_with_items(order_row jsonb, item_rows jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if jsonb_typeof(item_rows) <> 'array' or jsonb_array_length(item_rows) = 0 then
    raise exception 'An order must contain items';
  end if;
  insert into public.orders
    select * from jsonb_populate_record(null::public.orders, order_row);
  insert into public.order_items
    select item.*
    from jsonb_array_elements(item_rows) as source(value)
    cross join lateral jsonb_populate_record(null::public.order_items,
      source.value || jsonb_build_object('order_id', order_row ->> 'id', 'created_at', now())) as item;
end;
$$;
revoke execute on function public.create_order_with_items(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_order_with_items(jsonb, jsonb) to service_role;

-- NOT VALID preserves historical rows; new writes must satisfy the constraints.
alter table public.order_items add constraint order_items_quantity_positive check (quantity between 1 and 500) not valid;
alter table public.order_items add constraint order_items_costs_nonnegative check (
  (item_price is null or item_price >= 0) and (embroidery_price is null or embroidery_price >= 0)
  and design_minutes >= 0 and stitch_minutes >= 0
) not valid;
alter table public.orders add constraint orders_subtotal_nonnegative check (subtotal >= 0) not valid;
alter table public.products add constraint products_costs_nonnegative check (
  item_price >= 0 and embroidery_price >= 0 and design_minutes >= 0 and stitch_minutes >= 0
) not valid;


create index if not exists orders_active_production_idx on public.orders(created_at, id)
  where payment_status = 'paid' and fulfillment_status not in ('complete', 'cancelled', 'shipped');

commit;
