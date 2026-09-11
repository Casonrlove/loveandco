'use client';

import Link from 'next/link';
import { Envelope, Instagram } from 'react-bootstrap-icons';

const SHOP_EMAIL = 'mailto:loveandcoembroidery@gmail.com';
const INSTAGRAM = 'https://www.instagram.com/loveandcoembroidery';

const shopLinks = [
  { href: '/shop', label: 'All collections' },
  { href: '/shop/baby-bundles', label: 'Baby bundles' },
  { href: '/shop/trucker-hats', label: 'Trucker hats' },
  { href: '/shop/wedding', label: 'Wedding' },
  { href: '/custom', label: 'Custom orders' },
];

const helpLinks = [
  { href: '/about', label: 'About Anna' },
  { href: '/contact', label: 'Contact' },
  { href: '/account', label: 'Your account' },
  { href: '/checkout', label: 'Checkout' },
];

export default function Footer({ buildLabel }) {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <img src="/images/logo-crest.png" alt="Love & Co. Embroidery" width="314" height="282" />
            <p>Custom embroidered keepsakes, stitched one at a time in small batches — made to feel just as special as the moment they are meant for.</p>
            <div className="footer-social">
              <a href={SHOP_EMAIL} aria-label="Email Love &amp; Co."><Envelope size={18} aria-hidden="true" /></a>
              <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Instagram size={18} aria-hidden="true" /></a>
            </div>
          </div>

          <nav className="footer-col" aria-label="Shop">
            <h2>Shop</h2>
            <ul>
              {shopLinks.map((link) => (
                <li key={link.href}><Link href={link.href}>{link.label}</Link></li>
              ))}
            </ul>
          </nav>

          <nav className="footer-col" aria-label="Help">
            <h2>Help</h2>
            <ul>
              {helpLinks.map((link) => (
                <li key={link.href}><Link href={link.href}>{link.label}</Link></li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="footer-base">
          <p>© {new Date().getFullYear()} Love &amp; Co. Embroidery</p>
          <p className="build-footer" aria-label="Application build version">
            <span>BUILD</span>
            <code>{buildLabel}</code>
          </p>
        </div>
      </div>
    </footer>
  );
}
