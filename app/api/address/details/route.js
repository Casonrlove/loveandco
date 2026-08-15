import { detailsForPlace } from '@/lib/address-lookup';

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const placeId = String(params.get('id') || '').trim();
  const session = String(params.get('session') || '').trim();
  if (!placeId) return Response.json({ error: 'Missing place.' }, { status: 400 });
  const address = await detailsForPlace(placeId, session);
  if (!address) return Response.json({ error: 'Address not found.' }, { status: 404 });
  return Response.json({ address });
}
