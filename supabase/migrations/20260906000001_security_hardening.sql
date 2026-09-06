begin;

-- Settings contain a third-party credential. Only the server may read them.
drop policy if exists settings_select_public on public.studio_settings;
revoke all on public.studio_settings from public, anon, authenticated;
grant select, insert, update, delete on public.studio_settings to service_role;

-- Ownership policies cannot safely protect individual mutable columns.
drop policy if exists profiles_update_own on public.profiles;
revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, phone, venmo_username, address_line, address_line2, city, region, postal_code, updated_at)
  on public.profiles to authenticated;
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Guest orders are claimed on the server after verifying the auth email.
drop policy if exists orders_select_own on public.orders;
drop policy if exists order_items_select_own on public.order_items;
create policy orders_select_own on public.orders for select to authenticated
  using (user_id = (select auth.uid()));
create policy order_items_select_own on public.order_items for select to authenticated
  using (exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = (select auth.uid())));
revoke all on public.orders, public.order_items, public.contact_messages from public, anon, authenticated;
grant select on public.orders, public.order_items to authenticated;
grant select, insert, update, delete on public.profiles, public.products, public.orders, public.order_items, public.contact_messages to service_role;
revoke all on public.products from public, anon, authenticated;
grant select on public.products to anon, authenticated;
alter function public.handle_new_user() set search_path = '';
revoke execute on function public.handle_new_user() from public, anon, authenticated;

update public.orders set email = lower(trim(email)) where email <> lower(trim(email));
create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_unclaimed_email_idx on public.orders(email) where user_id is null;
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists order_items_product_id_idx on public.order_items(product_id);

commit;
