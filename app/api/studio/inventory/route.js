import { requireStudio } from '@/lib/studio-guard';
import { jsonError } from '@/lib/require-admin';
import { readJsonBody } from '@/lib/security';
import { listInventory, addSupply, adjustSupply } from '@/lib/operations-store';
export async function GET() { try { await requireStudio(); return Response.json(await listInventory()); } catch (error) { return jsonError(error); } }
export async function POST(request) {
  try {
    await requireStudio(); const body = await readJsonBody(request);
    if (['name','size','color'].some((key) => typeof body[key] !== 'string' || body[key].length > 200) || !body.name.trim() || !Number.isInteger(body.low_at) || body.low_at < 0 || body.low_at > 100000) return Response.json({ error: 'Enter a supply name, size/color, and valid low-stock threshold.' }, { status: 400 });
    return Response.json({ supply: await addSupply(body) });
  } catch (error) { return jsonError(error); }
}
export async function PATCH(request) {
  try {
    const actor = await requireStudio(); const body = await readJsonBody(request);
    if (typeof body.id !== 'string' || !Number.isInteger(body.change) || !body.change || Math.abs(body.change) > 100000 || typeof body.reason !== 'string' || !body.reason.trim() || body.reason.length > 500) return Response.json({ error: 'Enter a nonzero stock change and a reason.' }, { status: 400 });
    await adjustSupply(body.id, body.change, body.reason.trim(), actor?.email || 'Local studio'); return Response.json(await listInventory());
  } catch (error) { return jsonError(error); }
}
