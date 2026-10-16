import { checkoutFingerprint, checkoutReplay, protectPublicRequest } from '@/lib/operations-store';
import { resolveCheckoutOrder } from '@/lib/checkout-order';
import { readJsonBody, validateSubmission } from '@/lib/security';
import { jsonError } from '@/lib/require-admin';
import { normalizeState, pickAddress, validateAddress } from '@/lib/address';
import { notifyNewOrder, notifyOrderUpdate, siteUrl } from '@/lib/notifications';
import { createOrder, getCheckoutProducts, getWebsiteSettings } from '@/lib/store';
import { getSessionProfile } from '@/lib/supabase/auth';
import { hasSupabaseConfig } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';

export async function POST(request) {
  try {
    const body = await readJsonBody(request);
    const key = request.headers.get('idempotency-key');
    if (!key || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) return Response.json({ error: 'Refresh checkout before submitting.' }, { status: 400 });
    // Cheap in-memory validation first so junk requests cannot drain the shared checkout budget.
    const inputError = validateSubmission(body, { order: true });
    if (inputError) return Response.json({ error: inputError }, { status: 400 });
    const items = Array.isArray(body.items) ? body.items : [];
    if (!body.name || !body.email || !body.venmo_username || items.length === 0) {
      return Response.json({ error: 'Name, email, Venmo username, and at least one piece are required.' }, { status: 400 });
    }
    if (body.venmo_verified !== true && body.venmo_verified !== '1') {
      return Response.json({ error: 'Confirm your Venmo username is correct.' }, { status: 400 });
    }
    const deliveryMethod = body.delivery_method === 'pickup' ? 'pickup' : 'shipping';
    const addressError = deliveryMethod === 'shipping' ? validateAddress(body) : null;
    if (addressError) {
      return Response.json({ error: addressError }, { status: 400 });
    }
    await protectPublicRequest(request, 'orders');
    const profile = await getSessionProfile();
    const fingerprint = checkoutFingerprint(body, profile?.id || null);
    const replay = await checkoutReplay(key, fingerprint);
    // A replay only confirms the submission; the order may since have been
    // claimed or corrected, so its current details are not returned.
    if (replay) return Response.json({ order: { id: replay.id }, replayed: true });
    const website = await getWebsiteSettings();
    if (!website.ordersOpen) return Response.json({ error: website.pausedMessage }, { status: 409 });
    if (deliveryMethod === 'pickup' && !website.info.pickupEnabled) return Response.json({ error: 'Pickup is not currently available.' }, { status: 400 });

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
      // Pickup hides the address fields, so anything left in them is stale.
      address_line: deliveryMethod === 'pickup' ? '' : String(body.address_line || '').trim(),
      address_line2: deliveryMethod === 'pickup' ? '' : String(body.address_line2 || '').trim(),
      city: deliveryMethod === 'pickup' ? '' : String(body.city || '').trim(),
      region: deliveryMethod === 'pickup' ? '' : normalizeState(body.region),
      postal_code: deliveryMethod === 'pickup' ? '' : String(body.postal_code || '').trim(),
      subtotal,
      items: resolved,
    }, { key, fingerprint });
    // Pickup orders carry no address, so saving one would blank the profile's.
    const saveAddress = deliveryMethod === 'shipping' && (body.save_address === true || body.save_address === '1');
    const saveVenmo = body.save_venmo === true || body.save_venmo === '1';
    let warning = '';
    if (profile && hasSupabaseConfig() && (saveAddress || saveVenmo)) {
      const supabase = await createClient();
      const { error } = await supabase.from('profiles').update({
        ...(saveAddress ? pickAddress(body) : {}),
        ...(saveVenmo ? { venmo_username: String(body.venmo_username || '').trim() } : {}),
        updated_at: new Date().toISOString(),
      }).eq('id', profile.id);
      if (error) warning = 'Your order was placed, but your saved details could not be updated.';
    }
    if (!order.replayed) {
      const hasCustom = (order.items || []).some((item) => item.is_custom);
      await Promise.all([notifyNewOrder(order), notifyOrderUpdate(order, [
        `Thank you, I’ve received your order #${String(order.id || '').slice(0, 8)}.`,
        deliveryMethod === 'pickup' ? 'Next, I’ll review it and send a Venmo request. Stitching starts once it’s paid, and I’ll arrange local pickup with you.' : 'Next, I’ll review it and send a Venmo request with shipping added. Stitching starts once it’s paid.',
        ...(hasCustom ? ['Custom pieces are quoted after review.'] : []),
        '',
        order.subtotal ? 'Your pieces (total before shipping):' : 'Your pieces:',
      ].join('\n'), `Your Love & Co. order #${String(order.id || '').slice(0, 8)} is received`, {
        items: order.items || [],
        total: order.subtotal || 0,
        // Guests have no account yet; send them to sign up so the order attaches by email.
        action: profile ? undefined : { href: `${siteUrl()}/login?mode=signup&next=/account`, label: 'Follow your order' },
      })]);
    }
    return Response.json({ order, warning });
  } catch (error) { return jsonError(error); }
}
