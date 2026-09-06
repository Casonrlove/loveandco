import 'server-only';
import { createHash, createHmac } from 'node:crypto';
import { createAdminClient } from './supabase/admin';
import { persistenceMode, readLocalStore, withLocalStore, getOrder } from './store';
import { canonicalJson } from './operations-utils';
const client = () => { const db = createAdminClient(); if (!db) throw Object.assign(new Error('Service is temporarily unavailable.'), { status: 503 }); return db; };
export const hashToken = (token) => createHash('sha256').update(token).digest('hex');
export const checkoutFingerprint = (body, userId) => hashToken(canonicalJson({ body, userId }));
const issue = (message, status = 400) => Object.assign(new Error(message), { status });

async function consume(key, limit, seconds) {
  if (persistenceMode() === 'local') return withLocalStore((store) => {
    const now = Date.now(); const limits = Object.fromEntries(Object.entries(store.limits || {}).filter(([, item]) => item.expires > now));
    const bucket = limits[key] || { hits: 0, expires: now + seconds * 1000 }; bucket.hits = Math.min(bucket.hits + 1, limit + 1); limits[key] = bucket; store.limits = limits;
    return bucket.hits <= limit;
  });
  const { data, error } = await client().rpc('consume_request_limit', { limit_key: key, max_hits: limit, window_seconds: seconds });
  if (error) throw issue('Unable to check request limits. Try again shortly.', 503);
  return data;
}
export async function protectPublicRequest(request, scope) {
  const limits = { orders: [12, 600, 500], contact: [5, 600, 300], address: [90, 600, 2000], proof: [60, 600, 5000] }[scope];
  // Vercel supplies this header at its edge. Outside Vercel use a shared bucket,
  // never a caller-controlled forwarding header to evade limits.
  const address = process.env.VERCEL ? request.headers.get('x-vercel-forwarded-for') || 'unknown' : 'local-or-unconfigured-proxy';
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || 'local-preview';
  const identity = createHmac('sha256', secret).update(address).digest('hex');
  if (!await consume(`${scope}:global`, limits[2], 86400) || !await consume(`${scope}:${identity}`, limits[0], limits[1])) throw issue('Too many requests. Please try again later or contact the shop.', 429);
}
export async function checkoutReplay(key, fingerprint) {
  let saved;
  if (persistenceMode() === 'local') { const store = await readLocalStore(); const row = store.checkoutRequests?.[key]; saved = row ? { ...row, order_id: row.id } : null; }
  else { const { data, error } = await client().from('checkout_requests').select('order_id,fingerprint').eq('request_key', key).maybeSingle(); if (error) throw error; saved = data; }
  if (!saved) return null;
  if (saved.fingerprint !== fingerprint) throw issue('This checkout has changed. Refresh and try again.', 409);
  return getOrder(saved.order_id);
}
export async function orderOperations(id) {
  if (persistenceMode() === 'local') {
    const store = await readLocalStore();
    return { activity: (store.activity || []).filter((a) => a.order_id === id).slice(0, 50), proofs: (store.proofs || []).filter((p) => p.order_id === id).map(({ token_hash: _secret, ...p }) => p).slice(0, 20) };
  }
  const [activity, proofs] = await Promise.all([
    client().from('order_activity').select('*').eq('order_id', id).order('created_at', { ascending: false }).limit(50),
    client().from('order_proofs').select('id,order_id,proof_text,status,response,created_at,responded_at').eq('order_id', id).order('created_at', { ascending: false }).limit(20),
  ]);
  if (activity.error || proofs.error) throw activity.error || proofs.error;
  return { activity: activity.data, proofs: proofs.data };
}
export async function publishProof(orderId, text, actor) {
  const token = crypto.randomUUID() + crypto.randomUUID(); const id = crypto.randomUUID(); const token_hash = hashToken(token);
  if (persistenceMode() === 'local') await withLocalStore((store) => {
    const order = store.orders.find((o) => o.id === orderId); if (!order) throw issue('Order not found.', 404);
    if (['started', 'shipped', 'complete', 'cancelled'].includes(order.fulfillment_status)) throw issue('Reopen the order before issuing a proof.', 409);
    store.proofs = [{ id, order_id: orderId, token_hash, proof_text: text, status: 'pending', response: '', created_at: new Date().toISOString() }, ...(store.proofs || []).map((p) => p.order_id === orderId ? { ...p, status: 'superseded' } : p)];
    store.activity = [{ id: crypto.randomUUID(), order_id: orderId, actor, action: 'Proof created', created_at: new Date().toISOString() }, ...(store.activity || [])];
  });
  else { const { error } = await client().rpc('publish_order_proof', { target_id: orderId, proof_id: id, secret_hash: token_hash, content: text, actor_name: actor }); if (error) throw issue(error.code === 'P0001' ? error.message : 'Could not publish proof.', 409); }
  return { id, token };
}
export async function customerProof(id, token) {
  if (!token || token.length > 200) return null;
  const secret = hashToken(token);
  if (persistenceMode() === 'local') { const proof = (await readLocalStore()).proofs?.find((p) => p.id === id && p.token_hash === secret); return proof ? { id: proof.id, proof_text: proof.proof_text, status: proof.status, response: proof.response, created_at: proof.created_at, responded_at: proof.responded_at } : null; }
  const { data, error } = await client().from('order_proofs').select('id,proof_text,status,response,created_at,responded_at').eq('id', id).eq('token_hash', secret).maybeSingle(); if (error) throw error; return data;
}
export async function respondProof(id, token, decision, response) {
  if (persistenceMode() === 'local') return withLocalStore((store) => {
    const proof = store.proofs?.find((p) => p.id === id && p.token_hash === hashToken(token) && p.status === 'pending');
    if (!proof) return false;
    proof.status = decision; proof.response = response; proof.responded_at = new Date().toISOString();
    store.activity = [{ id: crypto.randomUUID(), order_id: proof.order_id, actor: 'Customer proof link', action: decision === 'approved' ? 'Proof approved' : 'Proof changes requested', created_at: proof.responded_at }, ...(store.activity || [])];
    return true;
  });
  const { data, error } = await client().rpc('respond_order_proof', { proof_id: id, secret_hash: hashToken(token), decision, customer_response: response }); if (error) throw error; return data;
}
export async function listInventory() {
  if (persistenceMode() === 'local') return { supplies: (await readLocalStore()).inventory || [], movements: (await readLocalStore()).movements || [] };
  const [supplies, movements] = await Promise.all([client().from('studio_inventory').select('*').order('name').limit(1000), client().from('inventory_movements').select('*').order('created_at', { ascending: false }).limit(100)]);
  if (supplies.error || movements.error) throw supplies.error || movements.error;
  return { supplies: supplies.data, movements: movements.data };
}
export async function addSupply(input) {
  const row = { id: crypto.randomUUID(), name: input.name.trim(), size: input.size.trim(), color: input.color.trim(), quantity: 0, low_at: input.low_at };
  if (persistenceMode() === 'local') await withLocalStore((store) => { store.inventory = [...(store.inventory || []), row]; });
  else { const { error } = await client().from('studio_inventory').insert(row); if (error) throw error; }
  return row;
}
export async function adjustSupply(id, change, reason, actor) {
  if (persistenceMode() === 'local') return withLocalStore((store) => {
    const supply = store.inventory?.find((i) => i.id === id); if (!supply) throw issue('Supply not found.', 404);
    if (supply.quantity + change < 0) throw issue('Not enough stock for this adjustment.', 409);
    supply.quantity += change;
    store.movements = [{ id: crypto.randomUUID(), inventory_id: id, change, reason, actor, created_at: new Date().toISOString() }, ...(store.movements || [])];
  });
  const { error } = await client().rpc('adjust_inventory', { target_id: id, delta: change, reason_text: reason, actor_name: actor }); if (error) throw issue('Could not adjust stock. Check available quantity.', 409);
}
