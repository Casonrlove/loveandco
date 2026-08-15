import { notifyContact } from '@/lib/notifications';
import { saveContactMessage } from '@/lib/store';

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
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
}
