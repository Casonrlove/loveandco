import { jsonError, requireAdmin } from '@/lib/require-admin';
import { hasSupabaseConfig } from '@/lib/supabase/config';
import { persistenceMode, saveSettings } from '@/lib/store';

export async function PATCH(request) {
  try {
    if (hasSupabaseConfig() || persistenceMode() === 'none') await requireAdmin();
    const body = await request.json();
    const settings = await saveSettings(body);
    return Response.json({ settings });
  } catch (error) {
    return jsonError(error);
  }
}
