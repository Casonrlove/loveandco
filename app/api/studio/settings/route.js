import { refreshPromisedDates } from '@/lib/schedule-service';
import { readJsonBody, validateSettings } from '@/lib/security';
import { jsonError } from '@/lib/require-admin';
import { requireStudio } from '@/lib/studio-guard';
import { saveSettings } from '@/lib/store';

export async function PATCH(request) {
  try {
    await requireStudio();
    const body = await readJsonBody(request);
    const error = validateSettings(body);
    if (error) return Response.json({ error }, { status: 400 });
    const settings = await saveSettings(body);
    await refreshPromisedDates();
    return Response.json({ settings });
  } catch (error) {
    return jsonError(error);
  }
}
