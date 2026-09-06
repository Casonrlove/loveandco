import { validateProduct } from '@/lib/studio-operations';
import { CATEGORIES } from '@/lib/catalog';
import { revalidateTag } from 'next/cache';
import { readJsonBody } from '@/lib/security';
import { jsonError, requireAdmin } from '@/lib/require-admin';
import { deleteProduct, persistenceMode, saveProduct } from '@/lib/store';
import { hasSupabaseConfig } from '@/lib/supabase/config';

async function guard() {
  if (hasSupabaseConfig() || persistenceMode() === 'none') await requireAdmin();
}

export async function POST(request) {
  try {
    await guard();
    const body = await readJsonBody(request);
    if (!body.name || !body.category) {
      return Response.json({ error: 'Name and category are required.' }, { status: 400 });
    }
    validateProduct(body, CATEGORIES.map((category) => category.id));
    const product = await saveProduct(body);
    revalidateTag('catalog', { expire: 0 });
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
    revalidateTag('catalog', { expire: 0 });
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
