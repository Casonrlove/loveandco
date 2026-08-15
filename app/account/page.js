import { redirect } from 'next/navigation';
import AccountClient from '@/components/AccountClient';
import { claimOrdersForUser, listOrders } from '@/lib/store';
import { getSessionProfile } from '@/lib/supabase/auth';

export const metadata = { title: 'Account · Love & Co. Embroidery' };

export default async function AccountPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect('/login?next=/account');
  await claimOrdersForUser(profile.id, profile.email);
  const orders = await listOrders({ email: profile.email, userId: profile.id });
  return <AccountClient profile={profile} orders={orders} />;
}
