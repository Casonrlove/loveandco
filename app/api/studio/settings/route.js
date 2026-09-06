import { refreshPromisedDates } from '@/lib/schedule-service';
import { revalidateTag } from 'next/cache';
import { readJsonBody, validateSettings } from '@/lib/security';
import { jsonError, requireAdmin } from '@/lib/require-admin';
import { hasSupabaseConfig } from '@/lib/supabase/config';
import { persistenceMode, saveSettings } from '@/lib/store';

export async function PATCH(request) {
  try {
    if (hasSupabaseConfig() || persistenceMode() === 'none') await requireAdmin();
    const body = await readJsonBody(request);
    const error = validateSettings(body);
    if (error) return Response.json({ error }, { status: 400 });
    const settings = await saveSettings(body);
    await refreshPromisedDates();
    revalidateTag('turnaround', 'max');
    return Response.json({ settings });
  } catch (error) {
    return jsonError(error);
  }
}
