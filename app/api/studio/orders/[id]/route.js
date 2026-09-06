import { orderOperations } from '@/lib/operations-store';
import { validateOrderPatch } from '@/lib/studio-operations';
import { requireStudio } from '@/lib/studio-guard';
import { revalidateTag } from 'next/cache';
import { readJsonBody } from '@/lib/security';
import { jsonError, requireAdmin } from '@/lib/require-admin';
import { notifyOrderUpdate } from '@/lib/notifications';
import { refreshPromisedDates } from '@/lib/schedule-service';
import { getOrder, getOrderNotes, persistenceMode, saveStudioOrder } from '@/lib/store';
import { hasSupabaseConfig } from '@/lib/supabase/config';

function customerMessage(order, patch) {
  if (patch.payment_status === 'requested') return 'I’ve sent your Venmo request. Production begins after payment is received.';
  if (patch.payment_status === 'paid') return `Payment is confirmed. Your project is on the production calendar${order.promised_on ? ` for completion around ${order.promised_on}` : ''}.`;
  if (patch.fulfillment_status === 'started') return 'I’ve started your order.';
  if (patch.fulfillment_status === 'shipped') return order.tracking_number ? `Your order has shipped. Tracking: ${order.tracking_number}` : 'Your order has shipped.';
  if (patch.fulfillment_status === 'complete') return 'Your order is complete. Thank you for supporting Love & Co.';
  return '';
}

export async function PATCH(request, { params }) {
  try {
    const actor = (hasSupabaseConfig() || persistenceMode() === 'none') ? await requireAdmin() : null;
    const { id } = await params;
    const body = await readJsonBody(request);
    const current = await getOrder(id);
    if (!current) return Response.json({ error: 'Order not found.' }, { status: 404 });
    const patch = validateOrderPatch(body, current);
    const order = await saveStudioOrder(id, patch, actor?.email || 'Local studio');
    const changesSchedule = ['payment_status', 'fulfillment_status', 'priority'].some((key) => key in patch && patch[key] !== current[key]) || (patch.items || []).some((item) => {
      const previous = current.items.find((row) => row.id === item.id);
      return ['design_minutes', 'stitch_minutes', 'quantity'].some((key) => Number(item[key]) !== Number(previous[key]));
    });
    let warning = '';
    let next = order;
    if (changesSchedule) {
      try { await refreshPromisedDates(); next = await getOrder(id); }
      catch { warning = 'Order saved, but the production calendar could not refresh. Review availability before promising a completion date.'; }
    }
    const changed = Object.fromEntries(Object.entries(patch).filter(([key, value]) => value !== current[key]));
    const message = warning ? '' : customerMessage(next || order, changed);
    const notification = message ? await notifyOrderUpdate(next || order, message) : { status: 'skipped' };
    if (changesSchedule) revalidateTag('turnaround', 'max');
    return Response.json({ order: next || order, notification, warning });
  } catch (error) {
    return jsonError(error);
  }
}

export async function GET(request, { params }) {
  try {
    await requireStudio();
    const { id } = await params;
    const order = await getOrder(id);
    if (!order) return Response.json({ error: 'Order not found.' }, { status: 404 });
    return Response.json({ order, staffNotes: await getOrderNotes(id), ...await orderOperations(id) });
  } catch (error) { return jsonError(error); }
}
