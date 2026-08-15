import assert from 'node:assert/strict';
import test from 'node:test';
import { splitCartLine, splitCartLineAll } from '../lib/cart.js';

const hats = [
  { id: 'hat', name: 'Trucker', quantity: 3, wantsDesign: true, designName: 'Eleanor', nameVerified: true },
];

test('splits some of a multiple onto a new line with a blank design', () => {
  let ids = 0;
  const next = splitCartLine(hats, 'hat', 1, { createId: () => `new-${++ids}` });
  assert.equal(next.length, 2);
  assert.equal(next[0].quantity, 2);
  assert.equal(next[0].designName, 'Eleanor');
  assert.equal(next[1].quantity, 1);
  assert.equal(next[1].id, 'hat::new-1');
  assert.equal(next[1].productId, 'hat');
  assert.equal(next[1].wantsDesign, true);
  assert.equal(next[1].designName, '');
  assert.equal(next[1].nameVerified, false);
});

test('does not split a single piece', () => {
  assert.deepEqual(splitCartLine([{ id: 'hat', quantity: 1 }], 'hat', 1), [{ id: 'hat', quantity: 1 }]);
});

test('splits every remaining piece onto its own line', () => {
  let ids = 0;
  const next = splitCartLineAll(hats, 'hat', { createId: () => `n${++ids}` });
  assert.equal(next.length, 3);
  assert.deepEqual(next.map((item) => item.quantity), [1, 1, 1]);
  assert.equal(next[0].designName, 'Eleanor');
  assert.equal(next[1].designName, '');
  assert.equal(next[2].designName, '');
});
