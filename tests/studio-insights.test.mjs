import assert from 'node:assert/strict';
import test from 'node:test';
import { createSchedule, defaultSettings } from '../lib/scheduler.js';
import { awaitingPayment, dueThisWeek, orderMinutes, shippedThisWeek, studioInsights, venmoRequested } from '../lib/studio-insights.js';

test('counts review, unpaid, and missing minutes', () => {
  const orders = [
    { fulfillment_status: 'pending_review', payment_status: 'unpaid', subtotal: 20, items: [{ design_minutes: 0, stitch_minutes: 0, quantity: 1 }] },
    { fulfillment_status: 'queued', payment_status: 'paid', subtotal: 40, items: [{ design_minutes: 0, stitch_minutes: 0, quantity: 1 }] },
    { fulfillment_status: 'started', payment_status: 'paid', subtotal: 10, name: 'A', created_at: '2026-01-01', items: [{ design_minutes: 10, stitch_minutes: 20, quantity: 1 }] },
    { fulfillment_status: 'queued', payment_status: 'paid', subtotal: 10, name: 'B', promised_on: '2020-01-01', items: [{ design_minutes: 5, stitch_minutes: 5, quantity: 1 }] },
    { fulfillment_status: 'shipped', payment_status: 'paid', subtotal: 10, name: 'C', promised_on: '2020-01-01', items: [] },
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
  assert.equal(insights.overdue, 1);
  assert.equal(insights.unpaid, 1);
  assert.equal(insights.missingMinutes, 1);
  assert.equal(orderMinutes(orders[2]), 30);
  assert.equal(insights.pendingTotal, 20);
});

test('due this week keeps open orders due within seven days, soonest first', () => {
  const orders = [
    { id: 'late', fulfillment_status: 'queued', promised_on: '2026-10-10' },
    { id: 'later', fulfillment_status: 'started', promised_on: '2026-10-21' },
    { id: 'soon', fulfillment_status: 'pending_review', promised_on: '2026-10-16' },
    { id: 'far', fulfillment_status: 'queued', promised_on: '2026-10-23' },
    { id: 'done', fulfillment_status: 'complete', promised_on: '2026-10-16' },
    { id: 'gone', fulfillment_status: 'cancelled', promised_on: '2026-10-16' },
    { id: 'none', fulfillment_status: 'queued' },
  ];
  assert.deepEqual(dueThisWeek(orders, '2026-10-15').map((order) => order.id), ['late', 'soon', 'later']);
});

test('shipped this week uses the last update within seven days', () => {
  const orders = [
    { id: 'fresh', fulfillment_status: 'shipped', updated_at: '2026-10-14T15:00:00' },
    { id: 'old', fulfillment_status: 'shipped', updated_at: '2026-10-01T15:00:00' },
    { id: 'queued', fulfillment_status: 'queued', updated_at: '2026-10-14T15:00:00' },
  ];
  assert.deepEqual(shippedThisWeek(orders, '2026-10-15').map((order) => order.id), ['fresh']);
});

test('due this week includes day six and overdue work, not day seven, shipped, or undated', () => {
  const orders = [
    { id: 'seven', fulfillment_status: 'queued', promised_on: '2026-10-22' },
    { id: 'six', fulfillment_status: 'queued', promised_on: '2026-10-21' },
    { id: 'overdue', fulfillment_status: 'started', promised_on: '2026-09-01' },
    { id: 'shipped', fulfillment_status: 'shipped', promised_on: '2026-10-16' },
    { id: 'null', fulfillment_status: 'queued', promised_on: null },
  ];
  assert.deepEqual(dueThisWeek(orders, '2026-10-15').map((order) => order.id), ['overdue', 'six']);
});

test('Today payment lists split Venmo requests from unpaid orders, oldest first, open only', () => {
  const orders = [
    { id: 'v2', payment_status: 'requested', fulfillment_status: 'pending_review', created_at: '2026-10-14' },
    { id: 'v1', payment_status: 'requested', fulfillment_status: 'queued', created_at: '2026-10-10' },
    { id: 'vx', payment_status: 'requested', fulfillment_status: 'cancelled', created_at: '2026-10-01' },
    { id: 'u2', payment_status: 'unpaid', fulfillment_status: 'pending_review', created_at: '2026-10-12' },
    { id: 'u1', payment_status: 'unpaid', fulfillment_status: 'pending_review', created_at: '2026-10-02' },
    { id: 'ux', payment_status: 'unpaid', fulfillment_status: 'complete', created_at: '2026-10-01' },
    { id: 'paid', payment_status: 'paid', fulfillment_status: 'queued', created_at: '2026-10-01' },
  ];
  assert.deepEqual(venmoRequested(orders).map((order) => order.id), ['v1', 'v2']);
  assert.deepEqual(awaitingPayment(orders).map((order) => order.id), ['u1', 'u2']);
});
