import { jsonError, requireAdmin } from '@/lib/require-admin';
import { deleteProduct, persistenceMode, saveProduct } from '@/lib/store';
import { hasSupabaseConfig } from '@/lib/supabase/config';

async function guard() {
  if (hasSupabaseConfig() || persistenceMode() === 'none') await requireAdmin();
}

export async function POST(request) {
  try {
    await guard();
    const body = await request.json();
    if (!body.name || !body.category) {
      return Response.json({ error: 'Name and category are required.' }, { status: 400 });
    }
    const product = await saveProduct(body);
    return Response.json({ product });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request) {
  try {
    await guard();
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return Response.json({ error: 'Product id is required.' }, { status: 400 });
    await deleteProduct(id);
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
