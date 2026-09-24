import { Suspense } from 'react';
import Shop from '@/components/Shop';
import { getPublicProducts } from '@/lib/public-data';

export const revalidate = 900;

export default async function ShopPage() {
  const products = await getPublicProducts();
  return (
    <Suspense>
      <Shop products={products} />
    </Suspense>
  );
}
