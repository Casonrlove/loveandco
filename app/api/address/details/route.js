import { protectPublicRequest } from '@/lib/operations-store';
import { jsonError } from '@/lib/require-admin';
import { detailsForPlace } from '@/lib/address-lookup';

export async function GET(request) {
 try {
  const params = new URL(request.url).searchParams;
  const placeId = String(params.get('id') || '').trim();
  const session = String(params.get('session') || '').trim();
  if (!placeId || placeId.length > 300 || session.length > 100) return Response.json({ error: 'Missing place.' }, { status: 400 });
  await protectPublicRequest(request, 'address');
  const address = await detailsForPlace(placeId, session);
  if (!address) return Response.json({ error: 'Address not found.' }, { status: 404 });
  return Response.json({ address });
 } catch (error) { return jsonError(error); }
}
