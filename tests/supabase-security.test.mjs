import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

// Real PostgreSQL semantics in memory; auth helpers emulate Supabase JWT claims.
// Live Auth, PostgREST, Storage and dashboard settings require separate verification.
test('Supabase migrations enforce ownership, column permissions, and atomic checkout', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  `);
  const directory = new URL('../supabase/migrations/', import.meta.url);
  for (const file of (await readdir(directory)).filter((name) => name.endsWith('.sql')).sort()) {
    await db.exec(await readFile(new URL(file, directory), 'utf8'));
  }
  const alice = '00000000-0000-4000-8000-000000000001';
  const bob = '00000000-0000-4000-8000-000000000002';
  const order = '00000000-0000-4000-8000-000000000003';
  await db.exec(`
    insert into auth.users (id,email) values ('${alice}','alice@example.test'),('${bob}','bob@example.test');
    insert into public.orders (id,user_id,email,name) values ('${order}','${alice}','bob@example.test','Alice');
    insert into public.order_items (order_id,name) values ('${order}','A keepsake');
    insert into public.products (slug,name,category,active) values ('visible','Visible','baby',true),('hidden','Hidden','baby',false);
  `);
  const asRole = async (role, user, fn) => {
    await db.exec(`set role ${role}; set request.jwt.claim.sub = '${user || ''}';`);
    try { await fn(); } finally { await db.exec('reset role'); }
  };
  await t.test('anonymous callers cannot read tokens, profiles, orders, contacts, or invoke checkout', () => asRole('anon', '', async () => {
    for (const table of ['studio_settings', 'profiles', 'orders', 'order_items', 'contact_messages']) {
      await assert.rejects(db.query(`select * from public.${table}`), { code: '42501' });
    }
    await assert.rejects(db.query(`select public.create_order_with_items('{}','[]')`), { code: '42501' });
    assert.equal((await db.query('select * from public.products')).rows.length, 1);
  }));
  await t.test('customers can edit their contact details but cannot change role or email', () => asRole('authenticated', alice, async () => {
    await db.query("update public.profiles set full_name = 'Updated'");
    assert.equal((await db.query('select full_name from public.profiles')).rows[0].full_name, 'Updated');
    for (const statement of ["update public.profiles set role = 'admin'", "update public.profiles set email = 'owner@example.test'", 'select instagram_access_token from public.studio_settings']) {
      await assert.rejects(db.query(statement), { code: '42501' });
    }
    assert.equal((await db.query('select * from public.orders')).rows.length, 1);
    assert.equal((await db.query('select * from public.order_items')).rows.length, 1);
  }));
  await t.test('another customer cannot access an order by its email address', () => asRole('authenticated', bob, async () => {
    await db.exec(`set request.jwt.claims = '{"email":"bob@example.test"}';`);
    assert.equal((await db.query('select * from public.orders')).rows.length, 0);
    assert.equal((await db.query('select * from public.order_items')).rows.length, 0);
    assert.equal((await db.query(`update public.profiles set full_name = 'Attack' where id = '${alice}' returning id`)).rows.length, 0);
    await assert.rejects(db.query(`insert into public.orders(email,name) values ('x@y.test','Attack')`), { code: '42501' });
  }));
  await t.test('failed item insert rolls back the order; service role can save a valid order', () => asRole('service_role', '', async () => {
    const row = (await db.query('select * from public.orders where id = $1', [order])).rows[0];
    const nextId = '00000000-0000-4000-8000-000000000004';
    row.id = nextId;
    const item = { id: '00000000-0000-4000-8000-000000000005', name: 'Test', quantity: 1, is_custom: true, design_minutes: 0, stitch_minutes: 0 };
    await assert.rejects(db.query('select public.create_order_with_items($1,$2)', [JSON.stringify(row), JSON.stringify([{ ...item, quantity: -1 }])]), { code: '23514' });
    assert.equal((await db.query('select * from public.orders where id = $1', [nextId])).rows.length, 0);
    await db.query('select public.create_order_with_items($1,$2)', [JSON.stringify(row), JSON.stringify([item])]);
    assert.equal((await db.query('select * from public.order_items where order_id = $1', [nextId])).rows.length, 1);
  }));
  await t.test('Studio notes and mutations stay private; failed edits roll back the whole order', async () => {
    await asRole('service_role', '', async () => {
      await db.query('select public.studio_update_order($1,$2)', [order, JSON.stringify({ name: 'Studio edit', staff_notes: 'Private production note' })]);
      assert.equal((await db.query('select notes from public.studio_order_notes where order_id = $1', [order])).rows[0].notes, 'Private production note');
      await assert.rejects(db.query('select public.studio_update_order($1,$2)', [order, JSON.stringify({ name: 'Must roll back', items: [{ id: '00000000-0000-4000-8000-999999999999', quantity: 1 }] })]));
      assert.equal((await db.query('select name from public.orders where id = $1', [order])).rows[0].name, 'Studio edit');
    });
    for (const role of ['anon', 'authenticated']) await asRole(role, alice, async () => {
      await assert.rejects(db.query('select * from public.studio_order_notes'), { code: '42501' });
      await assert.rejects(db.query('select public.studio_update_order($1,$2)', [order, '{}']), { code: '42501' });
      await assert.rejects(db.query('select orders_open from public.studio_settings'), { code: '42501' });
    });
  });

  await t.test('Checkout retries save one order and reject reuse for different content', () => asRole('service_role', '', async () => {
    const row = (await db.query('select * from public.orders where id=$1',[order])).rows[0];
    row.id='00000000-0000-4000-8000-000000000020';
    const key='00000000-0000-4000-8000-000000000021';
    const items=[{id:'00000000-0000-4000-8000-000000000022',name:'Retry test',quantity:1,is_custom:false,design_minutes:0,stitch_minutes:5}];
    const call=() => db.query('select public.create_checkout_once($1,$2,$3,$4) as result',[JSON.stringify(row),JSON.stringify(items),key,'fingerprint']);
    assert.equal((await call()).rows[0].result.created,true);
    assert.equal((await call()).rows[0].result.created,false);
    assert.equal((await db.query('select count(*)::int as count from public.orders where id=$1',[row.id])).rows[0].count,1);
    await assert.rejects(db.query('select public.create_checkout_once($1,$2,$3,$4)',[JSON.stringify(row),JSON.stringify(items),key,'different']),{code:'P0001'});
  }));
  await t.test('Durable rate limits reject excess requests', () => asRole('service_role','',async () => {
    for (const expected of [true,true,false,false]) assert.equal((await db.query("select public.consume_request_limit('test-bucket',2,600) as allowed")).rows[0].allowed,expected);
  }));
  await t.test('Proof links require the secret, block production, and cannot approve superseded versions', () => asRole('service_role','',async () => {
    const proof='00000000-0000-4000-8000-000000000030';
    await db.query('select public.publish_order_proof($1,$2,$3,$4,$5)',[order,proof,'secret','Name: Anna, blue thread','owner@example.test']);
    assert.equal((await db.query('select public.respond_order_proof($1,$2,$3,$4) as ok',[proof,'wrong','approved',''])).rows[0].ok,false);
    await assert.rejects(db.query('select public.studio_edit_order($1,$2,$3)',[order,JSON.stringify({fulfillment_status:'started'}),'owner@example.test']),{code:'P0001'});
    assert.equal((await db.query('select public.respond_order_proof($1,$2,$3,$4) as ok',[proof,'secret','approved','Looks right'])).rows[0].ok,true);
    await db.query('select public.studio_edit_order($1,$2,$3)',[order,JSON.stringify({fulfillment_status:'started',carrier:'ups',tracking_number:'123'}),'owner@example.test']);
    const activity=(await db.query("select * from public.order_activity where order_id=$1 and action='Order updated'",[order])).rows;
    assert.equal(activity[0].actor,'owner@example.test');
    await db.query('select public.studio_edit_order($1,$2,$3)',[order,JSON.stringify({fulfillment_status:'pending_review'}),'owner@example.test']);
    await db.query('select public.publish_order_proof($1,$2,$3,$4,$5)',[order,'00000000-0000-4000-8000-000000000031','newsecret','Name: Anne','owner@example.test']);
    assert.equal((await db.query('select public.respond_order_proof($1,$2,$3,$4) as ok',[proof,'secret','approved',''])).rows[0].ok,false);
  }));
  await t.test('Inventory adjustments cannot underflow and keep a movement record', () => asRole('service_role','',async () => {
    const id='00000000-0000-4000-8000-000000000040';
    await db.query("insert into public.studio_inventory(id,name) values($1,'White towel')",[id]);
    await db.query('select public.adjust_inventory($1,$2,$3,$4)',[id,5,'Opening count','owner@example.test']);
    await assert.rejects(db.query('select public.adjust_inventory($1,$2,$3,$4)',[id,-6,'Too much','owner@example.test']),{code:'23514'});
    assert.equal((await db.query('select quantity from public.studio_inventory where id=$1',[id])).rows[0].quantity,5);
    assert.equal((await db.query('select count(*)::int as count from public.inventory_movements where inventory_id=$1',[id])).rows[0].count,1);
  }));
  await t.test('Customers cannot read operational records or invoke privileged workflows', async () => {
    for(const role of ['anon','authenticated']) await asRole(role,alice,async () => {
      for(const table of ['checkout_requests','request_limits','order_activity','order_proofs','studio_inventory','inventory_movements']) await assert.rejects(db.query('select * from public.'+table),{code:'42501'});
      for(const signature of ['consume_request_limit(text,integer,integer)','create_checkout_once(jsonb,jsonb,uuid,text)','studio_edit_order(uuid,jsonb,text)','publish_order_proof(uuid,uuid,text,text,text)','respond_order_proof(uuid,text,text,text)','adjust_inventory(uuid,integer,text,text)']) assert.equal((await db.query("select has_function_privilege(current_user,$1,'execute') as allowed",['public.'+signature])).rows[0].allowed,false);
    });
  });

});
