import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Shop from '@/components/Shop';
import { CATEGORIES, categoryById } from '@/lib/catalog';
import { getPublicTurnaround } from '@/lib/schedule-service';
import { getPublicProducts } from '@/lib/public-data';

export const revalidate = 900;

export function generateStaticParams() { return CATEGORIES.map(({ id }) => ({ category: id })); }

export default async function ShopCategoryPage({ params }) {
  const { category } = await params;
  if (!categoryById(category)) notFound();
  const [products, turnaround] = await Promise.all([
    getPublicProducts(),
    getPublicTurnaround(),
  ]);
  return (
    <Suspense>
      <Shop category={category} products={products} turnaround={turnaround} />
    </Suspense>
  );
}
