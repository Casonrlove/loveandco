import { Envelope, Instagram } from 'react-bootstrap-icons';
import Link from 'next/link';
import { SHOP_COLLECTIONS } from '@/lib/catalog';
import { getPublicProducts } from '@/lib/public-data';

export default async function Footer({ info }) {
  const products = await getPublicProducts().catch(() => []);
  const collections = SHOP_COLLECTIONS.filter((collection) => products.some((product) => product.category === collection.id));
  const email = info?.contactEmail || 'loveandcoembroidery@gmail.com';
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <nav className="footer-nav" aria-label="Footer">
          <Link href="/shop">Shop</Link>
          <Link href="/custom">Custom pieces</Link>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/shop-info">Shop information</Link>
          <Link href="/shop-info#turnaroundPolicy">Turnaround</Link>
        </nav>
        {collections.length > 0 && (
          <nav className="footer-nav footer-collections" aria-label="Collections">
            {collections.map((collection) => <Link key={collection.id} href={collection.shopPath}>{collection.name}</Link>)}
          </nav>
        )}
        <div className="footer-links">
          <a href={`mailto:${email}`} aria-label="Email Love & Co."><Envelope size={22} /></a>
          <a href="https://www.instagram.com/loveandcoembroidery" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Instagram size={22} /></a>
        </div>
        <p className="footer-note">Personalized pieces, made with care.</p>
        <small className="footer-note">© {new Date().getFullYear()} Love & Co. Embroidery · Paid by Venmo request after I review your order</small>
      </div>
    </footer>
  );
}
