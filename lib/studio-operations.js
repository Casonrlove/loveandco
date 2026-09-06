import { isProductPhoto, validateInfo } from './operations-utils.js';
export const paymentStatuses = ['unpaid', 'requested', 'paid', 'refunded'];
export const fulfillmentStatuses = ['pending_review', 'queued', 'started', 'shipped', 'complete', 'cancelled'];
export const orderContactFields = ['name', 'phone', 'venmo_username', 'address_line', 'address_line2', 'city', 'region', 'postal_code', 'customer_notes'];
const fail = (message) => { throw Object.assign(new Error(message), { status: 400 }); };
const numeric = (value, max = 1000000, integer = false) => value !== '' && value !== null && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= max && (!integer || Number.isInteger(Number(value)));

export function validateOrderPatch(input, current) {
  const allowed = [...orderContactFields, 'payment_status', 'fulfillment_status', 'priority', 'tracking_number', 'subtotal', 'items', 'staff_notes', 'delivery_method', 'carrier', 'pickup_instructions'];
  if (Object.keys(input).some((key) => !allowed.includes(key))) fail('This order field cannot be changed here.');
  const patch = { ...input };
  for (const key of [...orderContactFields, 'tracking_number', 'staff_notes', 'pickup_instructions']) {
    if (key in patch && (typeof patch[key] !== 'string' || patch[key].length > (key.includes('notes') ? 10000 : 500))) fail(`Check ${key.replaceAll('_', ' ')}.`);
  }
  if ('delivery_method' in patch && !['shipping', 'pickup'].includes(patch.delivery_method)) fail('Choose shipping or pickup.');
  if ('carrier' in patch && !['', 'usps', 'ups', 'fedex', 'dhl'].includes(patch.carrier)) fail('Choose a supported carrier.');
  if ('name' in patch && !patch.name.trim()) fail('Customer name is required.');
  if ('payment_status' in patch && !paymentStatuses.includes(patch.payment_status)) fail('Choose a valid payment status.');
  if ('fulfillment_status' in patch && !fulfillmentStatuses.includes(patch.fulfillment_status)) fail('Choose a valid order status.');
  if ('priority' in patch && !['standard', 'rush'].includes(patch.priority)) fail('Choose a valid priority.');
  if ('subtotal' in patch && !numeric(patch.subtotal)) fail('Enter a valid order total.');
  if ('subtotal' in patch) patch.subtotal = Number(patch.subtotal);
  if ('items' in patch) {
    if (!Array.isArray(patch.items) || !patch.items.length || patch.items.length !== current.items.length) fail('Save all existing order items.');
    const seen = new Set();
    patch.items = patch.items.map((item) => {
      if (!current.items.some((row) => row.id === item.id) || seen.has(item.id)) fail('An item does not belong to this order.');
      seen.add(item.id);
      const result = { id: item.id };
      for (const key of ['design_minutes', 'stitch_minutes', 'quantity', 'item_price', 'embroidery_price']) {
        const value = item[key] ?? 0;
        if (!numeric(value, key === 'quantity' ? 500 : 100000, ['quantity', 'design_minutes', 'stitch_minutes'].includes(key)) || (key === 'quantity' && Number(value) < 1)) fail('Check item quantities, prices, and production minutes.');
        result[key] = Number(value);
      }
      return result;
    });
    // The displayed quote always equals its saved line items.
    patch.subtotal = Math.round(patch.items.reduce((sum, item) => sum + (item.item_price + item.embroidery_price) * item.quantity, 0) * 100) / 100;
  }
  return patch;
}

export function validateWebsiteSettings(input) {
  if (typeof input.ordersOpen !== 'boolean') fail('Choose whether to accept new orders.');
  for (const [key, max] of [['announcement', 300], ['pausedMessage', 500]]) {
    if (typeof input[key] !== 'string' || input[key].length > max) fail('Keep the announcement under 300 characters and pause message under 500.');
  }
  if (!input.ordersOpen && !input.pausedMessage.trim()) fail('Add a message explaining when customers can order again.');
  return { ordersOpen: input.ordersOpen, announcement: input.announcement.trim(), pausedMessage: input.pausedMessage.trim(), info: validateInfo(input.info) };
}

export function csvCell(value) {
  let text = String(value ?? '');
  // Prevent spreadsheet formula execution, including leading whitespace.
  if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function ordersCsv(orders) {
  const rows = [['Order ID', 'Created', 'Customer', 'Email', 'Phone', 'Payment', 'Status', 'Total', 'Tracking'],
    ...orders.map((o) => [o.id, o.created_at, o.name, o.email, o.phone, o.payment_status, o.fulfillment_status, o.subtotal, o.tracking_number])];
  return '\ufeff' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}
export function customerSummaries(orders) {
  const customers = new Map();
  for (const order of orders) {
    const key = order.email.trim().toLowerCase();
    const customer = customers.get(key) || { email: key, name: order.name, phone: order.phone, orders: [], paid: 0 };
    customer.orders.push(order);
    if (order.payment_status === 'paid') customer.paid += Number(order.subtotal) || 0;
    customers.set(key, customer);
  }
  return [...customers.values()];
}

export function validateManualOrder(input) {
  for (const key of ['name', 'email', 'item']) if (typeof input[key] !== 'string' || !input[key].trim() || input[key].length > 500) fail('Customer, email, and item are required.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) fail('Enter a valid email address.');
  for (const key of ['price', 'design_minutes', 'stitch_minutes']) if (!numeric(input[key] === '' ? 0 : input[key], 100000, key !== 'price')) fail('Check the price and production minutes.');
  for (const key of ['phone', 'customer_notes']) if (input[key] !== undefined && (typeof input[key] !== 'string' || input[key].length > (key === 'phone' ? 500 : 10000))) fail('Check customer contact details.');
}

export function validateProduct(input, categories) {
  for (const key of ['name', 'slug', 'category']) if (typeof input[key] !== 'string' || !input[key].trim() || input[key].length > 200) fail('Name, URL name, and category are required.');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) fail('Use lowercase letters, numbers, and hyphens in the URL name.');
  if (!categories.includes(input.category)) fail('Choose a valid category.');
  if (input.detail !== undefined && (typeof input.detail !== 'string' || input.detail.length > 5000)) fail('Keep product details under 5,000 characters.');
  for (const key of ['item_price', 'embroidery_price', 'design_minutes', 'stitch_minutes', 'sort_order']) {
    const value = input[key] === '' ? 0 : input[key] ?? 0;
    if (!numeric(value, 100000, !key.includes('price'))) fail('Check product prices, minutes, and display order.');
  }
  if (input.active !== undefined && typeof input.active !== 'boolean') fail('Choose whether the product is visible.');
  const image = input.image_path || input.image || '/images/Logo.png';
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  if (!isProductPhoto(image, projectUrl)) fail('Choose a photo from the library or upload one.');
  if (input.photo_paths && (!Array.isArray(input.photo_paths) || input.photo_paths.length > 10 || input.photo_paths.some((photo) => !isProductPhoto(photo, projectUrl)))) fail('Choose up to 10 valid product photos.');
}
