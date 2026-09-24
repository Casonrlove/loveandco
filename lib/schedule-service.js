import { getSettings, listSchedulingOrders, updatePromisedDate } from '@/lib/store';
import { createSchedule as buildSchedule, schedulableOrders, turnaround as buildTurnaround } from '@/lib/scheduler';

export async function getLiveSchedule() {
  const [settings, orders] = await Promise.all([
    getSettings(),
    listSchedulingOrders(),
  ]);
  const schedule = buildSchedule(schedulableOrders(orders), settings);
  return { settings, orders, schedule, turnaround: buildTurnaround(schedule) };
}

async function loadPublicTurnaround() {
  try {
    return (await getLiveSchedule()).turnaround;
  } catch {
    return { label: 'Custom-made with care', detail: 'Current timing is confirmed with every order.' };
  }
}

// Called by the uncached public endpoint so clients can replace cached HTML
// timing with a date calculated for the current request.
export async function getFreshPublicTurnaround() {
  return loadPublicTurnaround();
}

export async function refreshPromisedDates() {
  const { schedule, orders } = await getLiveSchedule();
  await Promise.all(orders.map((order) => {
    const result = schedule.results[order.id];
    if (!result?.completionDate || order.promised_on === result.completionDate) return null;
    if (order.payment_status !== 'paid') return null;
    return updatePromisedDate(order.id, result.completionDate);
  }));
}
