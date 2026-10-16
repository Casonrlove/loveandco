'use client';

import { useEffect, useState } from 'react';
import { Dash, Plus, X } from 'react-bootstrap-icons';
import Link from 'next/link';
import { NAPKIN_MIN_QTY, basePrice, cartTotal, designFee, isPerPersonPackage, isTieredNapkins, lineTotal, orderDesignFee, productImages, summarizeBundleAddons } from '@/lib/catalog';
import { BAG_OPEN_EVENT } from '@/lib/cart';
import { summarizeDesign } from '@/lib/design-options';
import { useCart } from '@/lib/use-cart';
import { useModalFocus } from '@/lib/use-modal-focus';
import Reveal from './Reveal';
import StoreImage from './StoreImage';
import TurnaroundNote from './TurnaroundNote';

export default function BagDrawer() {
  const [open, setOpen] = useState(false);
  const [bag, setCart] = useCart();
  const close = () => setOpen(false);
  const dialog = useModalFocus(open, close);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(BAG_OPEN_EVENT, show);
    return () => window.removeEventListener(BAG_OPEN_EVENT, show);
  }, []);

  const hasCustomItem = bag.some((item) => item.isCustom);
  const packageFee = orderDesignFee(bag);
  const updateItem = (id, patch) => setCart((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  const removeItem = (id) => setCart((items) => items.filter((item) => item.id !== id));

  return (<>
    <Reveal />
    {open && <aside ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" className="bag-overlay" aria-label="Shopping bag">
      <div className="bag-scrim" aria-hidden="true" onClick={close} />
      <div className="cart-drawer">
        <button className="drawer-close" type="button" onClick={close} aria-label="Close bag"><X /></button>
        <p className="eyebrow">YOUR BAG</p>
        <h2>Good things are coming.</h2>
        {bag.length === 0 ? (
          <>
            <p>Your bag is waiting for something special.</p>
            <Link className="continue-shopping" href="/shop" onClick={close}>Continue shopping</Link>
          </>
        ) : (
          <>
            <div className="cart-items">
              {bag.map((item) => {
                const image = !item.isCustom && (productImages(item)[0] || item.image);
                return (
                  <article className="cart-line" key={item.id}>
                    {image && <StoreImage className="cart-thumb" src={image} alt="" width="64" height="64" sizes="64px" />}
                    <div className="cart-line-body">
                      <strong>{item.name}</strong>
                      <span>{item.isCustom ? 'Quoted after review' : isPerPersonPackage(item) ? `$${basePrice(item).toFixed(2)} per person · hat + tote` : `$${basePrice(item).toFixed(2)} each`}</span>
                      {!item.isCustom && item.wantsDesign && designFee(item) > 0 && (
                        <span className="cart-design-fee">Custom design +${designFee(item).toFixed(2)}</span>
                      )}
                      {summarizeBundleAddons(item) && (
                        <span className="cart-design-fee">{summarizeBundleAddons(item)}</span>
                      )}
                      {item.wantsDesign && summarizeDesign(item) && (
                        <span className="cart-design-fee">{summarizeDesign(item)}</span>
                      )}
                      {!item.isCustom && <b className="cart-line-total">${lineTotal(item).toFixed(2)}</b>}
                    </div>
                    <div className="cart-controls">
                      <div>
                        <button type="button" aria-label={`Remove one ${item.name}`} disabled={item.quantity <= (isTieredNapkins(item) ? NAPKIN_MIN_QTY : 1)} onClick={() => updateItem(item.id, { quantity: item.quantity - 1 })}><Dash /></button>
                        <span>{item.quantity}</span>
                        <button type="button" aria-label={`Add one ${item.name}`} disabled={item.quantity >= 500} onClick={() => updateItem(item.id, { quantity: item.quantity + 1 })}><Plus /></button>
                      </div>
                      <button type="button" className="remove-link" onClick={() => removeItem(item.id)}>Remove</button>
                    </div>
                  </article>
                );
              })}
            </div>
            {packageFee > 0 && (
              <div className="cart-total">
                <span>One-time design fee</span>
                <strong>${packageFee.toFixed(2)}</strong>
              </div>
            )}
            <div className="cart-total">
              <span>{hasCustomItem ? 'Priced pieces subtotal' : 'Estimated total'}</span>
              <strong>${cartTotal(bag).toFixed(2)}</strong>
            </div>
            <small>Estimated before shipping. I send a Venmo request after I review your order.</small>
            {hasCustomItem && <small>Custom pieces are quoted after review and are not in this subtotal.</small>}
            <TurnaroundNote compact />
            <Link className="studio-primary" href="/checkout" onClick={close}>Continue to checkout</Link>
          </>
        )}
      </div>
    </aside>}
  </>);
}
