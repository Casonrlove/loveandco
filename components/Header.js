'use client';

import { useEffect, useState } from 'react';
import { Bag, List, Person, X } from 'react-bootstrap-icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CART_EVENT, CART_KEY } from '@/lib/catalog';
import { openCart } from '@/lib/cart-ui';
import { useScrollLock } from '@/lib/scroll-lock';

const links = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/shop', label: 'Shop' },
  { href: '/custom', label: 'Custom' },
];

function linkIsActive(pathname, href) {
  if (href === '/') return pathname === '/';
  if (href === '/shop') return pathname === '/shop' || pathname.startsWith('/shop/');
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Header({ turnaround, user }) {
  const pathname = usePathname();
  const [itemCount, setItemCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const updateCount = () => {
      try {
        const cart = JSON.parse(window.localStorage.getItem(CART_KEY)) || [];
        setItemCount(cart.reduce((count, item) => count + item.quantity, 0));
      } catch {
        setItemCount(0);
      }
    };
    updateCount();
    window.addEventListener('storage', updateCount);
    window.addEventListener(CART_EVENT, updateCount);
    return () => {
      window.removeEventListener('storage', updateCount);
      window.removeEventListener(CART_EVENT, updateCount);
    };
  }, []);
  useEffect(() => { setOpen(false); }, [pathname]);
  useScrollLock(open);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="site-header">
      <p className="announce">
        {turnaround?.label || 'Custom-made with care'}
        <span className="announce-extra"> · Does not include shipping time · Custom pieces can take longer</span>
      </p>
      <div className="site-bar">
        <button
          className="menu-toggle"
          type="button"
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen((value) => !value)}
        >
          <List aria-hidden="true" />
          <span>Menu</span>
        </button>

        <nav id="site-nav" className={`site-nav${open ? ' is-open' : ''}`} aria-label="Main">
          <div className="site-nav-head">
            <span className="eyebrow">Menu</span>
            <button className="icon-btn" type="button" onClick={() => setOpen(false)} aria-label="Close menu">
              <X aria-hidden="true" />
            </button>
          </div>
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={linkIsActive(pathname, link.href) ? 'is-active' : ''}>
              {link.label}
            </Link>
          ))}
        </nav>

        <Link className="brand" href="/" aria-label="Love & Co. Embroidery — home">
          <img src="/images/logo-crest.png" alt="" width="314" height="282" />
        </Link>

        <div className="header-actions">
          <Link className="text-action" href={user ? '/account' : '/login'}>
            <Person aria-hidden="true" />
            <span>{user ? 'Account' : 'Sign in'}</span>
          </Link>
          <button className="bag-action" type="button" onClick={openCart} aria-label={`Open bag with ${itemCount} items`}>
            <Bag aria-hidden="true" />
            <span>Bag</span>
            <b>{itemCount}</b>
          </button>
        </div>
      </div>
      {open && <button className="nav-scrim" type="button" aria-label="Close menu" onClick={() => setOpen(false)} />}
    </header>
  );
}
