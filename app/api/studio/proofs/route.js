import { requireStudio } from '@/lib/studio-guard';
import { jsonError } from '@/lib/require-admin';
import { readJsonBody } from '@/lib/security';
import { publishProof } from '@/lib/operations-store';
import { notifyOrderUpdate, siteUrl } from '@/lib/notifications';
import { getOrder } from '@/lib/store';
export async function POST(request) {
  try {
    const actor = await requireStudio(); const body = await readJsonBody(request);
    if (typeof body.orderId !== 'string' || typeof body.text !== 'string' || !body.text.trim() || body.text.length > 15000) return Response.json({ error: 'Enter the personalization proof (up to 15,000 characters).' }, { status: 400 });
    const proof = await publishProof(body.orderId, body.text.trim(), actor?.email || 'Local studio');
    const order = await getOrder(body.orderId).catch(() => null); // Published either way; the copy-link UI is the fallback.
    const href = `${siteUrl()}/proof/${proof.id}#token=${proof.token}`;
    const notification = order ? await notifyOrderUpdate(order, `Your proof for order #${order.id.slice(0, 8)} is ready. Check every name and detail, then approve it or ask for changes.`, `Approve your personalization for order #${order.id.slice(0, 8)}`, { action: { href, label: 'Review your proof' } }) : { status: 'skipped' };
    return Response.json({ ...proof, notification });
  } catch (error) { return jsonError(error); }
}
