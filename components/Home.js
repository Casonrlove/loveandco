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
    <main>
      <section className="home-intro">
        <div className="container">
          <div className="home-intro-card">
            <p className="eyebrow">Welcome</p>
            <h1>Love &amp; Co. Embroidery</h1>
            <p>
              Hi friends &amp; welcome to @loveandcoembroidery! From the bottom of my heart THANK YOU for being here. Whether it’s a gift, a keepsake, or a little something to make you smile, I’d love to create something you’ll love for years to come. If you see anything you’d like or have something in mind — shoot me a message! I’d love to work with you!
            </p>
            <Link href="/shop" className="btn btn--primary btn--lg">Shop our collections</Link>
          </div>
        </div>
      </section>

      {favorites.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">Favorites</p>
              <h2>A few of our favorites</h2>
            </div>
            <FavoritesCarousel
              items={favorites.map((product) => ({
                href: productHref(product),
                image: product.image,
                name: product.name,
                price: priceLabel(product),
              }))}
            />
          </div>
        </section>
      )}

      {bundles.length > 0 && (
        <section className="section section--band">
          <div className="container">
            <div className="section-head section-head--split">
              <div>
                <p className="eyebrow">Baby bundles</p>
                <h2>The Keepsake, Signature, and Heirloom</h2>
                <p className="lede">Curated sets with outfits, bibs, and burp cloths — customization included. Extra outfits, burp cloths, bibs, and paci clips can be added.</p>
              </div>
              <Link href="/shop/baby-bundles" className="btn btn--secondary">Shop baby bundles</Link>
            </div>
            <div className="product-grid product-grid--three">
              {bundles.map((product) => (
                <Link className="product-card" href={productHref(product)} key={product.id}>
                  <img src={product.image} alt={product.name} />
                  <div className="product-card-body">
                    <h3>{product.name}</h3>
                    <p>{product.detail}</p>
                    <div className="product-card-foot">
                      <strong>${basePrice(product).toFixed(2)}</strong>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <InstagramReel posts={instagram.posts} />
    </main>
  );
}
