import { CATEGORIES, productHref } from '@/lib/catalog';
import { getPublicProducts } from '@/lib/public-data';

const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://loveandco.vercel.app';
const staticPaths = ['', '/about', '/shop', '/shop/custom', '/custom', '/contact', '/shop-info'];

export default async function sitemap() {
  const products = await getPublicProducts();
  const paths = [...staticPaths, ...CATEGORIES.map((category) => category.shopPath), ...products.map(productHref)];
  return paths.map((path) => ({ url: `${base}${path}`, lastModified: new Date() }));
}
