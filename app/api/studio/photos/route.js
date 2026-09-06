import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { requireStudio } from '@/lib/studio-guard';
import { jsonError } from '@/lib/require-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { persistenceMode } from '@/lib/store';
export const runtime = 'nodejs';
export async function POST(request) {
  try {
    await requireStudio();
    if (!['image/jpeg','image/png','image/webp'].includes(request.headers.get('content-type'))) return Response.json({ error: 'Choose a JPEG, PNG, or WebP image.' }, { status: 415 });
    const reader = request.body?.getReader(); if (!reader) return Response.json({ error: 'Choose a photo.' }, { status: 400 });
    let length = 0; const chunks = [];
    for (;;) { const { value, done } = await reader.read(); if (done) break; length += value.byteLength; if (length > 4 * 1024 * 1024) { await reader.cancel(); return Response.json({ error: 'Keep uploads under 4 MB.' }, { status: 413 }); } chunks.push(value); }
    let data;
    try { data = await sharp(Buffer.concat(chunks), { limitInputPixels: 20000000, animated: false }).rotate().resize({ width: 1440, height: 1440, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(); }
    catch { return Response.json({ error: 'This image could not be read. Choose a smaller JPEG, PNG, or WebP.' }, { status: 400 }); }
    const name = crypto.randomUUID() + '.webp'; let url;
    if (persistenceMode() === 'local') { const dir = path.join(process.cwd(), '.data', 'uploads'); await mkdir(dir, { recursive: true }); await writeFile(path.join(dir, name), data); url = '/api/photos/' + name; }
    else {
      const db = createAdminClient();
      const { data: bucket, error: lookupError } = await db.storage.getBucket('product-photos');
      if (!bucket) {
        if (lookupError && !['404','400'].includes(String(lookupError.statusCode))) throw lookupError;
        const { error } = await db.storage.createBucket('product-photos', { public: true, fileSizeLimit: 4194304, allowedMimeTypes: ['image/webp'] });
        // Another simultaneous first upload may already have created it.
        if (error && !/already exists/i.test(error.message)) throw error;
      } else if (!bucket.public) return Response.json({ error: 'The product-photos bucket must be public before catalog uploads can be used.' }, { status: 409 });
      const { error } = await db.storage.from('product-photos').upload(name, data, { contentType: 'image/webp', cacheControl: '31536000', upsert: false });
      if (error) throw error;
      url = db.storage.from('product-photos').getPublicUrl(name).data.publicUrl;
    }
    return Response.json({ url });
  } catch (error) { return jsonError(error); }
}
