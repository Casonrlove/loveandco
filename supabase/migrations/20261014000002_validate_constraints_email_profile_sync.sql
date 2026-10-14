-- VALIDATE scans existing rows and aborts the migration if any violate; fix data first if it fails.
alter table public.order_items validate constraint order_items_quantity_positive;
alter table public.order_items validate constraint order_items_costs_nonnegative;
alter table public.orders validate constraint orders_subtotal_nonnegative;
alter table public.products validate constraint products_costs_nonnegative;

-- Claiming guest orders matches on lower(trim(email)); enforce it at the table, not in every writer.
alter table public.orders add constraint orders_email_normalized check (email = lower(trim(email))) not valid;

-- Sync auth email changes into profiles and keep a customer-edited full_name.
-- SET search_path must be restated: CREATE OR REPLACE resets function config.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
        updated_at = now();
  return new;
end;
$$;

-- create or replace needs only TRIGGER on auth.users (as the original did); DROP would need ownership.
create or replace trigger on_auth_user_created
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute function public.handle_new_user();
