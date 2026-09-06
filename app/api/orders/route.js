import { checkoutFingerprint, checkoutReplay, protectPublicRequest } from '@/lib/operations-store';
import { resolveCheckoutOrder } from '@/lib/checkout-order';
import { readJsonBody, validateSubmission } from '@/lib/security';
import { jsonError } from '@/lib/require-admin';
import { normalizeState, pickAddress, validateAddress } from '@/lib/address';
import { notifyNewOrder } from '@/lib/notifications';
import { createOrder, getCheckoutProducts, getWebsiteSettings } from '@/lib/store';
import { getSessionProfile } from '@/lib/supabase/auth';
import { hasSupabaseConfig } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';

export async function POST(request) {
  try {
    const body = await readJsonBody(request);
    await protectPublicRequest(request, 'orders');
    const key = request.headers.get('idempotency-key');
    if (!key || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) return Response.json({ error: 'Refresh checkout before submitting.' }, { status: 400 });
    const profile = await getSessionProfile();
    const fingerprint = checkoutFingerprint(body, profile?.id || null);
    const replay = await checkoutReplay(key, fingerprint);
    if (replay) return Response.json({ order: replay, replayed: true });
    const website = await getWebsiteSettings();
    if (!website.ordersOpen) return Response.json({ error: website.pausedMessage }, { status: 409 });
    const inputError = validateSubmission(body, { order: true });
    if (inputError) return Response.json({ error: inputError }, { status: 400 });
    const items = Array.isArray(body.items) ? body.items : [];
    if (!body.name || !body.email || !body.venmo_username || items.length === 0) {
      return Response.json({ error: 'Name, email, Venmo username, and at least one item are required.' }, { status: 400 });
    }
    if (body.venmo_verified !== true && body.venmo_verified !== '1') {
      return Response.json({ error: 'Confirm your Venmo username is correct.' }, { status: 400 });
    }
    const deliveryMethod = body.delivery_method === 'pickup' ? 'pickup' : 'shipping';
    if (deliveryMethod === 'pickup' && !website.info.pickupEnabled) return Response.json({ error: 'Pickup is not currently available.' }, { status: 400 });
    const addressError = deliveryMethod === 'shipping' ? validateAddress(body) : null;
    if (addressError) {
      return Response.json({ error: addressError }, { status: 400 });
    }

    const products = await getCheckoutProducts(items);
    const { items: resolved, subtotal } = resolveCheckoutOrder(items, products);
    const order = await createOrder({
      user_id: profile?.id || null,
      delivery_method: deliveryMethod,
      pickup_instructions: deliveryMethod === 'pickup' ? website.info.pickupInstructions : '',
      email: String(body.email).trim(),
      name: String(body.name).trim(),
      phone: String(body.phone || '').trim(),
      venmo_username: String(body.venmo_username).trim(),
      customer_notes: String(body.customer_notes || '').trim(),
      address_line: String(body.address_line || '').trim(),
      address_line2: String(body.address_line2 || '').trim(),
      city: String(body.city || '').trim(),
      region: normalizeState(body.region),
      postal_code: String(body.postal_code || '').trim(),
      subtotal,
      items: resolved,
    }, { key, fingerprint });
    const saveAddress = body.save_address === true || body.save_address === '1';
    const saveVenmo = body.save_venmo === true || body.save_venmo === '1';
    if (profile && hasSupabaseConfig() && (saveAddress || saveVenmo)) {
      const supabase = await createClient();
      await supabase.from('profiles').update({
        ...(saveAddress ? pickAddress(body) : {}),
        ...(saveVenmo ? { venmo_username: String(body.venmo_username || '').trim() } : {}),
        updated_at: new Date().toISOString(),
      }).eq('id', profile.id);
    }
    if (!order.replayed) await notifyNewOrder(order);
    return Response.json({ order });
  } catch (error) { return jsonError(error); }
}
