import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveCheckoutOrder } from '../lib/checkout-order.js';
import { parseCart } from '../lib/cart.js';
import { parseCustomQuantity } from '../lib/custom-order.js';

const product = { id: 'hat', slug: 'hat', name: 'Hat', active: true, category: 'trucker-hats', item_price: 30, embroidery_price: 10, design_minutes: 15, stitch_minutes: 30 };

test('catalog identity and prices defeat forged cart slugs, categories, and fees', () => {
  const forged = { id: 'hat', quantity: 2, name: 'Cheap hat', slug: 'wedding-cocktail-napkins', category: 'baby-bundles', item_price: 1, embroideryPrice: 0 };
  const result = resolveCheckoutOrder([forged], [product]);
  assert.equal(result.subtotal, 60);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].name, 'Hat');
  assert.equal(result.items[0].stitch_minutes, 30);
  assert.equal(forged.slug, 'wedding-cocktail-napkins');
});

test('unknown and hidden products cannot be purchased', () => {
  assert.throws(() => resolveCheckoutOrder([{ id: 'missing', quantity: 1 }], [product]), { status: 400 });
  assert.throws(() => resolveCheckoutOrder([{ id: 'hat', quantity: 1 }], [{ ...product, active: false }]), { status: 400 });
});

test('custom requests stay unpriced and cannot inject production minutes or proof flags', () => {
  const result = resolveCheckoutOrder([{ id: 'custom', name: 'Custom request', isCustom: true, quantity: 12, stitch_minutes: 999999, embroideryPrice: 9999, custom_details: { type: 'home', details: 'Blue napkins', paid: true, quantity: '1' } }], []);
  assert.equal(result.subtotal, 0);
  assert.equal(result.items[0].stitch_minutes, 0);
  assert.equal(result.items[0].embroidery_price, 0);
  assert.equal(result.items[0].quantity, 12);
  assert.equal(result.items[0].custom_details.quantity, '12');
  assert.equal(result.items[0].custom_details.details, 'Blue napkins');
  assert.equal(result.items[0].custom_details.paid, undefined);
});

test('custom quantities are whole numbers from 1 through 500 throughout checkout', () => {
  assert.equal(parseCustomQuantity('1'), 1);
  assert.equal(parseCustomQuantity('500'), 500);
  for (const value of ['0', '-1', '501', '1.5', '']) assert.equal(parseCustomQuantity(value), null);
  for (const quantity of [0, 501, 2.5]) {
    assert.throws(() => resolveCheckoutOrder([{ id: 'custom', isCustom: true, quantity }], []), { status: 400 });
  }
});

test('cart hydration rejects malformed storage without breaking the page', () => {
  for (const value of ['null', '{}', 'bad', '[null]', '[{"id":"x","quantity":-1}]']) assert.deepEqual(parseCart(value), []);
  assert.equal(parseCart(JSON.stringify([{ id: 'hat', name: 'Hat', quantity: 2 }])).length, 1);
});
