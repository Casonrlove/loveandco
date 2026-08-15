import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Shop from '@/components/Shop';
import { categoryById, findProduct } from '@/lib/catalog';
import { getPublicTurnaround } from '@/lib/schedule-service';
import { listProducts } from '@/lib/store';
import { getSessionProfile } from '@/lib/supabase/auth';

export const dynamic = 'force-dynamic';

export default async function ShopProductPage({ params }) {
  const { category, product } = await params;
  if (!categoryById(category)) notFound();
  const [products, user, turnaround] = await Promise.all([
    listProducts(),
    getSessionProfile(),
    getPublicTurnaround(),
  ]);
  if (!findProduct(products, product)) notFound();
  return (
    <Suspense>
      <Shop category={category} productKey={product} products={products} user={user} turnaround={turnaround} />
    </Suspense>
  );
}
