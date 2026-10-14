import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Shop from '@/components/Shop';
import { categoryById, findProduct } from '@/lib/catalog';
import { getPublicProducts } from '@/lib/public-data';

export const revalidate = 900;

export async function generateStaticParams() { return []; }

export async function generateMetadata({ params }) {
  const { product } = await params;
  const item = findProduct(await getPublicProducts(), product);
  if (!item) return {};
  return { title: item.name, description: item.detail || undefined };
}

export default async function ShopProductPage({ params }) {
  const { category, product } = await params;
  if (!categoryById(category)) notFound();
  const products = await getPublicProducts();
  if (!findProduct(products, product)) notFound();
  return (
    <Suspense>
      <Shop category={category} productKey={product} products={products} />
    </Suspense>
  );
}
