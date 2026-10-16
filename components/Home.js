import Link from 'next/link';
import { preload } from 'react-dom';
import { Clock, GeoAlt, Heart } from 'react-bootstrap-icons';
import FavoritesCarousel from './FavoritesCarousel';
import InstagramReel from './InstagramReel';
import StoreImage from './StoreImage';
import TurnaroundNote from './TurnaroundNote';
import generatedImages from '@/lib/generated-images.json';
import { getPublicInstagram, getPublicProducts, getPublicWebsite } from '@/lib/public-data';
import { FAVORITE_SLUGS, SHOP_HUB, basePrice, priceLabel, productHref } from '@/lib/catalog';

export default async function Home() {
  const hero = generatedImages['/images/home-intro-floral.jpg'].src;
  preload(hero, { as: 'image', fetchPriority: 'high' });
  const [instagram, products, website] = await Promise.all([
    getPublicInstagram(),
    getPublicProducts(),
    getPublicWebsite(),
  ]);
  const picked = FAVORITE_SLUGS
    .map((slug) => products.find((product) => product.slug === slug))
    .filter(Boolean);
  const favorites = picked.length >= 3 ? picked : products.slice(0, 3);
  const bundles = products
    .filter((product) => product.category === 'baby-bundles')
    .sort((left, right) => (left.sort_order || 0) - (right.sort_order || 0));
  const counts = products.reduce((map, product) => ({ ...map, [product.category]: (map[product.category] || 0) + 1 }), {});
  const collections = SHOP_HUB.filter((item) => counts[item.id]);

  return (
    <main className="home-page">
      <section className="home-intro" style={{ backgroundImage: `url(${hero})` }}>
        <div className="home-intro-card">
          <p className="eyebrow">WELCOME</p>
          <h1>Custom embroidered keepsakes, made with care</h1>
          <p>
            Hi friends & welcome to @loveandcoembroidery! Whether it’s a gift, a keepsake, or a little something to make you smile, I’d love to create something you’ll love for years to come.
          </p>
          <Link href="/shop" className="soft-button">Shop the collections</Link>
          <Link href="/custom" className="outline-button">Start a custom piece</Link>
        </div>
      </section>

      <ul className="trust-strip">
        <li><Heart aria-hidden="true" /> Hand-embroidered with care</li>
        <li><Clock aria-hidden="true" /> <TurnaroundNote compact /></li>
        {website?.info?.pickupEnabled && <li><GeoAlt aria-hidden="true" /> Local pickup available</li>}
      </ul>

      {collections.length > 0 && <section className="shop-products shop-hub">
        {collections.map((item) => {
          const count = counts[item.id];
          return (
            <Link className="product-card" href={item.shopPath} key={item.id}>
              <StoreImage src={item.image} alt={item.name} sizes="(min-width: 1100px) 23vw, (min-width: 640px) 30vw, 46vw" />
              <div>
                {item.preorder && <p className="eyebrow">PREORDER</p>}
                <h2>{item.name}</h2>
                <p>{item.detail}</p>
                <p className="hub-count">{count} {count === 1 ? 'piece' : 'pieces'}</p>
              </div>
            </Link>
          );
        })}
      </section>}

      {favorites.length > 0 && (
        <section className="feature-reel home-favorites">
          <h2>A few of my favorites</h2>
          <FavoritesCarousel
            items={favorites.map((product) => ({
              href: productHref(product),
              image: product.image,
              name: product.name,
              price: priceLabel(product),
            }))}
          />
        </section>
      )}

      {bundles.length > 0 && (
        <section className="home-bundles">
          <div className="home-bundles-copy">
            <p className="eyebrow">BABY BUNDLES</p>
            <h2>The Keepsake, Signature, and Heirloom</h2>
            <p>Curated sets with outfits, bibs, and burp cloths — customization included. Extra outfits, burp cloths, bibs, and paci clips can be added.</p>
          </div>
          <div className="bundle-grid">
            {bundles.map((product) => (
              <Link className="bundle-card" href={productHref(product)} key={product.id}>
                <StoreImage src={product.image} alt={product.name} sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 33vw" />
                <div>
                  <h3>{product.name}</h3>
                  <p>{product.detail}</p>
                  <strong>${basePrice(product).toFixed(2)}</strong>
                </div>
              </Link>
            ))}
          </div>
          <Link href="/shop/baby-bundles" className="soft-button">Shop baby bundles</Link>
        </section>
      )}

      <InstagramReel posts={instagram.posts} />
    </main>
  );
}
