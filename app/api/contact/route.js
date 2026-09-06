import { protectPublicRequest } from '@/lib/operations-store';
import { readJsonBody, validateSubmission } from '@/lib/security';
import { jsonError } from '@/lib/require-admin';
import { notifyContact } from '@/lib/notifications';
import { saveContactMessage } from '@/lib/store';

export async function POST(request) {
  try {
    const body = await readJsonBody(request);
    await protectPublicRequest(request, 'contact');
    if (body.company_website) return Response.json({ ok: true });
    const inputError = validateSubmission(body);
    if (inputError) return Response.json({ error: inputError }, { status: 400 });
    if (!body.name || !body.email || !body.message) {
      return Response.json({ error: 'Name, email, and message are required.' }, { status: 400 });
    }
    const message = await saveContactMessage({
      name: String(body.name).trim(),
      email: String(body.email).trim(),
      phone: String(body.phone || '').trim(),
      message: String(body.message).trim(),
    });
    await notifyContact(message);
    return Response.json({ ok: true });
  } catch (error) { return jsonError(error); }
}
