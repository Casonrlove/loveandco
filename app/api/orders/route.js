import { normalizeState, pickAddress, validateAddress } from '@/lib/address';
import { NAPKIN_ORDER_DESIGN_FEE, PACKAGE_ORDER_DESIGN_FEE, designFee, isBabyBundle, isPerPersonPackage, isTieredNapkins, itemPrice, napkinUnitPrice, selectedBundleAddons } from '@/lib/catalog';
import { buildDesignProof, summarizeDesign, validateDesignItem } from '@/lib/design-options';
import { notifyNewOrder } from '@/lib/notifications';
import { createOrder, getProduct } from '@/lib/store';
import { getSessionProfile } from '@/lib/supabase/auth';
import { hasSupabaseConfig } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const items = Array.isArray(body.items) ? body.items : [];
  if (!body.name || !body.email || !body.venmo_username || items.length === 0) {
    return Response.json({ error: 'Name, email, Venmo username, and at least one item are required.' }, { status: 400 });
  }
  if (body.venmo_verified !== true && body.venmo_verified !== '1') {
    return Response.json({ error: 'Confirm your Venmo username is correct.' }, { status: 400 });
  }
  const addressError = validateAddress(body);
  if (addressError) {
    return Response.json({ error: addressError }, { status: 400 });
  }

  const profile = await getSessionProfile();
  const submittedAt = new Date().toISOString();
  const resolved = [];
  for (const item of items) {
    const productId = item.productId || (!String(item.id || '').includes('::') ? item.id : String(item.id).split('::')[0]);
    const product = item.isCustom || item.is_custom ? null : await getProduct(productId);
    const wantsDesign = Boolean(item.wantsDesign || item.isCustom || item.is_custom || item.category === 'baby-bundles' || isPerPersonPackage(item) || isTieredNapkins(item) || item.slug === 'monogram-towel');
    const designError = validateDesignItem(item);
    if (designError) {
      return Response.json({ error: designError }, { status: 400 });
    }
    const proof = buildDesignProof(item, { now: submittedAt });
    const designText = summarizeDesign({ ...item, nameVerified: proof.nameVerified, nameVerifiedAt: proof.nameVerifiedAt })
      || item.designDescription
      || item.personalization
      || '';
    resolved.push({
      product_id: product?.id || null,
      name: product?.name || item.name || 'Custom order',
      item_price: isTieredNapkins(item) || isTieredNapkins(product)
        ? napkinUnitPrice(item.quantity)
        : (product ? product.item_price : null),
      embroidery_price: wantsDesign ? designFee(product || item) : 0,
      design_minutes: wantsDesign ? (product?.design_minutes || 0) : 0,
      stitch_minutes: product?.stitch_minutes || (Number(item.stitch_minutes) || 0),
      quantity: Number(item.quantity) || 1,
      personalization: designText,
      is_custom: Boolean(item.isCustom || item.is_custom || !product),
      custom_details: {
        ...(item.custom_details || {}),
        ...proof,
      },
    });
    if (isBabyBundle(item) || isBabyBundle(product)) {
      for (const addon of selectedBundleAddons(item)) {
        resolved.push({
          product_id: null,
          name: `${addon.label} (${product?.name || item.name})`,
          item_price: addon.price,
          embroidery_price: 0,
          design_minutes: 0,
          stitch_minutes: 0,
          quantity: addon.quantity,
          personalization: 'Baby bundle add-on',
          is_custom: false,
          custom_details: { bundleAddon: addon.id, parentName: product?.name || item.name },
        });
      }
    }
  }

  if (items.some(isTieredNapkins)) {
    resolved.push({
      product_id: null,
      name: 'Napkin design fee',
      item_price: NAPKIN_ORDER_DESIGN_FEE,
      embroidery_price: 0,
      design_minutes: 0,
      stitch_minutes: 0,
      quantity: 1,
      personalization: 'One-time design fee for wedding cocktail napkins',
      is_custom: false,
      custom_details: { orderDesignFee: true },
    });
  }

  if (items.some(isPerPersonPackage)) {
    resolved.push({
      product_id: null,
      name: 'Package design fee',
      item_price: PACKAGE_ORDER_DESIGN_FEE,
      embroidery_price: 0,
      design_minutes: 0,
      stitch_minutes: 0,
      quantity: 1,
      personalization: 'One-time design fee for the bachelorette package',
      is_custom: false,
      custom_details: { orderDesignFee: true },
    });
  }

  const subtotal = resolved.reduce((sum, item) => (
    item.is_custom ? sum : sum + itemPrice({
      price: item.item_price,
      embroideryPrice: item.embroidery_price,
      wantsDesign: Number(item.embroidery_price) > 0,
    }) * item.quantity
  ), 0);

  const order = await createOrder({
    user_id: profile?.id || null,
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
  });
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
  await notifyNewOrder(order);
  return Response.json({ order });
}
