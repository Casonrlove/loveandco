import Checkout from '@/components/Checkout';
import { getPublicTurnaround } from '@/lib/schedule-service';
import { getSessionProfile } from '@/lib/supabase/auth';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Checkout · Love & Co. Embroidery' };

export default async function CheckoutPage() {
  const [user, turnaround] = await Promise.all([
    getSessionProfile(),
    getPublicTurnaround(),
  ]);
  return <Checkout user={user} turnaround={turnaround} />;
}
