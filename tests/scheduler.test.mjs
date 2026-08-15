import test from 'node:test';
import assert from 'node:assert/strict';
import { addBusinessDays, createSchedule, defaultSettings, formatDate, schedulableOrders, turnaround } from '../lib/scheduler.js';

test('packs design then stitch onto Mon/Wed/Fri sessions', () => {
  const schedule = createSchedule([{
    id: 'one',
    customer: 'Anna',
    designMinutes: 60,
    stitchMinutes: 180,
    priority: 'standard',
    createdAt: '2026-01-01',
    status: 'queued',
  }], defaultSettings);

  assert.equal(schedule.activeOrders.length, 1);
  assert.ok(schedule.results.one.completionDate);
  assert.equal(schedule.results.one.totalMinutes, 240);
});

test('ignores unpaid work when mapping shop orders', () => {
  const mapped = schedulableOrders([
    { id: 'unpaid', payment_status: 'unpaid', fulfillment_status: 'pending_review', items: [{ design_minutes: 30, stitch_minutes: 30, quantity: 1 }] },
    { id: 'paid', name: 'Sam', payment_status: 'paid', fulfillment_status: 'queued', created_at: '2026-01-02', items: [{ name: 'Hat', design_minutes: 15, stitch_minutes: 45, quantity: 1 }] },
  ]);
  assert.equal(mapped.length, 1);
  assert.equal(mapped[0].id, 'paid');
  assert.equal(mapped[0].designMinutes, 15);
});

test('empty queue defaults to 10 business days', () => {
  const message = turnaround({ activeOrders: [], results: {} });
  assert.match(message.label, /Ready by/);
  assert.match(message.detail, /shipping/i);
  const expected = addBusinessDays(new Date(), 10);
  assert.ok(message.label.includes(formatDate(expected)));
});

test('turnaround uses the last queued paid order', () => {
  const schedule = createSchedule([
    { id: 'a', customer: 'A', designMinutes: 30, stitchMinutes: 30, priority: 'standard', createdAt: '2026-01-01', status: 'queued' },
    { id: 'b', customer: 'B', designMinutes: 30, stitchMinutes: 30, priority: 'standard', createdAt: '2026-01-02', status: 'queued' },
  ], defaultSettings);
  const message = turnaround(schedule);
  assert.match(message.label, /Ready by/);
});
