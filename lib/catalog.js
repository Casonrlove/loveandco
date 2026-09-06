export const CATEGORIES = [
  { id: 'trucker-hats', name: 'Trucker Hats', detail: 'Easygoing, embroidered favorites for every day.', image: '/images/shop/trucker-hats/do-small-things.jpg', shopPath: '/shop/trucker-hats' },
  { id: 'home-gift', name: 'Home & Gift', detail: 'Thoughtful finishing touches for home and gifting.', image: '/images/shop/home-gift/monogram-towel-2.jpg', shopPath: '/shop/home-gift' },
  { id: 'baby', name: 'Baby', detail: 'Sweet keepsakes for the newest little love.', image: '/images/shop/baby/baby-3.jpg', shopPath: '/shop/baby' },
  { id: 'baby-bundles', name: 'Baby Bundles', detail: 'The Keepsake, Signature, and Heirloom Bundles — curated sets for celebrating.', image: '/images/shop/baby-bundles/simple-baby-bundle.jpg', shopPath: '/shop/baby-bundles' },
  { id: 'clothing', name: 'Clothing', detail: 'Embroidered apparel, made to wear and keep.', image: '/images/shop/clothing/he-is-faithful.jpg', shopPath: '/shop/clothing' },
  { id: 'preorder', name: 'Preorder', detail: 'Pieces you can reserve before they arrive.', image: '/images/shop/preorder/santa-bags-1.jpg', shopPath: '/shop/preorder', preorder: true },
  { id: 'wedding', name: 'Wedding', detail: 'Embroidered pieces for the day and the years after.', image: '/images/shop/wedding/bachelorette-package.jpg', shopPath: '/shop/wedding' },
];

export const SHOP_COLLECTIONS = CATEGORIES
  .filter((category) => !category.preorder)
  .slice()
  .sort((left, right) => left.name.localeCompare(right.name));
export const PREORDER_CATEGORY = CATEGORIES.find((category) => category.preorder);
export const CUSTOM_CATEGORY = {
  id: 'custom',
  name: 'Custom',
  detail: 'Have a special idea in mind? Let’s make it real.',
  image: '/images/Gift_4.jpg',
  shopPath: '/shop/custom',
  custom: true,
};
export const SHOP_HUB = CATEGORIES.slice().sort((left, right) => left.name.localeCompare(right.name));

export const FAVORITE_SLUGS = [
  'do-small-things',
  'bachelorette-package',
  'bags',
  'he-is-faithful',
  'airplane-bubble',
  'wedding-cocktail-napkins',
  'lake-it-easy',
  'custom-bachelorette-hats',
];

export const CUSTOM_TYPES = {
  apparel: { label: 'Apparel', items: ['T-shirt', 'Sweatshirt', 'Jacket', 'Other'] },
  baby: { label: 'Baby', items: ['Onesie', 'Swaddle', 'Blanket', 'Other'] },
  home: { label: 'Home & Gift', items: ['Napkins', 'Hand towel', 'Pillow', 'Other'] },
  accessories: { label: 'Accessories', items: ['Hat', 'Tote bag', 'Pouch', 'Other'] },
  other: { label: 'Other', items: ['Other'] },
};

export const PRODUCT_IMAGES = [
  '/images/IMG_4472.jpg',
  '/images/Home_1.PNG',
  '/images/Home_2.PNG',
  '/images/Home_3.PNG',
  '/images/Baby_1.PNG',
  '/images/Baby_2.PNG',
  '/images/Baby_4.png',
  '/images/Gift_1.PNG',
  '/images/Gift_3.PNG',
  '/images/Gift_4.jpg',
  '/images/Scroll_1.jpg',
  '/images/Scroll_2.jpg',
  '/images/Scroll_3.jpg',
  '/images/Logo.png',
];

export const CART_KEY = 'love-and-co-cart-v1';
export const CART_EVENT = 'love-and-co-cart-updated';

export function isTieredNapkins(item) {
  return item?.slug === 'wedding-cocktail-napkins';
}

export function napkinUnitPrice(quantity) {
  const qty = Number(quantity) || 10;
  if (qty >= 60) return 8;
  if (qty >= 40) return 9;
  if (qty >= 20) return 10;
  return 12;
}

export const NAPKIN_QTY_OPTIONS = Array.from({ length: 91 }, (_, index) => {
  const count = index + 10;
  return { value: String(count), label: String(count) };
});

export const NAPKIN_ORDER_DESIGN_FEE = 30;
export const NAPKIN_MIN_QTY = 10;

export function basePrice(item) {
  if (isTieredNapkins(item)) return napkinUnitPrice(item.quantity);
  return Number(item.price || item.item_price || 0);
}

export function isMonogramTowel(item) {
  return item?.slug === 'monogram-towel';
}

export function isBabyBundle(item) {
  return item?.category === 'baby-bundles';
}

export const ADDON_MAX_QTY = 8;

/** Extra embroidered pieces for baby bundles.
 *  Prices cover the Blanks Boutique blank plus stitch:
 *  outfit (onesie/sleeper blank $5.25–$7.99) → $22
 *  bib / burp cloth (blank $3.85–$4.05) → $12
 *  paci clip (not sold at Blanks Boutique; clip + stitch) → $14
 */
export const BUNDLE_ADDONS = [
  { id: 'outfit', label: 'Additional outfit', price: 22 },
  { id: 'burp', label: 'Additional burp cloth', price: 12 },
  { id: 'bib', label: 'Additional bib', price: 12 },
  { id: 'paci', label: 'Additional paci clip', price: 14 },
];

export const ADDON_QTY_OPTIONS = Array.from({ length: ADDON_MAX_QTY + 1 }, (_, count) => ({
  value: String(count),
  label: count === 0 ? 'None' : String(count),
}));

export function emptyBundleAddons() {
  return Object.fromEntries(BUNDLE_ADDONS.map((addon) => [addon.id, 0]));
}

export function normalizeBundleAddons(item) {
  const source = item?.bundleAddons && typeof item.bundleAddons === 'object' ? item.bundleAddons : {};
  return Object.fromEntries(BUNDLE_ADDONS.map((addon) => {
    const count = Math.floor(Number(source[addon.id]) || 0);
    return [addon.id, Math.max(0, Math.min(ADDON_MAX_QTY, count))];
  }));
}

export function addonQty(item, id) {
  return normalizeBundleAddons(item)[id] || 0;
}

export function addonTotal(item) {
  if (!isBabyBundle(item) && !item?.bundleAddons) return 0;
  return BUNDLE_ADDONS.reduce((sum, addon) => sum + addon.price * addonQty(item, addon.id), 0);
}

export function selectedBundleAddons(item) {
  return BUNDLE_ADDONS
    .map((addon) => {
      const quantity = addonQty(item, addon.id);
      if (!quantity) return null;
      return { ...addon, quantity, total: addon.price * quantity };
    })
    .filter(Boolean);
}

export function summarizeBundleAddons(item) {
  return selectedBundleAddons(item)
    .map((addon) => `${addon.label} × ${addon.quantity} · $${addon.total.toFixed(2)}`)
    .join('\n');
}

export function requiresCustomization(item) {
  return isBabyBundle(item) || isPerPersonPackage(item) || isTieredNapkins(item) || isMonogramTowel(item);
}

export function isPerPersonPackage(item) {
  return item?.slug === 'bachelorette-package';
}

export const PEOPLE_OPTIONS = Array.from({ length: 20 }, (_, index) => {
  const count = index + 1;
  return { value: String(count), label: count === 1 ? '1 person' : `${count} people` };
});

export function designFee(item) {
  if (requiresCustomization(item)) return 0;
  return Number(item.embroideryPrice || item.embroidery_price || 0);
}

export function itemPrice(item) {
  if (item?.isCustom || item?.is_custom) return 0;
  return basePrice(item) + (item?.wantsDesign ? designFee(item) : 0);
}

export function lineTotal(item) {
  return itemPrice(item) * (Number(item.quantity) || 1) + addonTotal(item);
}

export const PACKAGE_ORDER_DESIGN_FEE = 20;

export function orderDesignFee(items) {
  let fee = 0;
  if ((items || []).some(isPerPersonPackage)) fee += PACKAGE_ORDER_DESIGN_FEE;
  if ((items || []).some(isTieredNapkins)) fee += NAPKIN_ORDER_DESIGN_FEE;
  return fee;
}

export function cartTotal(items) {
  const lines = (items || []).reduce((sum, item) => sum + lineTotal(item), 0);
  return lines + orderDesignFee(items);
}

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || `item-${Date.now()}`;
}

export function categoryById(id) {
  if (id === CUSTOM_CATEGORY.id) return CUSTOM_CATEGORY;
  return CATEGORIES.find((category) => category.id === id) || null;
}

export const PRODUCT_GALLERIES = {
  bags: ['/images/shop/home-gift/bags.jpg', '/images/shop/home-gift/bags-2.jpg'],
  'santa-bags': [
    '/images/shop/preorder/santa-bags-1.jpg',
    '/images/shop/preorder/santa-bags-2.jpg',
    '/images/shop/preorder/santa-bags-3.jpg',
  ],
  'monogram-towel': [
    '/images/shop/home-gift/monogram-towel.jpg',
    '/images/shop/home-gift/monogram-towel-2.jpg',
  ],
  'wedding-cocktail-napkins': [
    '/images/shop/wedding/cocktail-napkins-1.jpg',
    '/images/shop/wedding/cocktail-napkins-2.jpg',
    '/images/shop/wedding/cocktail-napkins-3.jpg',
  ],
};

export function productImages(product) {
  if (product?.photo_paths?.length) return product.photo_paths;
  const extras = product?.images?.length ? product.images : PRODUCT_GALLERIES[product?.slug] || [];
  return [...new Set([product?.image || product?.image_path, ...extras].filter(Boolean))];
}

export function findProduct(products, key) {
  if (!key) return null;
  return (products || []).find((item) => item.slug === key || item.id === key) || null;
}

export function productHref(product) {
  if (!product) return '/shop';
  return `/shop/${product.category}/${product.slug || product.id}`;
}

