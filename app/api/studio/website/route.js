import { revalidateTag } from 'next/cache';
import { requireStudio } from '@/lib/studio-guard';
import { jsonError } from '@/lib/require-admin';
import { readJsonBody } from '@/lib/security';
import { validateWebsiteSettings } from '@/lib/studio-operations';
import { getWebsiteSettings, saveWebsiteSettings } from '@/lib/store';
export async function GET() {
  try { await requireStudio(); return Response.json({ website: await getWebsiteSettings() }); }
  catch (error) { return jsonError(error); }
}
export async function PATCH(request) {
  try {
    await requireStudio();
    const website = await saveWebsiteSettings(validateWebsiteSettings(await readJsonBody(request)));
    revalidateTag('website', { expire: 0 });
    return Response.json({ website });
  } catch (error) { return jsonError(error); }
}
