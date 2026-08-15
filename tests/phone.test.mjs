import assert from 'node:assert/strict';
import test from 'node:test';
import { formatPhoneInput } from '../lib/phone.js';

test('inserts hyphens while typing a US number', () => {
  assert.equal(formatPhoneInput('5'), '5');
  assert.equal(formatPhoneInput('555'), '555');
  assert.equal(formatPhoneInput('5551'), '555-1');
  assert.equal(formatPhoneInput('555123'), '555-123');
  assert.equal(formatPhoneInput('5551234'), '555-123-4');
  assert.equal(formatPhoneInput('5551234567'), '555-123-4567');
});

test('formats autofill and pasted values', () => {
  assert.equal(formatPhoneInput('5551234567'), '555-123-4567');
  assert.equal(formatPhoneInput('(555) 123-4567'), '555-123-4567');
  assert.equal(formatPhoneInput('1-555-123-4567'), '555-123-4567');
  assert.equal(formatPhoneInput('+1 555 123 4567'), '555-123-4567');
});
