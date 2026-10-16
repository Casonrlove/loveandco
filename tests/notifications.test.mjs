import assert from 'node:assert/strict';
import { register } from 'node:module';
import test from 'node:test';

// lib/notifications.js imports the server-only marker, which throws outside a react-server build.
register('data:text/javascript,' + encodeURIComponent("export async function resolve(s, c, n) { return s === 'server-only' ? { url: 'data:text/javascript,', shortCircuit: true } : n(s, c); }"));
const { escapeHtml, renderEmail } = await import('../lib/notifications.js');

test('customer email HTML escapes every caller-supplied string', () => {
  assert.equal(escapeHtml('<a href="x">&</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
  const html = renderEmail({ heading: 'Hi <b>', lines: ['one', 'two <script>'], items: [{ quantity: 2, name: '<script>alert(1)</script>' }], total: 12.5, action: { href: 'https://x.test/a?b="c"', label: 'View your order' } });
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<b>'));
  assert.ok(html.includes('one<br>two &lt;script&gt;'));
  assert.ok(html.includes('2 × &lt;script&gt;'));
  assert.ok(html.includes('Subtotal before shipping: $12.50'));
  assert.ok(html.includes('href="https://x.test/a?b=&quot;c&quot;"'));
  assert.ok(html.includes('width="600"'));
});

test('order updates default the subject to the order number and link to the account', async () => {
  const saved = { fetch: globalThis.fetch, env: { ...process.env } };
  let sent;
  Object.assign(process.env, { RESEND_API_KEY: 'k', ADMIN_NOTIFICATION_EMAIL: 'a@x.test', NOTIFICATION_FROM_EMAIL: 'f@x.test', NEXT_PUBLIC_SITE_URL: 'https://shop.test' });
  globalThis.fetch = async (_url, init) => { sent = JSON.parse(init.body); return new Response('{}'); };
  try {
    const { notifyOrderUpdate } = await import('../lib/notifications.js');
    assert.equal((await notifyOrderUpdate({ id: 'abcdef1234', email: 'c@x.test', name: 'C' }, 'Hello')).status, 'sent');
    assert.equal(sent.subject, 'Love & Co. order #abcdef12');
    assert.ok(sent.text.includes('View your order: https://shop.test/account'));
    assert.ok(sent.html.includes('href="https://shop.test/account"'));
  } finally { globalThis.fetch = saved.fetch; process.env = saved.env; }
});
