import { localDateKey } from './scheduler.js';

export function orderMinutes(order) {
  return (order.items || []).reduce((sum, item) => (
    sum + ((Number(item.design_minutes) || 0) + (Number(item.stitch_minutes) || 0)) * (Number(item.quantity) || 1)
  ), 0);
}

export function money(orders) {
  return orders.reduce((sum, order) => sum + (Number(order.subtotal) || 0), 0);
}

export function isOverdue(order, today = localDateKey(new Date())) {
  return Boolean(order.promised_on) && order.promised_on < today && !['complete', 'shipped', 'cancelled'].includes(order.fulfillment_status);
}

export function studioInsights(orders, schedule, settings) {
  const minutes = Number(settings.minutesPerSession) || 180;
  const review = orders.filter((order) => order.fulfillment_status === 'pending_review');
  const unpaid = orders.filter((order) => order.payment_status !== 'paid' && order.fulfillment_status !== 'cancelled' && order.fulfillment_status !== 'complete');
  const production = orders.filter((order) => order.payment_status === 'paid' && ['queued', 'started'].includes(order.fulfillment_status));
  const shipped = orders.filter((order) => order.fulfillment_status === 'shipped');
  const missingMinutes = production.filter((order) => orderMinutes(order) === 0);
  const bookedMinutes = (schedule.activeOrders || []).reduce((sum, order) => sum + (schedule.results[order.id]?.totalMinutes || 0), 0);
  const nextOpen = (schedule.sessions || []).find((session) => session.minutesRemaining >= minutes);
  const nextPartial = (schedule.sessions || []).find((session) => session.minutesRemaining > 0);
  const today = localDateKey(new Date());
  const weekSessions = (schedule.sessions || []).filter((session) => {
    const date = new Date(`${session.date}T12:00:00`);
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return date >= start && date < end;
  });
  const weekUsed = weekSessions.reduce((sum, session) => sum + (minutes - session.minutesRemaining), 0);
  const weekCap = weekSessions.length * minutes;
  const nightsOff = (settings.daysOff || []).filter((date) => date >= today).sort();

  return {
    review: review.length,
    unpaid: unpaid.length,
    production: production.length,
    shipped: shipped.length,
    missingMinutes: missingMinutes.length,
    bookedMinutes,
    nextOpen: nextOpen?.date || nextPartial?.date || null,
    nextOpenMinutes: nextOpen?.minutesRemaining || nextPartial?.minutesRemaining || 0,
    weekUsed,
    weekCap,
    weekPct: weekCap ? Math.round((weekUsed / weekCap) * 100) : 0,
    paidTotal: money(orders.filter((order) => order.payment_status === 'paid')),
    pendingTotal: money(unpaid),
    nightsOff,
    overdue: orders.filter((order) => isOverdue(order, today)).length,
    upcoming: (schedule.sessions || []).slice(0, 4),
  };
}

const shiftDay = (key, days) => {
  const date = new Date(`${key}T12:00:00`);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
};
const closed = (order) => ['complete', 'cancelled'].includes(order.fulfillment_status);
const byDate = (field) => (a, b) => String(a[field] || '').localeCompare(String(b[field] || ''));

export function dueThisWeek(orders, today = localDateKey(new Date())) {
  const end = shiftDay(today, 7); // exclusive: today plus the next six days
  return orders.filter((order) => order.promised_on && order.promised_on < end && !closed(order) && order.fulfillment_status !== 'shipped').sort(byDate('promised_on'));
}

export function venmoRequested(orders) {
  return orders.filter((order) => order.payment_status === 'requested' && !closed(order)).sort(byDate('created_at'));
}

export function awaitingPayment(orders) {
  return orders.filter((order) => order.payment_status === 'unpaid' && !closed(order)).sort(byDate('created_at'));
}

// ponytail: orders have no shipped_at, so updated_at stands in; a later edit to a shipped order moves it.
export function shippedThisWeek(orders, today = localDateKey(new Date())) {
  const start = shiftDay(today, -7);
  return orders.filter((order) => order.fulfillment_status === 'shipped' && localDateKey(new Date(order.updated_at || order.created_at)) > start).sort(byDate('updated_at')).reverse();
}
