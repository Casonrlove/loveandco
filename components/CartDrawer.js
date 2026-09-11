'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Dash, Plus, X } from 'react-bootstrap-icons';
import {
  CART_EVENT,
  basePrice,
  cartTotal,
  designFee,
  isPerPersonPackage,
  orderDesignFee,
  summarizeBundleAddons,
} from '@/lib/catalog';
import { loadCart, persistCart } from '@/lib/cart';
import { CART_OPEN_EVENT } from '@/lib/cart-ui';
import { summarizeDesign } from '@/lib/design-options';
import { useScrollLock } from '@/lib/scroll-lock';
import TurnaroundNote from './TurnaroundNote';

/**
 * The bag lives at the layout level so it can be opened from any route
 * without navigating. localStorage stays the single source of truth;
 * CART_EVENT keeps this drawer, the header count and the shop in sync.
 */
export default function CartDrawer({ turnaround }) {
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState([]);

  useEffect(() => {
    const sync = () => setCart(loadCart());
    sync();
    if (new URLSearchParams(window.location.search).get('bag') === 'open') setOpen(true);
    const show = () => { sync(); setOpen(true); };
    window.addEventListener(CART_EVENT, sync);
    window.addEventListener('storage', sync);
    window.addEventListener(CART_OPEN_EVENT, show);
    return () => {
      window.removeEventListener(CART_EVENT, sync);
      window.removeEventListener('storage', sync);
      window.removeEventListener(CART_OPEN_EVENT, show);
    };
  }, []);

  useScrollLock(open);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const total = useMemo(() => cartTotal(cart), [cart]);
  const packageFee = orderDesignFee(cart);
  const hasCustomItem = cart.some((item) => item.isCustom);

  const write = (next) => {
    setCart(next);
    persistCart(next);
  };
  const updateItem = (id, patch) => write(cart.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const removeItem = (id) => write(cart.filter((item) => item.id !== id));

  if (!open) return null;

  return (
    <>
      <button className="scrim" type="button" aria-label="Close bag" onClick={() => setOpen(false)} />
      <aside className="drawer cart-drawer" aria-label="Shopping bag">
        <button className="drawer-close" type="button" onClick={() => setOpen(false)} aria-label="Close bag"><X aria-hidden="true" /></button>
        <p className="eyebrow">Your bag</p>
        <h2>Good things are coming.</h2>
        {cart.length === 0 ? (
          <div className="empty-state">
            <p>Your bag is waiting for something special.</p>
            <Link className="btn btn--primary btn--sm" href="/shop" onClick={() => setOpen(false)}>Browse the shop</Link>
          </div>
        ) : (
          <>
            <div className="cart-scroll">
              {cart.map((item) => (
                <article className="cart-line" key={item.id}>
                  <div className="cart-line-copy">
                    <strong>{item.name}</strong>
                    <span>{item.isCustom ? 'Price to be confirmed after review' : isPerPersonPackage(item) ? `$${basePrice(item).toFixed(2)} per person · hat + tote` : `$${basePrice(item).toFixed(2)} each`}</span>
                    {!item.isCustom && item.wantsDesign && designFee(item) > 0 && (
                      <span className="cart-design-fee">Custom design +${designFee(item).toFixed(2)}</span>
                    )}
                    {summarizeBundleAddons(item) && (
                      <span className="cart-design-fee">{summarizeBundleAddons(item)}</span>
                    )}
                    {item.wantsDesign && summarizeDesign(item) && (
                      <span className="cart-design-fee">{summarizeDesign(item)}</span>
                    )}
                  </div>
                  <div className="cart-controls">
                    <div className="qty-stepper">
                      <button type="button" aria-label={`Remove one ${item.name}`} onClick={() => (item.quantity === 1 ? removeItem(item.id) : updateItem(item.id, { quantity: item.quantity - 1 }))}><Dash aria-hidden="true" /></button>
                      <span>{item.quantity}</span>
                      <button type="button" aria-label={`Add one ${item.name}`} onClick={() => updateItem(item.id, { quantity: item.quantity + 1 })}><Plus aria-hidden="true" /></button>
                    </div>
                    <button type="button" className="remove-link" onClick={() => removeItem(item.id)}>Remove</button>
                  </div>
                </article>
              ))}
            </div>
            <div className="cart-foot">
              {packageFee > 0 && (
                <div className="cart-total">
                  <span>One-time design fee</span>
                  <strong>${packageFee.toFixed(2)}</strong>
                </div>
              )}
              <div className="cart-total">
                <span>{hasCustomItem ? 'Priced items subtotal' : 'Estimated total'}</span>
                <strong>${total.toFixed(2)}</strong>
              </div>
              {hasCustomItem && <small>Custom items are quoted after review and are not included in this subtotal.</small>}
              <TurnaroundNote turnaround={turnaround} compact />
              <Link className="btn btn--primary btn--block" href="/checkout" onClick={() => setOpen(false)}>Continue to checkout</Link>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
