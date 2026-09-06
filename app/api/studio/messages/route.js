import { requireStudio } from '@/lib/studio-guard';
import { jsonError } from '@/lib/require-admin';
import { readJsonBody } from '@/lib/security';
import { listContactMessages, updateContactStatus } from '@/lib/store';
export async function GET(request) {
  try {
    await requireStudio();
    const offset = Number(new URL(request.url).searchParams.get('offset') || 0);
    if (!Number.isSafeInteger(offset) || offset < 0) return Response.json({ error: 'Invalid page.' }, { status: 400 });
    return Response.json(await listContactMessages({ offset }));
  } catch (error) { return jsonError(error); }
}
export async function PATCH(request) {
  try {
    await requireStudio();
    const { id, status } = await readJsonBody(request);
    if (typeof id !== 'string' || !['new', 'in_progress', 'resolved'].includes(status)) return Response.json({ error: 'Choose a valid inquiry status.' }, { status: 400 });
    const message = await updateContactStatus(id, status);
    return message ? Response.json({ message }) : Response.json({ error: 'Inquiry not found.' }, { status: 404 });
  } catch (error) { return jsonError(error); }
}
