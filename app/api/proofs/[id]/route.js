import { jsonError } from '@/lib/require-admin';
import { readJsonBody } from '@/lib/security';
import { customerProof, respondProof, protectPublicRequest } from '@/lib/operations-store';
const secret = (request) => (request.headers.get('authorization') || '').replace(/^Bearer /, '');
export async function GET(request, { params }) {
  try {
    await protectPublicRequest(request, 'proof'); const { id } = await params;
    const proof = await customerProof(id, secret(request));
    return proof ? Response.json({ proof }) : Response.json({ error: 'This proof link is unavailable. Ask the shop for a new link.' }, { status: 404 });
  } catch (error) { return jsonError(error); }
}
export async function POST(request, { params }) {
  try {
    await protectPublicRequest(request, 'proof'); const { id } = await params; const body = await readJsonBody(request);
    if (!['approved','changes_requested'].includes(body.decision) || typeof body.response !== 'string' || body.response.length > 3000 || (body.decision === 'changes_requested' && !body.response.trim())) return Response.json({ error: 'Choose a response and describe any changes needed.' }, { status: 400 });
    if (!await respondProof(id, secret(request), body.decision, body.response.trim())) return Response.json({ error: 'This proof has already been answered or replaced. Ask the shop for the latest version.' }, { status: 409 });
    return Response.json({ proof: await customerProof(id, secret(request)) });
  } catch (error) { return jsonError(error); }
}
