import 'server-only';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { infoDefaults } from '@/lib/operations-utils';
import { productImages } from '@/lib/catalog';
import { defaultSettings } from '@/lib/scheduler';
import { createAdminClient, hasSupabaseAdminConfig } from '@/lib/supabase/admin';
import { hasSupabaseConfig } from '@/lib/supabase/config';

const FILE_PATH = path.join(process.cwd(), '.data', 'store.json');

const emptyStore = () => ({
  products: [],
  orders: [],
  settings: { ...defaultSettings, daysOff: [] },
  messages: [],
});

function canUseFileStore() {
  return !hasSupabaseConfig() && process.env.NODE_ENV !== 'production';
}

function databaseConfigured() {
  return hasSupabaseConfig() && hasSupabaseAdminConfig();
}

async function readFileStore() {
  try {
    return { ...emptyStore(), ...JSON.parse(await readFile(FILE_PATH, 'utf8')) };
  } catch {
    return emptyStore();
  }
}

async function writeFileStore(store) {
  await mkdir(path.dirname(FILE_PATH), { recursive: true });
  const temporary = `${FILE_PATH}.${crypto.randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(store, null, 2));
  await rename(temporary, FILE_PATH);
  return store;
}

function db() {
  const client = createAdminClient();
  if (!client) throw new Error('Supabase service role is not configured.');
  return client;
}

function mapProduct(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    detail: row.detail || '',
    category: row.category,
    price: Number(row.item_price),
    embroideryPrice: Number(row.embroidery_price),
    item_price: Number(row.item_price),
    embroidery_price: Number(row.embroidery_price),
    design_minutes: Number(row.design_minutes) || 0,
    stitch_minutes: Number(row.stitch_minutes) || 0,
    image: row.image_path,
    image_path: row.image_path,
    images: row.photo_paths?.length ? row.photo_paths : productImages({ ...row, image: row.image_path }),
    photo_paths: row.photo_paths || [],
    sort_order: row.sort_order || 0,
    active: Boolean(row.active),
  };
}

function mapOrder(row, items = []) {
  return {
    ...row,
    items,
    subtotal: Number(row.subtotal) || 0,
  };
}

export async function listProducts({ includeHidden = false } = {}) {
  if (databaseConfigured()) {
    let query = db().from('products').select('*').order('sort_order', { ascending: true });
    if (!includeHidden) query = query.eq('active', true);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapProduct);
  }
  if (!canUseFileStore()) return [];
  const store = await readFileStore();
  return store.products.filter((product) => includeHidden || product.active).map(mapProduct);
}

export async function getProduct(id) {
  if (databaseConfigured()) {
    const { data, error } = await db().from('products').select('*').eq('id', id).eq('active', true).maybeSingle();
    if (error) throw error;
    return data ? mapProduct(data) : null;
  }
  const products = await listProducts({ includeHidden: true });
  return products.find((product) => product.id === id) || null;
}

export async function saveProduct(input) {
  const payload = {
    slug: input.slug,
    name: input.name,
    detail: input.detail || '',
    category: input.category,
    item_price: Number(input.item_price ?? input.price ?? 0),
    embroidery_price: Number(input.embroidery_price ?? input.embroideryPrice ?? 0),
    design_minutes: Number(input.design_minutes) || 0,
    stitch_minutes: Number(input.stitch_minutes) || 0,
    image_path: input.image_path || input.image || '/images/Logo.png',
    photo_paths: input.photo_paths || [],
    sort_order: Number(input.sort_order) || 0,
    active: input.active !== false,
    updated_at: new Date().toISOString(),
  };

  if (databaseConfigured()) {
    if (input.id) {
      const { data, error } = await db().from('products').update(payload).eq('id', input.id).select('*').single();
      if (error) throw error;
      return mapProduct(data);
    }
    const { data, error } = await db().from('products').insert(payload).select('*').single();
    if (error) throw error;
    return mapProduct(data);
  }

  if (!canUseFileStore()) throw new Error('Database is not configured.');
  const store = await readFileStore();
  const product = mapProduct({
    id: input.id || crypto.randomUUID(),
    ...payload,
  });
  const index = store.products.findIndex((item) => item.id === product.id);
  if (index >= 0) store.products[index] = { ...store.products[index], ...product };
  else store.products.push(product);
  await writeFileStore(store);
  return product;
}

export async function deleteProduct(id) {
  if (databaseConfigured()) {
    const { error } = await db().from('products').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  if (!canUseFileStore()) throw new Error('Database is not configured.');
  const store = await readFileStore();
  store.products = store.products.filter((product) => product.id !== id);
  await writeFileStore(store);
}

export async function getSettings() {
  if (databaseConfigured()) {
    const { data, error } = await db().from('studio_settings').select('work_days, minutes_per_session, days_off').eq('id', 1).maybeSingle();
    if (error) throw error;
    if (!data) return { ...defaultSettings };
    return {
      workDays: data.work_days || defaultSettings.workDays,
      minutesPerSession: data.minutes_per_session || defaultSettings.minutesPerSession,
      daysOff: (data.days_off || []).map((day) => String(day).slice(0, 10)),
    };
  }
  if (!canUseFileStore()) return { ...defaultSettings };
  const store = await readFileStore();
  return { ...defaultSettings, ...store.settings, daysOff: store.settings.daysOff || [] };
}

export async function getInstagramToken() {
  if (databaseConfigured()) {
    const { data, error } = await db()
      .from('studio_settings')
      .select('instagram_access_token, instagram_token_refreshed_at')
      .eq('id', 1)
      .maybeSingle();
    if (error) throw error;
    return {
      token: data?.instagram_access_token || '',
      refreshedAt: data?.instagram_token_refreshed_at || null,
    };
  }
  if (!canUseFileStore()) return { token: '', refreshedAt: null };
  const store = await readFileStore();
  return {
    token: store.instagram?.token || '',
    refreshedAt: store.instagram?.refreshedAt || null,
  };
}

export async function saveInstagramToken(token) {
  const refreshedAt = new Date().toISOString();
  if (databaseConfigured()) {
    const { error } = await db().from('studio_settings').upsert({
      id: 1,
      instagram_access_token: token,
      instagram_token_refreshed_at: refreshedAt,
      updated_at: refreshedAt,
    });
    if (error) throw error;
    return { token, refreshedAt };
  }
  if (!canUseFileStore()) return { token, refreshedAt };
  const store = await readFileStore();
  store.instagram = { token, refreshedAt };
  await writeFileStore(store);
  return { token, refreshedAt };
}

export async function saveSettings(settings) {
  const next = {
    workDays: settings.workDays || defaultSettings.workDays,
    minutesPerSession: Number(settings.minutesPerSession) || defaultSettings.minutesPerSession,
    daysOff: settings.daysOff || [],
  };
  if (databaseConfigured()) {
    const { error } = await db().from('studio_settings').upsert({
      id: 1,
      work_days: next.workDays,
      minutes_per_session: next.minutesPerSession,
      days_off: next.daysOff,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return next;
  }
  if (!canUseFileStore()) throw new Error('Database is not configured.');
  const store = await readFileStore();
  store.settings = next;
  await writeFileStore(store);
  return next;
}

export async function listOrders({ userId, includeAll = false } = {}) {
  if (!includeAll && !userId) return [];
  if (databaseConfigured()) {
    const rows = [];
    for (let offset = 0; ; offset += 500) {
      let query = db().from('orders').select('*, order_items(*)').order('created_at', { ascending: false }).order('id').range(offset, offset + 499);
      if (!includeAll) query = query.eq('user_id', userId);
      const { data, error } = await query;
      if (error) throw error;
      rows.push(...(data || []).map((row) => mapOrder(row, row.order_items || [])));
      if (!data || data.length < 500) return rows;
    }
  }
  if (!canUseFileStore()) return [];
  const store = await readFileStore();
  return store.orders
    .filter((order) => includeAll || (userId && order.user_id === userId))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function getOrder(id) {
  if (databaseConfigured()) {
    const { data, error } = await db().from('orders').select('*, order_items(*)').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapOrder(data, data.order_items || []) : null;
  }
  const orders = await listOrders({ includeAll: true });
  return orders.find((order) => order.id === id) || null;
}

export async function createOrder(input, checkout = null) {
  const order = {
    id: crypto.randomUUID(),
    user_id: input.user_id || null,
    email: input.email.trim().toLowerCase(),
    name: input.name,
    phone: input.phone || '',
    venmo_username: input.venmo_username || '',
    customer_notes: input.customer_notes || '',
    address_line: input.address_line || '',
    address_line2: input.address_line2 || '',
    city: input.city || '',
    region: input.region || '',
    postal_code: input.postal_code || '',
    payment_status: input.payment_status || 'unpaid',
    fulfillment_status: input.fulfillment_status || 'pending_review',
    delivery_method: input.delivery_method || 'shipping',
    carrier: input.carrier || '',
    pickup_instructions: input.pickup_instructions || '',
    tracking_number: input.tracking_number || '',
    priority: input.priority || 'standard',
    promised_on: input.promised_on || null,
    subtotal: Number(input.subtotal) || 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: (input.items || []).map((item) => ({
      id: crypto.randomUUID(),
      product_id: item.product_id || null,
      name: item.name,
      item_price: item.item_price ?? item.price ?? null,
      embroidery_price: item.embroidery_price ?? item.embroideryPrice ?? null,
      design_minutes: Number(item.design_minutes) || 0,
      stitch_minutes: Number(item.stitch_minutes) || 0,
      quantity: Number(item.quantity) || 1,
      personalization: item.personalization || '',
      is_custom: Boolean(item.is_custom || item.isCustom),
      custom_details: item.custom_details || null,
    })),
  };

  if (databaseConfigured()) {
    const { items, ...row } = order;
    if (checkout) {
      const { data, error } = await db().rpc('create_checkout_once', { order_row: row, item_rows: items, request_key: checkout.key, fingerprint: checkout.fingerprint });
      if (error) throw Object.assign(new Error(error.code === 'P0001' ? 'This checkout has changed. Refresh and try again.' : 'Could not save order.'), { status: error.code === 'P0001' ? 409 : 500 });
      return { ...await getOrder(data.id), replayed: !data.created };
    }
    const { error } = await db().rpc('create_order_with_items', { order_row: row, item_rows: items });
    if (error) throw error;
    return getOrder(order.id);
  }

  if (!canUseFileStore()) throw new Error('Database is not configured.');
  return withLocalStore((store) => {
    if (checkout) {
      const previous = store.checkoutRequests?.[checkout.key];
      if (previous) {
        if (previous.fingerprint !== checkout.fingerprint) throw Object.assign(new Error('This checkout has changed. Refresh and try again.'), { status: 409 });
        return { ...store.orders.find((o) => o.id === previous.id), replayed: true };
      }
      store.checkoutRequests = { ...store.checkoutRequests, [checkout.key]: { fingerprint: checkout.fingerprint, id: order.id } };
    }
    store.orders.unshift(order);
    return order;
  });
}

export async function updateOrder(id, input) {
  const allowed = ['payment_status', 'fulfillment_status', 'tracking_number', 'priority', 'promised_on', 'subtotal', 'items'];
  const patch = Object.fromEntries(Object.entries(input).filter(([key]) => allowed.includes(key)));

  if (databaseConfigured()) {
    const { items, ...row } = patch;
    if (Object.keys(row).length) {
      const { error } = await db().from('orders').update({ ...row, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    }
    if (Array.isArray(items)) {
      for (const item of items) {
        if (!item.id) continue;
        const { error } = await db().from('order_items').update({
          design_minutes: Number(item.design_minutes) || 0,
          stitch_minutes: Number(item.stitch_minutes) || 0,
          item_price: item.item_price,
          embroidery_price: item.embroidery_price,
        }).eq('id', item.id).eq('order_id', id);
        if (error) throw error;
      }
    }
    return getOrder(id);
  }

  if (!canUseFileStore()) throw new Error('Database is not configured.');
  const store = await readFileStore();
  const index = store.orders.findIndex((order) => order.id === id);
  if (index < 0) return null;
  const current = store.orders[index];
  const nextItems = Array.isArray(patch.items)
    ? current.items.map((item) => {
      const update = patch.items.find((candidate) => candidate.id === item.id);
      return update ? { ...item, ...update } : item;
    })
    : current.items;
  store.orders[index] = { ...current, ...patch, items: nextItems, updated_at: new Date().toISOString() };
  await writeFileStore(store);
  return store.orders[index];
}

export async function claimOrdersForUser(userId, email) {
  if (!email || !userId) return;
  if (databaseConfigured()) {
    const { error } = await db().from('orders').update({ user_id: userId }).is('user_id', null).eq('email', email.trim().toLowerCase());
    if (error) throw error;
    return;
  }
  if (!canUseFileStore()) return;
  const store = await readFileStore();
  store.orders = store.orders.map((order) => (
    !order.user_id && order.email?.toLowerCase() === email.toLowerCase()
      ? { ...order, user_id: userId }
      : order
  ));
  await writeFileStore(store);
}

export async function saveContactMessage(input) {
  const message = {
    id: crypto.randomUUID(),
    name: input.name,
    email: input.email.trim().toLowerCase(),
    phone: input.phone || '',
    message: input.message,
    created_at: new Date().toISOString(),
  };
  if (databaseConfigured()) {
    const { error } = await db().from('contact_messages').insert(message);
    if (error) throw error;
    return message;
  }
  if (!canUseFileStore()) throw new Error('Database is not configured.');
  const store = await readFileStore();
  store.messages.unshift(message);
  await writeFileStore(store);
  return message;
}

export function persistenceMode() {
  if (databaseConfigured()) return 'supabase';
  if (canUseFileStore()) return 'local';
  return 'none';
}

// Only the fields needed to calculate timing; never fetch customer contact data here.
export async function listSchedulingOrders() {
  if (!databaseConfigured()) return listOrders({ includeAll: true });
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db().from('orders')
      .select('id, priority, created_at, promised_on, payment_status, fulfillment_status, order_items(name, design_minutes, stitch_minutes, quantity)')
      .eq('payment_status', 'paid')
      .not('fulfillment_status', 'in', '(complete,cancelled,shipped)')
      .order('created_at', { ascending: true }).order('id', { ascending: true })
      .range(offset, offset + 499);
    if (error) throw error;
    rows.push(...(data || []).map((row) => mapOrder(row, row.order_items || [])));
    if (!data || data.length < 500) return rows;
  }
}

export async function getCheckoutProducts(items) {
  const ids = [...new Set(items.filter((item) => !item.isCustom && !item.is_custom)
    .map((item) => item.productId || String(item.id || '').split('::')[0]))];
  if (!ids.length) return [];
  if (databaseConfigured()) {
    if (ids.some((id) => typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) {
      throw Object.assign(new Error('An item in your bag is no longer available. Remove it and try again.'), { status: 400 });
    }
    const { data, error } = await db().from('products').select('*').in('id', ids).eq('active', true);
    if (error) throw error;
    return (data || []).map(mapProduct);
  }
  return (await listProducts()).filter((product) => ids.includes(product.id));
}

export async function updatePromisedDate(id, date) {
  if (!databaseConfigured()) return updateOrder(id, { promised_on: date });
  const { error } = await db().from('orders').update({ promised_on: date, updated_at: new Date().toISOString() })
    .eq('id', id).eq('payment_status', 'paid');
  if (error) throw error;
}

export async function listContactMessages({ offset = 0, limit = 50 } = {}) {
  if (databaseConfigured()) {
    const { data, error } = await db().from('contact_messages').select('*').order('created_at', { ascending: false }).order('id').range(offset, offset + limit);
    if (error) throw error;
    return { messages: (data || []).slice(0, limit), hasMore: data.length > limit };
  }
  if (!canUseFileStore()) throw new Error('Database is not configured.');
  const store = await readFileStore();
  return { messages: store.messages.slice(offset, offset + limit).map((m) => ({ status: 'new', ...m })), hasMore: store.messages.length > offset + limit };
}

export async function updateContactStatus(id, status) {
  if (databaseConfigured()) {
    const { data, error } = await db().from('contact_messages').update({ status }).eq('id', id).select('*').maybeSingle();
    if (error) throw error;
    return data;
  }
  if (!canUseFileStore()) throw new Error('Database is not configured.');
  const store = await readFileStore();
  const message = store.messages.find((m) => m.id === id);
  if (!message) return null;
  message.status = status;
  await writeFileStore(store);
  return message;
}

export async function getOrderNotes(id) {
  if (databaseConfigured()) {
    const { data, error } = await db().from('studio_order_notes').select('notes').eq('order_id', id).maybeSingle();
    if (error) throw error;
    return data?.notes || '';
  }
  if (!canUseFileStore()) throw new Error('Database is not configured.');
  return (await readFileStore()).orderNotes?.[id] || '';
}

export async function saveStudioOrder(id, patch, actor = 'Studio') {
  if (databaseConfigured()) {
    const { error } = await db().rpc('studio_edit_order', { target_id: id, patch, actor_name: actor });
    if (error) throw Object.assign(new Error(error.code === 'P0001' ? error.message : 'Could not save order.'), { status: error.code === 'P0001' ? 409 : 500 });
    return getOrder(id);
  }
  if (!canUseFileStore()) throw new Error('Database is not configured.');
  const store = await readFileStore();
  const index = store.orders.findIndex((o) => o.id === id);
  if (index < 0) return null;
  const { staff_notes, items, ...fields } = patch;
  const current = store.orders[index];
  if (items?.some((item) => current.items.find((old) => old.id === item.id)?.quantity !== item.quantity)) {
    store.proofs = (store.proofs || []).map((p) => p.order_id === id ? { ...p, status: 'superseded' } : p);
  }
  const latestProof = (store.proofs || []).find((p) => p.order_id === id);
  if (['started', 'shipped', 'complete'].includes(fields.fulfillment_status || current.fulfillment_status) && latestProof && latestProof.status !== 'approved') throw Object.assign(new Error('Customer proof approval is required before production.'), { status: 409 });
  store.activity = [{ id: crypto.randomUUID(), order_id: id, actor, action: 'Order updated', details: { fields: Object.keys(patch), payment_before: current.payment_status, payment_after: fields.payment_status || current.payment_status, total_before: current.subtotal, total_after: fields.subtotal ?? current.subtotal }, created_at: new Date().toISOString() }, ...(store.activity || [])];
  store.orders[index] = { ...current, ...fields, updated_at: new Date().toISOString(),
    items: items ? current.items.map((item) => ({ ...item, ...items.find((row) => row.id === item.id) })) : current.items };
  if (staff_notes !== undefined) store.orderNotes = { ...store.orderNotes, [id]: staff_notes };
  await writeFileStore(store);
  return store.orders[index];
}

const websiteDefaults = { ordersOpen: true, announcement: '', pausedMessage: 'We are catching up on our stitching. Please check back soon.', info: infoDefaults };
export async function getWebsiteSettings() {
  if (databaseConfigured()) {
    const { data, error } = await db().from('studio_settings').select('orders_open, announcement, paused_message, shop_info').eq('id', 1).maybeSingle();
    if (error) throw error;
    return data ? { ordersOpen: data.orders_open, announcement: data.announcement, pausedMessage: data.paused_message, info: { ...infoDefaults, ...data.shop_info } } : websiteDefaults;
  }
  return canUseFileStore() ? { ...websiteDefaults, ...(await readFileStore()).website } : websiteDefaults;
}
export async function saveWebsiteSettings(input) {
  if (databaseConfigured()) {
    const { error } = await db().from('studio_settings').upsert({ id: 1, orders_open: input.ordersOpen, announcement: input.announcement, paused_message: input.pausedMessage, shop_info: input.info || infoDefaults, updated_at: new Date().toISOString() });
    if (error) throw error;
  } else {
    if (!canUseFileStore()) throw new Error('Database is not configured.');
    const store = await readFileStore();
    store.website = input;
    await writeFileStore(store);
  }
  return input;
}

let localQueue = Promise.resolve();
export async function withLocalStore(operation) {
  if (!canUseFileStore()) throw new Error('Local preview is unavailable.');
  const pending = localQueue.then(async () => { const store = await readFileStore(); const result = await operation(store); await writeFileStore(store); return result; });
  localQueue = pending.catch(() => {});
  return pending;
}
export async function readLocalStore() { if (!canUseFileStore()) throw new Error('Local preview is unavailable.'); return readFileStore(); }
