import { Envelope, Instagram } from 'react-bootstrap-icons';
import Link from 'next/link';

export default function Footer({ buildLabel }) {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <nav className="footer-nav">
          <Link href="/shop">Shop</Link>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
        </nav>
        <div className="footer-links">
          <a href="mailto:loveandcoembroidery@gmail.com" aria-label="Email Love & Co."><Envelope size={22} /></a>
          <a href="https://www.instagram.com/loveandcoembroidery" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Instagram size={22} /></a>
        </div>
        <p className="build-footer" aria-label="Application build version">
          <span>LOVE & CO BUILD</span>
          <code>{buildLabel}</code>
        </p>
      </div>
    </footer>
  );
}
