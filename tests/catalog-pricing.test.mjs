import assert from 'node:assert/strict';
import test from 'node:test';
import { addonTotal, lineTotal, napkinUnitPrice, orderDesignFee } from '../lib/catalog.js';

test('wedding napkin unit prices follow quantity tiers', () => {
  assert.equal(napkinUnitPrice(10), 12);
  assert.equal(napkinUnitPrice(19), 12);
  assert.equal(napkinUnitPrice(20), 10);
  assert.equal(napkinUnitPrice(39), 10);
  assert.equal(napkinUnitPrice(40), 9);
  assert.equal(napkinUnitPrice(59), 9);
  assert.equal(napkinUnitPrice(60), 8);
  assert.equal(napkinUnitPrice(80), 8);
});

test('napkin and package design fees stack once per order', () => {
  assert.equal(orderDesignFee([{ slug: 'wedding-cocktail-napkins' }]), 30);
  assert.equal(orderDesignFee([{ slug: 'bachelorette-package' }]), 20);
  assert.equal(orderDesignFee([
    { slug: 'wedding-cocktail-napkins' },
    { slug: 'bachelorette-package' },
  ]), 50);
});

test('baby bundle add-ons follow Blanks Boutique plus stitch prices', () => {
  const bundle = {
    category: 'baby-bundles',
    price: 75,
    bundleAddons: { outfit: 1, burp: 2, bib: 1, paci: 1 },
  };
  assert.equal(addonTotal(bundle), 22 + 24 + 12 + 14);
  assert.equal(lineTotal({ ...bundle, quantity: 1 }), 75 + 72);
  assert.equal(lineTotal({ ...bundle, quantity: 2 }), 150 + 72);
  assert.equal(addonTotal({ category: 'baby-bundles', bundleAddons: {} }), 0);
});
