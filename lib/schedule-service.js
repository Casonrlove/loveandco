import { cache } from 'react';
import { unstable_cache } from 'next/cache';
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

export async function refreshPromisedDates() {
  const { schedule, orders } = await getLiveSchedule();
  await Promise.all(orders.map((order) => {
    const result = schedule.results[order.id];
    if (!result?.completionDate || order.promised_on === result.completionDate) return null;
    if (order.payment_status !== 'paid') return null;
    return updatePromisedDate(order.id, result.completionDate);
  }));
}

export const getPublicTurnaround = cache(unstable_cache(loadPublicTurnaround, ['public-turnaround', process.env.NEXT_PUBLIC_SUPABASE_URL || 'local'], { revalidate: 300, tags: ['turnaround'] }));
