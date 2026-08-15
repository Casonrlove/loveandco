alter table public.profiles
  add column if not exists address_line text,
  add column if not exists city text,
  add column if not exists region text,
  add column if not exists postal_code text;
