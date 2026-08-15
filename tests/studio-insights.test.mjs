import assert from 'node:assert/strict';
import test from 'node:test';
import { createSchedule, defaultSettings } from '../lib/scheduler.js';
import { orderMinutes, studioInsights } from '../lib/studio-insights.js';

test('counts review, unpaid, and missing minutes', () => {
  const orders = [
    { fulfillment_status: 'pending_review', payment_status: 'unpaid', subtotal: 20, items: [{ design_minutes: 0, stitch_minutes: 0, quantity: 1 }] },
    { fulfillment_status: 'queued', payment_status: 'paid', subtotal: 40, items: [{ design_minutes: 0, stitch_minutes: 0, quantity: 1 }] },
    { fulfillment_status: 'started', payment_status: 'paid', subtotal: 10, name: 'A', created_at: '2026-01-01', items: [{ design_minutes: 10, stitch_minutes: 20, quantity: 1 }] },
  ];
  const schedule = createSchedule(orders.filter((order) => order.payment_status === 'paid').map((order) => ({
    id: order.name || 'x',
    customer: order.name || 'x',
    designMinutes: 10,
    stitchMinutes: 20,
    priority: 'standard',
    createdAt: '2026-01-01',
    status: 'queued',
  })), defaultSettings);
  const insights = studioInsights(orders, schedule, defaultSettings);
  assert.equal(insights.review, 1);
  assert.equal(insights.unpaid, 1);
  assert.equal(insights.missingMinutes, 1);
  assert.equal(orderMinutes(orders[2]), 30);
  assert.equal(insights.pendingTotal, 20);
});
