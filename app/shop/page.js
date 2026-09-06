import { Suspense } from 'react';
import Shop from '@/components/Shop';
import { getPublicTurnaround } from '@/lib/schedule-service';
import { getPublicProducts } from '@/lib/public-data';

export const revalidate = 900;

export default async function ShopPage() {
  const [products, turnaround] = await Promise.all([
    getPublicProducts(),
    getPublicTurnaround(),
  ]);
  return (
    <Suspense>
      <Shop products={products} turnaround={turnaround} />
    </Suspense>
  );
}
