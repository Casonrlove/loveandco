import assert from 'node:assert/strict';
import test from 'node:test';
import { addonTotal, cartTotal, designFee, lineTotal, napkinUnitPrice, orderDesignFee, priceLabel, productImages } from '../lib/catalog.js';

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
  assert.equal(addonTotal(bundle), 22 + 24 + 12 + 6);
  assert.equal(lineTotal({ ...bundle, quantity: 1 }), 75 + 64);
  assert.equal(lineTotal({ ...bundle, quantity: 2 }), 150 + 64);
  assert.equal(addonTotal({ category: 'baby-bundles', bundleAddons: {} }), 0);
});

test('cartTotal adds the design fee only when wantsDesign is set', () => {
  const hat = { slug: 'hat', price: 30, embroideryPrice: 10, quantity: 2 };
  assert.equal(cartTotal([hat]), 60);
  assert.equal(cartTotal([{ ...hat, wantsDesign: true }]), 80);
  assert.equal(designFee({ slug: 'monogram-towel', price: 25, embroideryPrice: 10 }), 0);
  assert.equal(cartTotal([{ slug: 'monogram-towel', price: 25, embroideryPrice: 10, wantsDesign: true, quantity: 1 }]), 25);
});

test('napkin price label names the design fee', () => {
  assert.match(priceLabel({ slug: 'wedding-cocktail-napkins', price: 12 }), /\$30 design fee/);
  assert.equal(priceLabel({ slug: 'hat', price: 30 }), '$30.00');
});

test('per-person package label names the $20 design fee', () => {
  assert.equal(priceLabel({ slug: 'bachelorette-package', price: 45 }), '$45.00 / person · $20 design fee');
});

test('napkin line totals switch tier exactly at 20, 40, and 60', () => {
  const napkins = (quantity) => lineTotal({ slug: 'wedding-cocktail-napkins', quantity });
  assert.deepEqual([19, 20, 39, 40, 59, 60].map(napkins), [228, 200, 390, 360, 531, 480]);
});

test('mixed bag adds each order fee once and leaves custom quotes at zero', () => {
  const bag = [
    { slug: 'wedding-cocktail-napkins', quantity: 40 },
    { slug: 'bachelorette-package', price: 45, embroideryPrice: 10, wantsDesign: true, quantity: 4 },
    { category: 'baby-bundles', price: 75, quantity: 1, bundleAddons: { outfit: 1, paci: 2 } },
    { isCustom: true, price: 99, quantity: 3 },
  ];
  assert.deepEqual(bag.map(lineTotal), [360, 180, 109, 0]);
  assert.equal(cartTotal(bag), 360 + 180 + 109 + 20 + 30);
});

test('productImages prefers uploads, then the main image, then the gallery, without repeats', () => {
  assert.deepEqual(productImages({ photo_paths: ['/p.webp'], image: '/a.jpg' }), ['/p.webp']);
  assert.deepEqual(productImages({ photo_paths: [], image_path: '/a.jpg', images: ['/b.jpg', '/a.jpg'] }), ['/a.jpg', '/b.jpg']);
  assert.deepEqual(productImages({ slug: 'monogram-towel', image: '/images/shop/home-gift/monogram-towel.jpg' }), [
    '/images/shop/home-gift/monogram-towel.jpg',
    '/images/shop/home-gift/monogram-towel-2.jpg',
  ]);
  assert.deepEqual(productImages(null), []);
});
