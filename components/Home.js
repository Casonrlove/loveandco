import Link from 'next/link';
import FavoritesCarousel from './FavoritesCarousel';
import InstagramReel from './InstagramReel';
import { listInstagramPosts } from '@/lib/instagram';
import { listProducts } from '@/lib/store';
import {
  FAVORITE_SLUGS,
  basePrice,
  isPerPersonPackage,
  isTieredNapkins,
  productHref,
} from '@/lib/catalog';

function priceLabel(product) {
  if (isPerPersonPackage(product)) return `$${basePrice({ ...product, quantity: 1 }).toFixed(2)} / person`;
  if (isTieredNapkins(product)) return 'From $8.00 each';
  return `$${basePrice(product).toFixed(2)}`;
}

export default async function Home() {
  const [instagram, products] = await Promise.all([
    listInstagramPosts({ limit: 18 }),
    listProducts(),
  ]);
  const favorites = FAVORITE_SLUGS
    .map((slug) => products.find((product) => product.slug === slug))
    .filter(Boolean);
  const bundles = products
    .filter((product) => product.category === 'baby-bundles')
    .sort((left, right) => (left.sort_order || 0) - (right.sort_order || 0));

  return (
    <>
      <section className="home-intro">
        <div className="home-intro-card">
          <p className="eyebrow">WELCOME</p>
          <h1>Love & Co. Embroidery</h1>
          <p>
            Hi friends & welcome to @loveandcoembroidery! From the bottom of my heart THANK YOU for being here. Whether it’s a gift, a keepsake, or a little something to make you smile, I’d love to create something you’ll love for years to come. If you see anything you’d like or have something in mind — shoot me a message! I’d love to work with you!
          </p>
          <Link href="/shop" className="soft-button">Shop Our Collections</Link>
        </div>
      </section>

      {favorites.length > 0 && (
        <section className="feature-reel home-favorites">
          <h2>A Few of Our Favorites</h2>
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
                <img src={product.image} alt={product.name} />
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
    </>
  );
}
