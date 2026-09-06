import { Envelope, Instagram } from 'react-bootstrap-icons';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <nav className="footer-nav">
          <Link href="/shop">Shop</Link>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
        <Link href="/shop-info">Shop information</Link>
        </nav>
        <div className="footer-links">
          <a href="mailto:loveandcoembroidery@gmail.com" aria-label="Email Love & Co."><Envelope size={22} /></a>
          <a href="https://www.instagram.com/loveandcoembroidery" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Instagram size={22} /></a>
        </div>
        <p className="footer-note">Personalized pieces, made with care.</p>
      </div>
    </footer>
  );
}
