import { validateManualOrder } from '@/lib/studio-operations';
import { revalidateTag } from 'next/cache';
import { readJsonBody } from '@/lib/security';
import { jsonError, requireAdmin } from '@/lib/require-admin';
import { notifyNewOrder } from '@/lib/notifications';
import { createOrder, persistenceMode } from '@/lib/store';
import { hasSupabaseConfig } from '@/lib/supabase/config';

export async function POST(request) {
  try {
    if (hasSupabaseConfig() || persistenceMode() === 'none') await requireAdmin();
    const body = await readJsonBody(request);
    if (!body.name || !body.email || !body.item) {
      return Response.json({ error: 'Customer, email, and item are required.' }, { status: 400 });
    }
    validateManualOrder(body);
    const order = await createOrder({
      phone: body.phone || '',
      customer_notes: body.customer_notes || '',
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
        stitch_minutes: Number(body.stitch_minutes) || 0,
        quantity: 1,
        is_custom: true,
      }],
    });
    await notifyNewOrder(order);
    revalidateTag('turnaround', 'max');
    return Response.json({ order });
  } catch (error) {
    return jsonError(error);
  }
}
