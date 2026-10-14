import { getPublicWebsite } from '@/lib/public-data';
import Checkout from '@/components/Checkout';
import { getSessionProfile } from '@/lib/supabase/auth';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Checkout', robots: { index: false, follow: false } };

export default async function CheckoutPage() {
  const [user, website] = await Promise.all([
    getSessionProfile(),
    getPublicWebsite(),
  ]);
  return <Checkout user={user} website={website} />;
}
