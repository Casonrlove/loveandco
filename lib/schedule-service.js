import { unstable_cache } from 'next/cache';
import { getSettings, listSchedulingOrders, updatePromisedDate } from '@/lib/store';
import { createSchedule as buildSchedule, localDateKey, schedulableOrders, turnaround as buildTurnaround } from '@/lib/scheduler';

const project = process.env.NEXT_PUBLIC_SUPABASE_URL || 'local';

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

// Every storefront visit calls this, so cache briefly instead of rescanning the
// queue per request. The shop date is part of the key, so cached page HTML and
// this estimate never outlive the day they were calculated for.
const cachedPublicTurnaround = unstable_cache(
  (_shopDate) => loadPublicTurnaround(),
  ['public-turnaround', project],
  { revalidate: 60 },
);

export async function getFreshPublicTurnaround() {
  return cachedPublicTurnaround(localDateKey(new Date()));
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
