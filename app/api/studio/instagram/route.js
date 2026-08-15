import { jsonError, requireAdmin } from '@/lib/require-admin';
import { isUsableInstagramToken } from '@/lib/instagram';
import { saveInstagramToken } from '@/lib/store';

export async function POST(request) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const token = String(body.token || '').trim();
    if (!isUsableInstagramToken(token)) {
      return Response.json({ error: 'Paste a real Instagram access token.' }, { status: 400 });
    }
    await saveInstagramToken(token);
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
