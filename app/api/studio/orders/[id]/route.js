import { orderOperations } from '@/lib/operations-store';
import { validateOrderPatch } from '@/lib/studio-operations';
import { requireStudio } from '@/lib/studio-guard';
import { readJsonBody } from '@/lib/security';
import { jsonError } from '@/lib/require-admin';
import { notifyOrderUpdate } from '@/lib/notifications';
import { refreshPromisedDates } from '@/lib/schedule-service';
import { trackingUrl } from '@/lib/operations-utils';
import { formatDate } from '@/lib/scheduler';
import { getOrder, getOrderNotes, saveStudioOrder } from '@/lib/store';

function customerMessage(order, patch) {
  if (patch.fulfillment_status === 'cancelled') return 'Your order has been cancelled. Reply to this email if that’s unexpected.';
  if (patch.payment_status === 'refunded') return 'I’ve sent your Venmo refund. Reply to this email if you don’t see it.';
  if (patch.fulfillment_status === 'complete') return 'Your order is complete. Thank you for supporting Love & Co.';
  if (patch.payment_status === 'requested') return 'I’ve sent your Venmo request. Stitching starts once it’s paid.';
  if (patch.payment_status === 'paid') return `Your payment is confirmed, thank you. Your order is on my calendar${order.promised_on ? ` to be finished around ${formatDate(order.promised_on)}` : ''}.`;
  if (patch.fulfillment_status === 'started') return 'I’ve started stitching your order. I’ll email you again when it’s finished.';
  if (patch.fulfillment_status === 'shipped') {
    // The tracking link rides on the email's action button.
    return order.tracking_number ? `Your order has shipped. Tracking: ${order.tracking_number}` : 'Your order has shipped and is on its way to you.';
  }
  return '';
}

export async function PATCH(request, { params }) {
  try {
    const actor = await requireStudio();
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
    const target = next || order;
    const tracking = changed.fulfillment_status === 'shipped' && trackingUrl(target.carrier, target.tracking_number);
    const notification = message ? await notifyOrderUpdate(target, message, undefined, tracking ? { action: { href: tracking, label: 'Track your package' } } : {}) : { status: 'skipped' };
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
