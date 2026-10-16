'use client';

import BagDrawer from './BagDrawer';
import StoreImage from './StoreImage';

import { useEffect, useRef, useState } from 'react';
import { Bag, List, Person, X } from 'react-bootstrap-icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { openBag } from '@/lib/cart';
import { useCart } from '@/lib/use-cart';
import { fetchTurnaround } from '@/lib/turnaround-client';

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

export default function Header({ announcement, ordersOpen = true, pausedMessage }) {
  const menuButton = useRef(null);
  const nav = useRef(null);
  const pathname = usePathname();
  const [cart, , ready] = useCart();
  const itemCount = cart.reduce((count, item) => count + item.quantity, 0);
  const [open, setOpen] = useState(false);
  const [turnaroundLabel, setTurnaroundLabel] = useState('Custom-made with care');

  useEffect(() => {
    let active = true;
    fetchTurnaround().then((value) => { if (active && value?.label) setTurnaroundLabel(value.label); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!open) return;
    nav.current?.querySelector('a')?.focus();
    const close = (event) => {
      if (event.key === 'Escape') { setOpen(false); menuButton.current?.focus(); }
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [open]);

  const message = (!ordersOpen && pausedMessage) || announcement || `${turnaroundLabel} · Shipping time not included`;
  const showCount = ready && itemCount > 0;

  return (
    <>
    <p className="announce">{message}</p>
    <header className="site-header">
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
          <button className="bag-action" type="button" onClick={openBag} aria-label={showCount ? `Open bag, ${itemCount} ${itemCount === 1 ? 'piece' : 'pieces'}` : 'Open bag'}>
            <Bag />
            <span>Bag</span>
            {showCount && <b>{itemCount}</b>}
          </button>
        </div>
      </div>
      <nav ref={nav} id="site-nav" className={`site-nav${open ? ' is-open' : ''}`} aria-label="Main">
        {links.map((link) => (
          <Link key={link.href} href={link.href} onClick={() => setOpen(false)} aria-current={linkIsActive(pathname, link.href) ? 'page' : undefined} className={linkIsActive(pathname, link.href) ? 'is-active' : ''}>{link.label}</Link>
        ))}
      </nav>
      {open && <button className="nav-scrim" type="button" aria-label="Close menu" onClick={() => setOpen(false)} />}
    </header>
    <BagDrawer />
    </>
  );
}
