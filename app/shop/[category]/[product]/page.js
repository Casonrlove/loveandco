import { notFound } from 'next/navigation';
import Shop from '@/components/Shop';
import { NAPKIN_MIN_QTY, basePrice, categoryById, findProduct, isTieredNapkins, napkinUnitPrice, productImages } from '@/lib/catalog';
import { getPublicProducts } from '@/lib/public-data';

export const revalidate = 900;

export async function generateStaticParams() { return []; }

export async function generateMetadata({ params }) {
  const { product } = await params;
  const item = findProduct(await getPublicProducts(), product);
  if (!item) return {};
  return { title: item.name, description: item.detail || undefined, openGraph: { images: [item.image] } };
}

export default async function ShopProductPage({ params }) {
  const { category, product } = await params;
  if (!categoryById(category)) notFound();
  const products = await getPublicProducts();
  const item = findProduct(products, product);
  if (!item) notFound();
  const offers = isTieredNapkins(item)
    ? { '@type': 'AggregateOffer', lowPrice: napkinUnitPrice(60), highPrice: napkinUnitPrice(NAPKIN_MIN_QTY), priceCurrency: 'USD', availability: 'https://schema.org/InStock' }
    : { '@type': 'Offer', price: basePrice(item), priceCurrency: 'USD', availability: 'https://schema.org/InStock' };
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: item.name,
    image: productImages(item),
    description: item.detail || undefined,
    offers,
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <Shop category={category} productKey={product} products={products} />
    </>
  );
}
