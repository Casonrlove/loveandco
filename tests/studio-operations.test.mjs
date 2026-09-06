import test from 'node:test';
import assert from 'node:assert/strict';
import { validateOrderPatch, validateWebsiteSettings, validateProduct, validateManualOrder, csvCell, customerSummaries } from '../lib/studio-operations.js';
const current = { items: [{ id: 'one' }] };
const item = { id: 'one', quantity: 2, item_price: 12.25, embroidery_price: 3, design_minutes: 10, stitch_minutes: 20 };
test('Studio quotes recalculate totals and reject cross-order items and sensitive ownership changes', () => {
  assert.equal(validateOrderPatch({ items: [item], subtotal: 1 }, current).subtotal, 30.5);
  for (const input of [{ email: 'other@example.com' }, { user_id: 'other' }, { items: [{ ...item, id: 'foreign' }] }, { items: [{ ...item, quantity: -1 }] }, { items: [{ ...item, stitch_minutes: 1.2 }] }, { payment_status: 'unknown' }]) assert.throws(() => validateOrderPatch(input, current), { status: 400 });
});
test('Website pause needs a clear message and bounded plain text', () => {
  assert.equal(validateWebsiteSettings({ ordersOpen: false, announcement: ' Hello ', pausedMessage: 'Back Monday' }).announcement, 'Hello');
  for (const input of [{ ordersOpen: 'false', announcement: '', pausedMessage: '' }, { ordersOpen: false, announcement: '', pausedMessage: '' }, { ordersOpen: true, announcement: 'x'.repeat(301), pausedMessage: '' }]) assert.throws(() => validateWebsiteSettings(input));
});
test('Exports neutralize formulas and escape quotes', () => {
  for (const value of ['=SUM(A1)', ' +1', '@cmd', '\t=cmd', '-1']) assert.ok(csvCell(value).startsWith('"\''));
  assert.equal(csvCell('a"b'), '"a""b"');
});
test('Customer history groups normalized emails and excludes refunded totals', () => {
  const customers = customerSummaries([{ email: 'A@example.com', name: 'A', payment_status: 'paid', subtotal: 12 }, { email: 'a@example.com', name: 'A', payment_status: 'refunded', subtotal: 10 }]);
  assert.equal(customers.length, 1); assert.equal(customers[0].orders.length, 2); assert.equal(customers[0].paid, 12);
});
test('Catalog and manual orders reject unsafe or invalid inputs', () => {
  const product = { name: 'Hat', slug: 'hat', category: 'baby', image_path: '/images/Logo.png' };
  validateProduct(product, ['baby']);
  for (const patch of [{ image_path: 'https://internal.test/image.png' }, { item_price: -1 }, { category: 'unknown' }]) assert.throws(() => validateProduct({ ...product, ...patch }, ['baby']));
  validateManualOrder({ name: 'A', email: 'a@example.com', item: 'Hat', price: 10, design_minutes: 0, stitch_minutes: 0 });
  assert.throws(() => validateManualOrder({ name: 'A', email: 'bad', item: 'Hat' }));
});
