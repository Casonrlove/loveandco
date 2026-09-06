import { readJsonBody } from '@/lib/security';
import { pickAddress, validateOptionalAddress } from '@/lib/address';
import { jsonError } from '@/lib/require-admin';
import { getSessionProfile } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseConfig } from '@/lib/supabase/config';

export async function PATCH(request) {
  try {
    const profile = await getSessionProfile();
    if (!profile) return Response.json({ error: 'Sign in required.' }, { status: 401 });
    const body = await readJsonBody(request);
    const address = pickAddress(body);
    const addressError = validateOptionalAddress(address);
    if (addressError) return Response.json({ error: addressError }, { status: 400 });
    if (!hasSupabaseConfig()) return Response.json({ ok: true });
    const supabase = await createClient();
    const { error } = await supabase.from('profiles').update({
      full_name: String(body.full_name || '').trim(),
      phone: String(body.phone || '').trim(),
      venmo_username: String(body.venmo_username || '').trim(),
      ...address,
      updated_at: new Date().toISOString(),
    }).eq('id', profile.id);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
