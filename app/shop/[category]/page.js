import { notFound } from 'next/navigation';
import Shop from '@/components/Shop';
import { CATEGORIES, categoryById } from '@/lib/catalog';
import { getPublicProducts } from '@/lib/public-data';

export const revalidate = 900;

export function generateStaticParams() { return CATEGORIES.map(({ id }) => ({ category: id })); }

export async function generateMetadata({ params }) {
  const category = categoryById((await params).category);
  if (!category) return {};
  return { title: category.name, description: category.detail };
}

export default async function ShopCategoryPage({ params }) {
  const { category } = await params;
  if (!categoryById(category)) notFound();
  const products = await getPublicProducts();
  return <Shop category={category} products={products} />;
}
