import { isAdminProfile } from '@/lib/admin';
import { getSessionProfile } from '@/lib/supabase/auth';

export async function requireAdmin() {
  const profile = await getSessionProfile();
  if (!isAdminProfile(profile)) {
    const error = new Error('Admin access required.');
    error.status = 401;
    throw error;
  }
  return profile;
}

export function jsonError(error) {
  const status = error.status || 500;
  return Response.json({ error: error.message || 'Something went wrong.' }, { status });
}
