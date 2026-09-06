'use client';

import StoreImage from './StoreImage';

import { useEffect, useRef, useState } from 'react';
import { Bag, List, Person, X } from 'react-bootstrap-icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/lib/use-cart';

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

export default function Header({ turnaround }) {
  const menuButton = useRef(null);
  const pathname = usePathname();
  const [cart] = useCart();
  const itemCount = cart.reduce((count, item) => count + item.quantity, 0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = (event) => {
      if (event.key === 'Escape') { setOpen(false); menuButton.current?.focus(); }
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [open]);



  return (
    <header className="site-header">
      <p className="announce">{turnaround?.label || 'Custom-made with care'} · Does not include shipping time</p>
      <div className="site-bar">
        <div className="header-left">
          <button ref={menuButton} className="menu-toggle" type="button" aria-expanded={open} aria-controls="site-nav" onClick={() => setOpen((value) => !value)}>
            {open ? <X /> : <List />}
            <span>Menu</span>
          </button>
        </div>
        <Link className="brand" href="/">
          <StoreImage src="/images/logo-crest.png" sizes="100px" loading="eager" alt="Love & Co. Embroidery" width="200" height="155" />
        </Link>
        <div className="header-actions">
          <Link className="text-action" aria-label="Account" href="/account" prefetch={false}>
            <Person />
            <span>Account</span>
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
          <Link key={link.href} href={link.href} onClick={() => setOpen(false)} aria-current={linkIsActive(pathname, link.href) ? 'page' : undefined} className={linkIsActive(pathname, link.href) ? 'is-active' : ''}>{link.label}</Link>
        ))}
      </nav>
      {open && <button className="nav-scrim" type="button" aria-label="Close menu" onClick={() => setOpen(false)} />}
    </header>
  );
}
