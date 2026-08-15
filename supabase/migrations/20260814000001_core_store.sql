create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  phone text,
  venmo_username text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  detail text not null default '',
  category text not null check (category in ('trucker-hats', 'home-gift', 'baby', 'baby-bundles')),
  item_price numeric(10, 2) not null default 0,
  embroidery_price numeric(10, 2) not null default 0,
  design_minutes integer not null default 0,
  stitch_minutes integer not null default 30,
  image_path text not null default '/images/Logo.png',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.studio_settings (
  id integer primary key default 1 check (id = 1),
  work_days integer[] not null default '{1,3,5}',
  minutes_per_session integer not null default 180,
  days_off date[] not null default '{}',
  updated_at timestamptz not null default now()
);

insert into public.studio_settings (id) values (1);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  email text not null,
  name text not null,
  phone text,
  venmo_username text,
  customer_notes text,
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'requested', 'paid', 'refunded')),
  fulfillment_status text not null default 'pending_review' check (fulfillment_status in ('pending_review', 'queued', 'started', 'shipped', 'complete', 'cancelled')),
  tracking_number text,
  priority text not null default 'standard' check (priority in ('standard', 'rush')),
  promised_on date,
  subtotal numeric(10, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  name text not null,
  item_price numeric(10, 2),
  embroidery_price numeric(10, 2),
  design_minutes integer not null default 0,
  stitch_minutes integer not null default 0,
  quantity integer not null default 1,
  personalization text,
  is_custom boolean not null default false,
  custom_details jsonb,
  created_at timestamptz not null default now()
);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  message text not null,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
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
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        updated_at = now();
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert or update of raw_user_meta_data on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.studio_settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.contact_messages enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

create policy products_select_active on public.products
  for select to anon, authenticated
  using (active = true);

create policy settings_select_public on public.studio_settings
  for select to anon, authenticated
  using (true);

create policy orders_select_own on public.orders
  for select to authenticated
  using (user_id = auth.uid() or lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

create policy order_items_select_own on public.order_items
  for select to authenticated
  using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
        and (orders.user_id = auth.uid() or lower(orders.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
    )
  );
