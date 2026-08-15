import { jsonError, requireAdmin } from '@/lib/require-admin';
import { notifyOrderUpdate } from '@/lib/notifications';
import { refreshPromisedDates } from '@/lib/schedule-service';
import { getOrder, persistenceMode, updateOrder } from '@/lib/store';
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
    if (hasSupabaseConfig() || persistenceMode() === 'none') await requireAdmin();
    const { id } = await params;
    const patch = await request.json();
    const current = await getOrder(id);
    if (!current) return Response.json({ error: 'Order not found.' }, { status: 404 });
    const order = await updateOrder(id, patch);
    await refreshPromisedDates();
    const next = await getOrder(id);
    const message = customerMessage(next || order, patch);
    if (message) await notifyOrderUpdate(next || order, message);
    return Response.json({ order: next || order });
  } catch (error) {
    return jsonError(error);
  }
}
