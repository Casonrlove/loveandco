begin;
alter table public.products add column photo_paths text[] not null default '{}';
alter table public.orders add column delivery_method text not null default 'shipping' check (delivery_method in ('shipping','pickup'));
alter table public.orders add column carrier text not null default '' check (carrier in ('','usps','ups','fedex','dhl'));
alter table public.orders add column pickup_instructions text not null default '';
alter table public.studio_settings add column shop_info jsonb not null default '{}';

create table public.checkout_requests (
  request_key uuid primary key, fingerprint text not null,
  order_id uuid not null references public.orders(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table public.request_limits (key text primary key, hits integer not null, expires_at timestamptz not null);
create index request_limits_expiry on public.request_limits(expires_at);
create table public.order_activity (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  actor text not null, action text not null, details jsonb not null default '{}', created_at timestamptz not null default now()
);
create index order_activity_order_date on public.order_activity(order_id, created_at desc);
create table public.order_proofs (
  id uuid primary key, order_id uuid not null references public.orders(id) on delete cascade,
  token_hash text not null, proof_text text not null check (length(proof_text) between 1 and 15000),
  status text not null default 'pending' check (status in ('pending','approved','changes_requested','superseded')),
  response text not null default '' check (length(response) <= 3000), created_at timestamptz not null default now(), responded_at timestamptz
);
create index order_proofs_order_date on public.order_proofs(order_id, created_at desc);
create table public.studio_inventory (
  id uuid primary key default gen_random_uuid(), name text not null, size text not null default '', color text not null default '',
  quantity integer not null default 0 check (quantity >= 0), low_at integer not null default 5 check (low_at >= 0),
  updated_at timestamptz not null default now()
);
create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(), inventory_id uuid not null references public.studio_inventory(id),
  change integer not null, reason text not null, actor text not null, created_at timestamptz not null default now()
);
create index inventory_movements_item_date on public.inventory_movements(inventory_id, created_at desc);

do $$ declare t text; begin
  foreach t in array array['checkout_requests','request_limits','order_activity','order_proofs','studio_inventory','inventory_movements'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public, anon, authenticated',t);
    execute format('grant select, insert, update, delete on public.%I to service_role',t);
  end loop;
end $$;

create function public.consume_request_limit(limit_key text, max_hits integer, window_seconds integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare count_now integer;
begin
  delete from public.request_limits where expires_at < now();
  insert into public.request_limits(key,hits,expires_at) values(limit_key,1,now()+make_interval(secs=>window_seconds))
  on conflict(key) do update set hits = least(public.request_limits.hits+1,max_hits+1)
  returning hits into count_now;
  return count_now <= max_hits;
end $$;

create function public.create_checkout_once(order_row jsonb, item_rows jsonb, request_key uuid, fingerprint text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare previous public.checkout_requests;
begin
  perform pg_advisory_xact_lock(hashtextextended(request_key::text,0));
  select * into previous from public.checkout_requests where checkout_requests.request_key = create_checkout_once.request_key;
  if found then
    if previous.fingerprint <> fingerprint then raise exception 'Idempotency key does not match this checkout' using errcode = 'P0001'; end if;
    return jsonb_build_object('id',previous.order_id,'created',false);
  end if;
  perform public.create_order_with_items(order_row,item_rows);
  insert into public.checkout_requests(request_key,fingerprint,order_id) values(request_key,fingerprint,(order_row->>'id')::uuid);
  insert into public.order_activity(order_id,actor,action) values((order_row->>'id')::uuid,'Customer','Order placed');
  return jsonb_build_object('id',order_row->>'id','created',true);
end $$;

create function public.studio_edit_order(target_id uuid, patch jsonb, actor_name text)
returns void language plpgsql security invoker set search_path = '' as $$
declare previous public.orders; next_state text; proof_state text; item jsonb; changed_keys jsonb;
begin
  select * into previous from public.orders where id = target_id for update;
  if not found then raise exception 'Order not found'; end if;
  if patch ? 'items' then
    for item in select value from jsonb_array_elements(patch->'items') loop
      if exists(select 1 from public.order_items where id=(item->>'id')::uuid and order_id=target_id and quantity<>(item->>'quantity')::integer) then
        update public.order_proofs set status='superseded' where order_id=target_id and status<>'superseded';
      end if;
    end loop;
  end if;
  next_state := coalesce(patch->>'fulfillment_status', previous.fulfillment_status);
  select status into proof_state from public.order_proofs where order_id=target_id order by created_at desc,id desc limit 1;
  if next_state in ('started','shipped','complete') and proof_state is not null and proof_state <> 'approved' then
    raise exception 'Customer proof approval is required before production' using errcode='P0001';
  end if;
  perform public.studio_update_order(target_id,patch);
  update public.orders set delivery_method=coalesce(patch->>'delivery_method',delivery_method),
    carrier=coalesce(patch->>'carrier',carrier), pickup_instructions=coalesce(patch->>'pickup_instructions',pickup_instructions)
    where id=target_id;
  select coalesce(jsonb_agg(k),'[]') into changed_keys from jsonb_object_keys(patch) k;
  insert into public.order_activity(order_id,actor,action,details) values(target_id,actor_name,'Order updated',
    jsonb_build_object('fields',changed_keys,'payment_before',previous.payment_status,'payment_after',coalesce(patch->>'payment_status',previous.payment_status),
      'status_before',previous.fulfillment_status,'status_after',next_state,'total_before',previous.subtotal,'total_after',coalesce((patch->>'subtotal')::numeric,previous.subtotal)));
end $$;

create function public.publish_order_proof(target_id uuid, proof_id uuid, secret_hash text, content text, actor_name text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform 1 from public.orders where id=target_id for update;
  if not found then raise exception 'Order not found'; end if;
  if exists(select 1 from public.orders where id=target_id and fulfillment_status in ('started','shipped','complete','cancelled')) then raise exception 'Reopen the order before issuing a new proof'; end if;
  update public.order_proofs set status='superseded' where order_id=target_id and status<>'superseded';
  insert into public.order_proofs(id,order_id,token_hash,proof_text) values(proof_id,target_id,secret_hash,content);
  insert into public.order_activity(order_id,actor,action) values(target_id,actor_name,'Proof created');
end $$;
create function public.respond_order_proof(proof_id uuid, secret_hash text, decision text, customer_response text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare parent_id uuid; matched uuid;
begin
  if decision not in ('approved','changes_requested') then raise exception 'Invalid decision'; end if;
  select order_id into parent_id from public.order_proofs where id=proof_id and token_hash=secret_hash;
  if parent_id is null then return false; end if;
  perform 1 from public.orders where id=parent_id for update;
  update public.order_proofs set status=decision,response=customer_response,responded_at=now()
    where id=proof_id and token_hash=secret_hash and status='pending' returning order_id into matched;
  if matched is null then return false; end if;
  insert into public.order_activity(order_id,actor,action) values(matched,'Customer proof link',case when decision='approved' then 'Proof approved' else 'Proof changes requested' end);
  return true;
end $$;
create function public.adjust_inventory(target_id uuid, delta integer, reason_text text, actor_name text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  update public.studio_inventory set quantity=quantity+delta,updated_at=now() where id=target_id;
  if not found then raise exception 'Supply not found'; end if;
  insert into public.inventory_movements(inventory_id,change,reason,actor) values(target_id,delta,reason_text,actor_name);
end $$;

do $$ declare signature text; begin
 foreach signature in array array['consume_request_limit(text,integer,integer)','create_checkout_once(jsonb,jsonb,uuid,text)','studio_edit_order(uuid,jsonb,text)','publish_order_proof(uuid,uuid,text,text,text)','respond_order_proof(uuid,text,text,text)','adjust_inventory(uuid,integer,text,text)'] loop
   execute 'revoke execute on function public.'||signature||' from public,anon,authenticated';
   execute 'grant execute on function public.'||signature||' to service_role';
 end loop;
end $$;
commit;
