begin;

-- Staff notes are separate from customer-readable order rows.
create table public.studio_order_notes (
  order_id uuid primary key references public.orders(id) on delete cascade,
  notes text not null default '' check (length(notes) <= 10000),
  updated_at timestamptz not null default now()
);
alter table public.studio_order_notes enable row level security;
revoke all on public.studio_order_notes from public, anon, authenticated;
grant select, insert, update, delete on public.studio_order_notes to service_role;

alter table public.contact_messages add column status text not null default 'new'
  check (status in ('new', 'in_progress', 'resolved'));
create index contact_messages_status_created_idx on public.contact_messages(status, created_at desc);
alter table public.studio_settings add column orders_open boolean not null default true;
alter table public.studio_settings add column announcement text not null default '' check (length(announcement) <= 300);
alter table public.studio_settings add column paused_message text not null default 'We are catching up on our stitching. Please check back soon.' check (length(paused_message) <= 500);

create function public.studio_update_order(target_id uuid, patch jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare current_order public.orders; next_order public.orders; item jsonb;
begin
  select * into current_order from public.orders where id = target_id for update;
  if not found then raise exception 'Order not found'; end if;
  select * into next_order from jsonb_populate_record(current_order, patch);
  update public.orders set
    name = next_order.name, phone = next_order.phone, venmo_username = next_order.venmo_username,
    address_line = next_order.address_line, address_line2 = next_order.address_line2,
    city = next_order.city, region = next_order.region, postal_code = next_order.postal_code,
    customer_notes = next_order.customer_notes, payment_status = next_order.payment_status,
    fulfillment_status = next_order.fulfillment_status, tracking_number = next_order.tracking_number,
    priority = next_order.priority, subtotal = next_order.subtotal, updated_at = now()
  where id = target_id;
  if patch ? 'items' then
    for item in select value from jsonb_array_elements(patch->'items') loop
      update public.order_items set
        design_minutes = (item->>'design_minutes')::integer,
        stitch_minutes = (item->>'stitch_minutes')::integer,
        quantity = (item->>'quantity')::integer,
        item_price = (item->>'item_price')::numeric,
        embroidery_price = (item->>'embroidery_price')::numeric
      where id = (item->>'id')::uuid and order_id = target_id;
      if not found then raise exception 'Item does not belong to order'; end if;
    end loop;
  end if;
  if patch ? 'staff_notes' then
    insert into public.studio_order_notes(order_id, notes) values (target_id, patch->>'staff_notes')
    on conflict (order_id) do update set notes = excluded.notes, updated_at = now();
  end if;
end;
$$;
revoke execute on function public.studio_update_order(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.studio_update_order(uuid,jsonb) to service_role;
commit;
