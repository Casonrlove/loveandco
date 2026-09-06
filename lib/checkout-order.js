import { NAPKIN_ORDER_DESIGN_FEE, PACKAGE_ORDER_DESIGN_FEE, designFee, isBabyBundle, isPerPersonPackage, isTieredNapkins, itemPrice, napkinUnitPrice, selectedBundleAddons } from './catalog.js';
import { buildDesignProof, summarizeDesign, validateDesignItem } from './design-options.js';

export function resolveCheckoutOrder(submittedItems, products, submittedAt = new Date().toISOString()) {
  const items = submittedItems.map((item) => ({ ...item }));
  const byId = new Map(products.map((product) => [product.id, product]));
  const resolved = [];
  for (const [index, submittedItem] of items.entries()) {
    let item = submittedItem;
    const productId = item.productId || (!String(item.id || '').includes('::') ? item.id : String(item.id).split('::')[0]);
    const product = item.isCustom || item.is_custom ? null : byId.get(productId);
    if (!(item.isCustom || item.is_custom) && (!product || !product.active)) {
      throw Object.assign(new Error('An item is no longer available. Remove it from your bag and try again.'), { status: 400 });
    }
    // Product identity and prices always come from the catalog, never the cart.
    item = product
      ? { ...item, ...product, quantity: item.quantity, isCustom: false, is_custom: false }
      : { ...item, slug: '', category: 'custom', embroideryPrice: 0, embroidery_price: 0, isCustom: true };
    items[index] = item;
    if (isTieredNapkins(item) && item.quantity < 10) {
      throw Object.assign(new Error('Cocktail napkins require at least 10 pieces.'), { status: 400 });
    }
    const wantsDesign = Boolean(item.wantsDesign || item.isCustom || item.is_custom || item.category === 'baby-bundles' || isPerPersonPackage(item) || isTieredNapkins(item) || item.slug === 'monogram-towel');
    const designError = validateDesignItem(item);
    if (designError) {
      throw Object.assign(new Error(designError), { status: 400 });
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
      stitch_minutes: product?.stitch_minutes || 0,
      quantity: Number(item.quantity) || 1,
      personalization: designText,
      is_custom: Boolean(item.isCustom || item.is_custom || !product),
      custom_details: {
        ...(item.isCustom ? Object.fromEntries(['type', 'item', 'quantity', 'color', 'personalization', 'details', 'neededBy'].map((key) => [key, String(item.custom_details?.[key] || '').slice(0, 5000)])) : {}),
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

  return { items: resolved, subtotal };
}
