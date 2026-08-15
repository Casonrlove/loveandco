import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Shop from '@/components/Shop';
import { categoryById } from '@/lib/catalog';
import { getPublicTurnaround } from '@/lib/schedule-service';
import { listProducts } from '@/lib/store';
import { getSessionProfile } from '@/lib/supabase/auth';

export const dynamic = 'force-dynamic';

export default async function ShopCategoryPage({ params }) {
  const { category } = await params;
  if (!categoryById(category)) notFound();
  const [products, user, turnaround] = await Promise.all([
    listProducts(),
    getSessionProfile(),
    getPublicTurnaround(),
  ]);
  return (
    <Suspense>
      <Shop category={category} products={products} user={user} turnaround={turnaround} />
    </Suspense>
  );
}
