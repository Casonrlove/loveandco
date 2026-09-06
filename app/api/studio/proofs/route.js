import { requireStudio } from '@/lib/studio-guard';
import { jsonError } from '@/lib/require-admin';
import { readJsonBody } from '@/lib/security';
import { publishProof } from '@/lib/operations-store';
export async function POST(request) {
  try {
    const actor = await requireStudio(); const body = await readJsonBody(request);
    if (typeof body.orderId !== 'string' || typeof body.text !== 'string' || !body.text.trim() || body.text.length > 15000) return Response.json({ error: 'Enter the personalization proof (up to 15,000 characters).' }, { status: 400 });
    return Response.json(await publishProof(body.orderId, body.text.trim(), actor?.email || 'Local studio'));
  } catch (error) { return jsonError(error); }
}
