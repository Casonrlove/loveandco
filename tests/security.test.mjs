import assert from 'node:assert/strict';
import test from 'node:test';
import { readJsonBody, safeNextPath, validateSettings, validateSubmission } from '../lib/security.js';
import { isAdminProfile } from '../lib/admin.js';

test('auth redirects stay on the app origin', () => {
  for (const value of ['//evil.test', '/\\evil.test', '/\n/evil.test', 'https://evil.test', 'javascript:alert(1)', null, ['/studio']]) {
    assert.equal(safeNextPath(value), '/account');
  }
  assert.equal(safeNextPath('/studio?tab=orders'), '/studio?tab=orders');
});

test('notification recipients do not inherit admin access; allowlisted emails must be verified', () => {
  const old = { admin: process.env.ADMIN_EMAILS, notify: process.env.ADMIN_NOTIFICATION_EMAIL };
  try {
    process.env.ADMIN_EMAILS = 'owner@example.test';
    process.env.ADMIN_NOTIFICATION_EMAIL = 'notify@example.test';
    assert.equal(isAdminProfile({ email: 'notify@example.test', emailConfirmed: true }), false);
    assert.equal(isAdminProfile({ email: 'owner@example.test', emailConfirmed: false }), false);
    assert.equal(isAdminProfile({ email: 'owner@example.test', emailConfirmed: true }), true);
    assert.equal(isAdminProfile({ role: 'admin' }), true);
  } finally {
    for (const [key, value] of [['ADMIN_EMAILS', old.admin], ['ADMIN_NOTIFICATION_EMAIL', old.notify]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('checkout rejects invalid quantities and oversized submissions', () => {
  const body = { name: 'Customer', email: 'customer@example.test', items: [{ quantity: 1 }] };
  assert.equal(validateSubmission(body, { order: true }), '');
  for (const quantity of [-1, 0, 1.5, Infinity, 501, '2']) {
    assert.ok(validateSubmission({ ...body, items: [{ quantity }] }, { order: true }));
  }
  for (const patch of [{ name: ' ' }, { email: '%' }, { name: {} }, { customer_notes: 'x'.repeat(5001) }, { items: Array(51).fill({ quantity: 1 }) }]) {
    assert.ok(validateSubmission({ ...body, ...patch }, { order: true }));
  }
});

test('JSON reader limits actual bytes, including bodies without content-length', async () => {
  const request = (body, type = 'application/json') => new Request('https://app.test', { method: 'POST', headers: { 'content-type': type }, body });
  assert.deepEqual(await readJsonBody(request('{"name":"Customer"}')), { name: 'Customer' });
  await assert.rejects(readJsonBody(request('x'.repeat(100)), 20), { status: 413 });
  await assert.rejects(readJsonBody(request('null')), { status: 400 });
  await assert.rejects(readJsonBody(request('[]')), { status: 400 });
  await assert.rejects(readJsonBody(request('{bad')), { status: 400 });
  await assert.rejects(readJsonBody(request('{}', 'text/plain')), { status: 415 });
});

test('malformed design values cannot be persisted as render-breaking objects', () => {
  for (const patch of [{ threadColor: { attack: true } }, { bundleTheme: [] }, { nameVerified: 'true' }]) {
    assert.ok(validateSubmission({ name: 'Customer', email: 'customer@example.test', items: [{ quantity: 1, ...patch }] }, { order: true }));
  }
});

test('availability rejects impossible dates, unlimited sessions, and empty work weeks', () => {
  const settings = { workDays: [1, 3, 5], minutesPerSession: 180, daysOff: [] };
  assert.equal(validateSettings(settings), '');
  for (const patch of [{ workDays: [] }, { workDays: [8] }, { minutesPerSession: Infinity }, { daysOff: ['2026-02-31'] }]) assert.ok(validateSettings({ ...settings, ...patch }));
});


test('same-origin checks use the public Host and reject cross-site and opaque origins', async () => {
  const { isSameOriginRequest } = await import('../lib/security.js');
  assert.equal(isSameOriginRequest(new Headers({ host: '127.0.0.1:3101', origin: 'http://127.0.0.1:3101' }), 'http:'), true);
  for (const extra of [{ origin: 'https://evil.example' }, { origin: 'null' }, { origin: 'https://shop.example', 'sec-fetch-site': 'cross-site' }, { origin: 'http://shop.example' }]) {
    assert.equal(isSameOriginRequest(new Headers({ host: 'shop.example', ...extra }), 'https:'), false);
  }
});
