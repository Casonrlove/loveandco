alter table public.orders
  add column if not exists address_line2 text;

alter table public.profiles
  add column if not exists address_line2 text;
