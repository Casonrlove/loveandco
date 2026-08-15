import { Suspense } from 'react';
import Shop from '@/components/Shop';
import { getPublicTurnaround } from '@/lib/schedule-service';
import { listProducts } from '@/lib/store';
import { getSessionProfile } from '@/lib/supabase/auth';

export const dynamic = 'force-dynamic';

export default async function ShopPage() {
  const [products, user, turnaround] = await Promise.all([
    listProducts(),
    getSessionProfile(),
    getPublicTurnaround(),
  ]);
  return (
    <Suspense>
      <Shop products={products} user={user} turnaround={turnaround} />
    </Suspense>
  );
}
