import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { productImages } from '@/lib/catalog';
import { defaultSettings, normalizeSettings } from '@/lib/scheduler';
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

function useDatabase() {
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
  await writeFile(FILE_PATH, JSON.stringify(store, null, 2));
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
    images: productImages({ ...row, image: row.image_path }),
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
  if (useDatabase()) {
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
    sort_order: Number(input.sort_order) || 0,
    active: input.active !== false,
    updated_at: new Date().toISOString(),
  };

  if (useDatabase()) {
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
  if (useDatabase()) {
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
  if (useDatabase()) {
    const { data, error } = await db().from('studio_settings').select('*').eq('id', 1).maybeSingle();
    if (error) throw error;
    if (!data) return { ...defaultSettings };
    return normalizeSettings({
      workDays: data.work_days || defaultSettings.workDays,
      minutesPerSession: data.minutes_per_session || defaultSettings.minutesPerSession,
      daysOff: data.days_off || [],
    });
  }
  if (!canUseFileStore()) return { ...defaultSettings };
  const store = await readFileStore();
  return normalizeSettings({ ...defaultSettings, ...store.settings });
}

export async function getInstagramToken() {
  if (useDatabase()) {
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

export async function getEmailSettings() {
  if (useDatabase()) {
    const { data, error } = await db()
      .from('studio_settings')
      .select('resend_api_key, notification_from_email, gmail_app_password')
      .eq('id', 1)
      .maybeSingle();
    if (error) throw error;
    return {
      apiKey: data?.resend_api_key || '',
      fromEmail: data?.notification_from_email || '',
      gmailPassword: data?.gmail_app_password || '',
    };
  }
  if (!canUseFileStore()) return { apiKey: '', fromEmail: '', gmailPassword: '' };
  const store = await readFileStore();
  return {
    apiKey: store.email?.apiKey || '',
    fromEmail: store.email?.fromEmail || '',
    gmailPassword: store.email?.gmailPassword || '',
  };
}

export async function saveEmailSettings({ apiKey, fromEmail, gmailPassword }) {
  const next = {
    apiKey: String(apiKey || '').trim(),
    fromEmail: String(fromEmail || '').trim(),
    gmailPassword: String(gmailPassword || '').trim(),
  };
  if (useDatabase()) {
    const { error } = await db().from('studio_settings').upsert({
      id: 1,
      resend_api_key: next.apiKey || null,
      notification_from_email: next.fromEmail || null,
      gmail_app_password: next.gmailPassword || null,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return next;
  }
  if (!canUseFileStore()) throw new Error('Database is not configured.');
  const store = await readFileStore();
  store.email = next;
  await writeFileStore(store);
  return next;
}

export async function saveInstagramToken(token) {
  const refreshedAt = new Date().toISOString();
  if (useDatabase()) {
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
  const next = normalizeSettings(settings);
  if (useDatabase()) {
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

export async function listOrders({ email, userId, includeAll = false } = {}) {
  if (useDatabase()) {
    let query = db().from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
    if (!includeAll && userId) query = query.eq('user_id', userId);
    else if (!includeAll && email) query = query.ilike('email', email);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((row) => mapOrder(row, row.order_items || []));
  }
  if (!canUseFileStore()) return [];
  const store = await readFileStore();
  return store.orders
    .filter((order) => includeAll || (userId && order.user_id === userId) || (email && order.email?.toLowerCase() === email.toLowerCase()))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function getOrder(id) {
  const orders = await listOrders({ includeAll: true });
  return orders.find((order) => order.id === id) || null;
}

export async function createOrder(input) {
  const order = {
    id: crypto.randomUUID(),
    user_id: input.user_id || null,
    email: input.email,
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

  if (useDatabase()) {
    const { items, ...row } = order;
    const { error } = await db().from('orders').insert(row);
    if (error) throw error;
    if (items.length) {
      const { error: itemError } = await db().from('order_items').insert(items.map((item) => ({ ...item, order_id: order.id })));
      if (itemError) throw itemError;
    }
    return getOrder(order.id);
  }

  if (!canUseFileStore()) throw new Error('Database is not configured.');
  const store = await readFileStore();
  store.orders.unshift(order);
  await writeFileStore(store);
  return order;
}

export async function updateOrder(id, patch) {
  if (useDatabase()) {
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
        }).eq('id', item.id);
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
  if (useDatabase()) {
    const { error } = await db().from('orders').update({ user_id: userId }).is('user_id', null).ilike('email', email);
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
    email: input.email,
    phone: input.phone || '',
    message: input.message,
    created_at: new Date().toISOString(),
  };
  if (useDatabase()) {
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
  if (useDatabase()) return 'supabase';
  if (canUseFileStore()) return 'local';
  return 'none';
}
