export const infoDefaults = { faqs: '', care: '', turnaroundPolicy: '', contactEmail: '', contactPhone: '', pickupEnabled: false, pickupInstructions: '' };
export function validateInfo(input = {}) {
  const result = { ...infoDefaults, ...input };
  for (const key of Object.keys(infoDefaults).filter((key) => key !== 'pickupEnabled')) {
    if (typeof result[key] !== 'string' || result[key].length > (key.startsWith('contact') ? 200 : key === 'pickupInstructions' ? 500 : 10000)) throw Object.assign(new Error('Check shop information lengths.'), { status: 400 });
  }
  if (result.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.contactEmail)) throw Object.assign(new Error('Enter a valid contact email.'), { status: 400 });
  if (typeof result.pickupEnabled !== 'boolean' || (result.pickupEnabled && !result.pickupInstructions.trim())) throw Object.assign(new Error('Add pickup instructions before enabling pickup.'), { status: 400 });
  return Object.fromEntries(Object.keys(infoDefaults).map((key) => [key, result[key]]));
}
export function trackingUrl(carrier, tracking) {
  if (!tracking) return null;
  const code = encodeURIComponent(tracking);
  return { usps: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${code}`, ups: `https://www.ups.com/track?tracknum=${code}`, fedex: `https://www.fedex.com/fedextrack/?trknbr=${code}`, dhl: `https://www.dhl.com/global-en/home/tracking.html?tracking-id=${code}` }[carrier] || null;
}
export function isProductPhoto(value, projectUrl = '') {
  if (typeof value !== 'string' || value.includes('..')) return false;
  if (/^\/(images|media)\/[a-zA-Z0-9_./ -]+\.(png|jpe?g|webp)$/i.test(value)) return true;
  if (/^\/api\/photos\/[a-f0-9-]{36}\.webp$/.test(value)) return true;
  try { const url = new URL(value); return url.origin === new URL(projectUrl).origin && /^\/storage\/v1\/object\/public\/product-photos\/[a-f0-9-]{36}\.webp$/.test(url.pathname) && !url.search; } catch { return false; }
}
export function canonicalJson(value) {
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().filter((key) => value[key] !== undefined).map((key) => JSON.stringify(key) + ':' + canonicalJson(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
