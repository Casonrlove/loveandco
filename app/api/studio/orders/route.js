import { jsonError, requireAdmin } from '@/lib/require-admin';
import { notifyNewOrder } from '@/lib/notifications';
import { refreshPromisedDates } from '@/lib/schedule-service';
import { createOrder, persistenceMode } from '@/lib/store';
import { hasSupabaseConfig } from '@/lib/supabase/config';

export async function POST(request) {
  try {
    if (hasSupabaseConfig() || persistenceMode() === 'none') await requireAdmin();
    const body = await request.json();
    if (!body.name || !body.email || !body.item) {
      return Response.json({ error: 'Customer, email, and item are required.' }, { status: 400 });
    }
    const order = await createOrder({
      email: String(body.email).trim(),
      name: String(body.name).trim(),
      payment_status: 'unpaid',
      fulfillment_status: 'pending_review',
      priority: body.priority === 'rush' ? 'rush' : 'standard',
      subtotal: Number(body.price) || 0,
      items: [{
        name: String(body.item).trim(),
        item_price: Number(body.price) || 0,
        embroidery_price: 0,
        design_minutes: Number(body.design_minutes) || 0,
        stitch_minutes: Number(body.stitch_minutes) || 30,
        quantity: 1,
        is_custom: true,
      }],
    });
    await refreshPromisedDates();
    await notifyNewOrder(order);
    return Response.json({ order });
  } catch (error) {
    return jsonError(error);
  }
}
