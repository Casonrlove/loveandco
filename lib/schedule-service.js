import { getSettings, listOrders, updateOrder } from '@/lib/store';
import { createSchedule as buildSchedule, schedulableOrders, turnaround as buildTurnaround } from '@/lib/scheduler';

export async function getLiveSchedule() {
  const [settings, orders] = await Promise.all([
    getSettings(),
    listOrders({ includeAll: true }),
  ]);
  const schedule = buildSchedule(schedulableOrders(orders), settings);
  return { settings, orders, schedule, turnaround: buildTurnaround(schedule) };
}

export async function getPublicTurnaround() {
  try {
    return (await getLiveSchedule()).turnaround;
  } catch {
    return { label: 'Custom-made with care', detail: 'Current timing is confirmed with every order.' };
  }
}

export async function refreshPromisedDates() {
  const { schedule, orders } = await getLiveSchedule();
  await Promise.all(orders.map((order) => {
    const result = schedule.results[order.id];
    if (!result?.completionDate || order.promised_on === result.completionDate) return null;
    if (order.payment_status !== 'paid') return null;
    return updateOrder(order.id, { promised_on: result.completionDate });
  }));
}
