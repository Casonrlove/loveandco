import { getPublicWebsite } from '@/lib/public-data';
import Checkout from '@/components/Checkout';
import { getPublicTurnaround } from '@/lib/schedule-service';
import { getSessionProfile } from '@/lib/supabase/auth';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Checkout · Love & Co. Embroidery' };

export default async function CheckoutPage() {
  const [user, turnaround, website] = await Promise.all([
    getSessionProfile(),
    getPublicTurnaround(),
    getPublicWebsite(),
  ]);
  return <Checkout user={user} turnaround={turnaround} website={website} />;
}
