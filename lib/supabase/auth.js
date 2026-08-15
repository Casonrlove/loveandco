import { isAdminEmail } from '@/lib/admin';
import { createClient } from './server';
import { hasSupabaseConfig } from './config';

export async function getSessionUser() {
  if (!hasSupabaseConfig()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

export async function getSessionProfile() {
  const user = await getSessionUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  const email = user.email || profile?.email || '';
  return {
    id: user.id,
    email,
    full_name: profile?.full_name || user.user_metadata?.full_name || '',
    phone: profile?.phone || '',
    venmo_username: profile?.venmo_username || '',
    address_line: profile?.address_line || '',
    address_line2: profile?.address_line2 || '',
    city: profile?.city || '',
    region: profile?.region || '',
    postal_code: profile?.postal_code || '',
    role: profile?.role === 'admin' || isAdminEmail(email) ? 'admin' : 'customer',
  };
}
