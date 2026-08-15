'use client';

import { useEffect, useState } from 'react';
import { Bag, List, Person, X } from 'react-bootstrap-icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CART_EVENT, CART_KEY } from '@/lib/catalog';

const links = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/shop', label: 'Shop' },
  { href: '/custom', label: 'Custom' },
  { href: '/contact', label: 'Contact' },
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

  return (
    <header className="site-header">
      <p className="announce">{turnaround?.label || 'Custom-made with care'} · Does not include shipping time</p>
      <div className="site-bar">
        <div className="header-left">
          <button className="menu-toggle" type="button" aria-expanded={open} aria-controls="site-nav" onClick={() => setOpen((value) => !value)}>
            {open ? <X /> : <List />}
            <span>Menu</span>
          </button>
        </div>
        <Link className="brand" href="/">
          <img src="/images/logo-crest.png" alt="Love & Co. Embroidery" />
        </Link>
        <div className="header-actions">
          <Link className="text-action" href={user ? '/account' : '/login'}>
            <Person />
            <span>{user ? 'Account' : 'Sign in'}</span>
          </Link>
          <Link className="bag-action" href="/shop?bag=open" aria-label={`Open bag with ${itemCount} items`}>
            <Bag />
            <span>Bag</span>
            <b>{itemCount}</b>
          </Link>
        </div>
      </div>
      <nav id="site-nav" className={`site-nav${open ? ' is-open' : ''}`} aria-label="Main">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className={linkIsActive(pathname, link.href) ? 'is-active' : ''}>{link.label}</Link>
        ))}
      </nav>
      {open && <button className="nav-scrim" type="button" aria-label="Close menu" onClick={() => setOpen(false)} />}
    </header>
  );
}
