import { protectPublicRequest } from '@/lib/operations-store';
import { jsonError } from '@/lib/require-admin';
import { suggestAddresses } from '@/lib/address-lookup';

export async function GET(request) {
 try {
  await protectPublicRequest(request, 'address');
  const params = new URL(request.url).searchParams;
  const query = String(params.get('q') || '').trim();
  const session = String(params.get('session') || '').trim();
  if (query.length < 3 || !/[A-Za-z]/.test(query)) return Response.json({ suggestions: [] });
  const result = await suggestAddresses(query, session);
  return Response.json(result);
 } catch (error) { return jsonError(error); }
}
