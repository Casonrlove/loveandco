import StoreImage from './StoreImage';
import Link from 'next/link';
import FavoritesCarousel from './FavoritesCarousel';
import InstagramReel from './InstagramReel';
import { getPublicInstagram, getPublicProducts } from '@/lib/public-data';
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
    getPublicInstagram(),
    getPublicProducts(),
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
        <div className="home-intro-card">
          <p className="eyebrow">LOVE & CO. EMBROIDERY</p>
          <h1>A name. A little thread.<br /><em>Something to keep.</em></h1>
          <p>Personalized pieces for new babies, wedding days, and the people who make a house a home. Choose a favorite and make it theirs.</p>
          <div className="home-actions">
            <Link href="/shop" className="soft-button">Find your keepsake</Link>
            <Link href="/custom" className="home-custom-link">Have something in mind? →</Link>
          </div>
          <p className="home-maker-note">Made with care by Anna · Love & Co.</p>
        </div>
        <figure className="home-keepsake">
          <StoreImage src="/images/shop/home-gift/monogram-towel-2.jpg" alt="Hand towels embroidered with framed letter monograms" width="1125" height="1941" fetchPriority="high" />
          <figcaption>A small detail, made personal.</figcaption>
        </figure>
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
                <StoreImage src={product.image} alt={product.name} width="600" height="600" loading="lazy" />
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
