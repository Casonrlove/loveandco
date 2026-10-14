export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import AccountClient from '@/components/AccountClient';
import { claimOrdersForUser } from '@/lib/store';
import { getSessionProfile } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Account', robots: { index: false, follow: false } };

export default async function AccountPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect('/login?next=/account');
  if (profile.emailConfirmed) await claimOrdersForUser(profile.id, profile.email);
  // Session client so the orders_select_own RLS policy is a second check on this read.
  const supabase = await createClient();
  const { data, error } = await supabase.from('orders').select('*, order_items(*)').eq('user_id', profile.id).order('created_at', { ascending: false });
  if (error) throw error;
  const orders = (data || []).map((row) => ({ ...row, items: row.order_items || [], subtotal: Number(row.subtotal) || 0 }));
  return <AccountClient profile={profile} orders={orders} />;
}
