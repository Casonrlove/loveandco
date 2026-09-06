import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalJson, isProductPhoto, trackingUrl, validateInfo } from '../lib/operations-utils.js';
test('Checkout fingerprints remain stable across object property order', () => { assert.equal(canonicalJson({ b: [2,1], a: { y: 1, x: 2 } }), canonicalJson({ a: { x: 2, y: 1 }, b: [2,1] })); assert.notEqual(canonicalJson([1,2]), canonicalJson([2,1])); });
test('Product photos allow only the local library or the project public photo bucket', () => {
  const project='https://example.supabase.co';
  assert.equal(isProductPhoto('/images/Logo.png'),true);
  assert.equal(isProductPhoto(project+'/storage/v1/object/public/product-photos/00000000-0000-4000-8000-000000000000.webp',project),true);
  for(const url of ['https://evil.example/image.webp','/images/../secret.png','javascript:alert(1)',project+'/storage/v1/object/public/private/photo.webp']) assert.equal(isProductPhoto(url,project),false);
});
test('Carrier links encode tracking input and do not accept arbitrary redirects', () => { assert.ok(trackingUrl('ups','a&next=evil').includes('a%26next%3Devil')); assert.equal(trackingUrl('evil','123'),null); });
test('Shop information is bounded and pickup requires instructions', () => { assert.throws(()=>validateInfo({pickupEnabled:true})); assert.throws(()=>validateInfo({contactEmail:'not-email'})); assert.equal(validateInfo({pickupEnabled:true,pickupInstructions:'By appointment'}).pickupEnabled,true); assert.equal(validateInfo({secret:'no'}).secret,undefined); });
