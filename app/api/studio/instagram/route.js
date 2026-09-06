import { revalidateTag } from 'next/cache';
import { readJsonBody } from '@/lib/security';
import { jsonError, requireAdmin } from '@/lib/require-admin';
import { isUsableInstagramToken } from '@/lib/instagram';
import { saveInstagramToken } from '@/lib/store';

export async function POST(request) {
  try {
    await requireAdmin();
    const body = await readJsonBody(request);
    const token = String(body.token || '').trim();
    if (!isUsableInstagramToken(token)) {
      return Response.json({ error: 'Paste a real Instagram access token.' }, { status: 400 });
    }
    await saveInstagramToken(token);
    revalidateTag('instagram', 'max');
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
