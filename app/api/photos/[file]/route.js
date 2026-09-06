import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { persistenceMode } from '@/lib/store';
export async function GET(request, { params }) {
  const { file } = await params;
  if (persistenceMode() !== 'local' || !/^[a-f0-9-]{36}\.webp$/.test(file)) return new Response(null, { status: 404 });
  try { return new Response(await readFile(path.join(process.cwd(), '.data', 'uploads', file)), { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public,max-age=31536000,immutable' } }); } catch { return new Response(null, { status: 404 }); }
}
