-- Read-only verification for the restored Love & Co. project.
-- Run in Supabase SQL Editor. This returns schema metadata, not credentials or customer rows.

select schemaname, tablename, rowsecurity
from pg_tables
where schemaname in ('public', 'storage')
order by schemaname, tablename;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;

-- Every value below should be FALSE after the hardening migration.
select role_name,
  has_column_privilege(role_name, 'public.studio_settings', 'instagram_access_token', 'SELECT') as can_read_instagram_token,
  has_column_privilege(role_name, 'public.profiles', 'role', 'UPDATE') as can_change_profile_role,
  has_column_privilege(role_name, 'public.profiles', 'email', 'UPDATE') as can_change_profile_email,
  has_table_privilege(role_name, 'public.orders', 'INSERT') as can_insert_orders_directly,
  has_table_privilege(role_name, 'public.contact_messages', 'SELECT') as can_read_contact_messages,
  has_function_privilege(role_name, 'public.create_order_with_items(jsonb,jsonb)', 'EXECUTE') as can_call_checkout_rpc
from unnest(array['anon', 'authenticated']) as role_name;

select n.nspname as schema_name, p.proname, p.prosecdef as security_definer, p.proconfig,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname;

select id, name, public, file_size_limit, allowed_mime_types from storage.buckets order by name;

select indexname, indexdef from pg_indexes where schemaname = 'public' order by tablename, indexname;


-- Studio expansion: every exposed customer/anonymous capability should be false.
select role_name,
  has_table_privilege(role_name, 'public.studio_order_notes', 'SELECT') as can_read_staff_notes,
  has_table_privilege(role_name, 'public.studio_order_notes', 'INSERT') as can_insert_staff_notes,
  has_function_privilege(role_name, 'public.studio_update_order(uuid,jsonb)', 'EXECUTE') as can_edit_studio_orders
from (values ('anon'), ('authenticated')) as roles(role_name);

-- Full operations: all should be false for anonymous/customer roles.
select role_name, table_name, has_table_privilege(role_name,'public.'||table_name,'SELECT') as can_read
from (values('anon'),('authenticated')) roles(role_name)
cross join (values('checkout_requests'),('request_limits'),('order_activity'),('order_proofs'),('studio_inventory'),('inventory_movements')) tables(table_name);
select role_name, signature, has_function_privilege(role_name,'public.'||signature,'EXECUTE') as can_execute
from (values('anon'),('authenticated')) roles(role_name)
cross join (values('create_checkout_once(jsonb,jsonb,uuid,text)'),('consume_request_limit(text,integer,integer)'),('studio_edit_order(uuid,jsonb,text)'),('publish_order_proof(uuid,uuid,text,text,text)'),('respond_order_proof(uuid,text,text,text)'),('adjust_inventory(uuid,integer,text,text)')) functions(signature);
