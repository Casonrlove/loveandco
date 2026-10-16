'use client';

import StoreImage from './StoreImage';

import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import Link from 'next/link';
import { Dash, Plus } from 'react-bootstrap-icons';
import { CART_EVENT, NAPKIN_MIN_QTY, addonTotal, basePrice, cartTotal, designFee, isBabyBundle, isMonogramTowel, isPerPersonPackage, isTieredNapkins, lineTotal, orderDesignFee, summarizeBundleAddons } from '@/lib/catalog';
import { useCart } from '@/lib/use-cart';
import { hasAddressInput, pickAddress, validateAddress } from '@/lib/address';
import { summarizeDesign, validateDesignItem } from '@/lib/design-options';
import AddressFields from './AddressFields';
import DesignFields from './DesignFields';
import PhoneInput from './PhoneInput';
import TurnaroundNote from './TurnaroundNote';

export default function Checkout({ user, website }) {
  const [cart, setCart, ready] = useCart();
  const submitting = useRef(false);
  const retry = useRef(null);
  const [delivery, setDelivery] = useState('shipping');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [errorItemId, setErrorItemId] = useState(null);
  const errorRef = useRef(null);
  const [submitted, setSubmitted] = useState(() => { try { return JSON.parse(sessionStorage.getItem('loveandco-order') || 'null'); } catch { return null; } });
  const [venmo, setVenmo] = useState(user?.venmo_username || '');
  const [venmoVerified, setVenmoVerified] = useState(false);

  const itemsTotal = useMemo(() => cart.reduce((sum, item) => (
    item.isCustom ? sum : sum + basePrice(item) * item.quantity + addonTotal(item)
  ), 0), [cart]);
  const designTotal = useMemo(() => cart.reduce((sum, item) => (
    item.isCustom || !item.wantsDesign ? sum : sum + designFee(item) * item.quantity
  ), 0) + orderDesignFee(cart), [cart]);
  const total = useMemo(() => cartTotal(cart), [cart]);
  const hasCustomItem = cart.some((item) => item.isCustom);
  const paused = website?.ordersOpen === false;

  const updateItem = (id, patch) => setCart((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  const removeItem = (id) => setCart((items) => items.filter((item) => item.id !== id));
  const lineError = cart.some((item) => item.id === errorItemId);

  useEffect(() => {
    if (!submitError) return;
    errorRef.current?.scrollIntoView({ block: 'center' });
    errorRef.current?.focus({ preventScroll: true });
  }, [submitError, errorItemId]);

  const submitOrder = async (event) => {
    event.preventDefault();
    if (!cart.length || submitting.current) return;
    const form = Object.fromEntries(new FormData(event.currentTarget).entries());
    setErrorItemId(null);
    const designItem = cart.find((item) => validateDesignItem(item));
    if (designItem) {
      setErrorItemId(designItem.id);
      setSubmitError(validateDesignItem(designItem));
      return;
    }
    const addressError = delivery === 'shipping' ? validateAddress(form) : null;
    if (addressError) {
      setSubmitError(addressError);
      return;
    }
    if (!String(form.venmo_username || '').trim() || form.venmo_verified !== '1') {
      setSubmitError('Enter your Venmo username and check the box to confirm it.');
      return;
    }
    submitting.current = true;
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const payload = JSON.stringify({ ...form, delivery_method: delivery, items: cart });
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
      const fingerprint = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
      let previous = retry.current;
      try { previous = JSON.parse(sessionStorage.getItem('loveandco-checkout-retry')) || previous; } catch {}
      const key = previous?.fingerprint === fingerprint ? previous.key : crypto.randomUUID();
      retry.current = { fingerprint, key };
      try { sessionStorage.setItem('loveandco-checkout-retry', JSON.stringify(retry.current)); } catch {}
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
        body: payload,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Your order didn’t go through. Please try again.');
      retry.current = null;
      try { sessionStorage.removeItem('loveandco-checkout-retry'); } catch {}
      const receipt = {
        id: result.order?.id || '',
        total,
        email: form.email,
        delivery,
        address: pickAddress(form),
        items: cart.map(({ name, quantity }) => ({ name, quantity })),
        warning: result.warning,
      };
      try { sessionStorage.setItem('loveandco-order', JSON.stringify(receipt)); } catch {}
      // One commit for both, so the bag never renders empty before the receipt.
      flushSync(() => { setSubmitted(receipt); setCart([]); });
    } catch (error) {
      setSubmitError(error.message || 'Your order didn’t go through. Please try again, or contact me directly.');
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  // A new item in the bag means a new order; drop the old receipt (state adjusted during render).
  if (submitted && cart.length) {
    try { sessionStorage.removeItem('loveandco-order'); } catch {}
    setSubmitted(null);
  }

  if (!ready) return <main className="checkout-page"><p role="status">Loading your bag…</p></main>;

  if (submitted && !cart.length) {
    return (
      <main className="checkout-page">
        <section className="checkout-confirm">
          <p className="eyebrow">ORDER RECEIVED</p>
          <h1>Thank you — your order is with me.</h1>
          {submitted.id && <p><strong>Order #{submitted.id.slice(0, 8)}</strong> · estimated ${Number(submitted.total || 0).toFixed(2)} before shipping. Keep this number for any questions.</p>}
          {submitted.items?.length > 0 && (
            <ul>{submitted.items.map((item, index) => <li key={index}>{item.name} × {item.quantity}</li>)}</ul>
          )}
          {submitted.delivery === 'pickup' ? <p>Local pickup</p> : submitted.address?.address_line && (
            <p>Ship to {[submitted.address.address_line, submitted.address.address_line2, submitted.address.city, `${submitted.address.region} ${submitted.address.postal_code}`].filter(Boolean).join(', ')}</p>
          )}
          {submitted.email && <p>A receipt was sent to {submitted.email}.</p>}
          {submitted.warning && <p className="form-error" role="status">{submitted.warning}</p>}
          <TurnaroundNote />
          <p>I’ll review your details and send a Venmo request. Stitching starts once it’s paid. You can <Link href={user ? '/account' : '/login?mode=signup&next=/account'}>follow status from your account</Link> if you used the same email. Questions? <Link href="/contact">Contact me</Link>.</p>
          <Link href="/shop" className="soft-button" onClick={() => { try { sessionStorage.removeItem('loveandco-order'); } catch {} }}>Continue shopping</Link>
        </section>
      </main>
    );
  }

  if (!cart.length) {
    return (
      <main className="checkout-page">
        <section className="checkout-confirm">
          <p className="eyebrow">CHECKOUT</p>
          <h1>Your bag is empty.</h1>
          <p>Add a piece from the shop, then come back to complete your order.</p>
          <Link href="/shop" className="soft-button">Go to the shop</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="checkout-page">
      <section className="page-intro">
        <p className="eyebrow">CHECKOUT</p>
        <h1>Complete your order</h1>
        <ol className="checkout-steps">
          <li>Send your order</li>
          <li>I review it and send a Venmo request</li>
          <li>Stitching starts once that’s paid</li>
        </ol>
        <TurnaroundNote />
      </section>

      <form className="checkout-grid" onSubmit={submitOrder}>
        <p className="checkout-mobile-total"><span>{hasCustomItem ? 'Priced total' : 'Estimated total'}</span> <b>${total.toFixed(2)}</b></p>
        <section className="checkout-items">
          <p className="eyebrow">YOUR PIECES</p>
          {cart.map((item) => {
            const fee = designFee(item);
            return (
              <article className="checkout-line" key={item.id}>
                <StoreImage src={item.image} alt="" sizes="(min-width: 1100px) 315px, 80px" />
                <div className="checkout-line-copy">
                  <div className="checkout-line-head">
                    <div>
                      <h2>{item.name}</h2>
                      <p>{item.isCustom ? 'Quoted after review' : isPerPersonPackage(item) ? `$${basePrice(item).toFixed(2)} per person · hat + tote` : `$${basePrice(item).toFixed(2)} each`}</p>
                      {summarizeBundleAddons(item) && <p className="helper">{summarizeBundleAddons(item)}</p>}
                    </div>
                    <strong>{item.isCustom ? 'TBD' : `$${lineTotal(item).toFixed(2)}`}</strong>
                  </div>
                  {!item.isCustom && item.wantsDesign && fee > 0 && (
                    <p className="helper">Custom design · ${fee.toFixed(2)}</p>
                  )}
                  {(item.wantsDesign || item.isCustom) && summarizeDesign(item) && (
                    <p className="checkout-design-summary">{summarizeDesign(item)}</p>
                  )}
                  {!item.isCustom && item.wantsDesign && (
                    <details className="checkout-edit-design" open={errorItemId === item.id && Boolean(submitError) ? true : undefined}>
                      <summary>Edit design</summary>
                      <DesignFields
                        item={item}
                        onChange={(next) => updateItem(item.id, next)}
                        showTheme={isBabyBundle(item)}
                        napkinFields={isTieredNapkins(item)}
                        towelFields={isMonogramTowel(item)}
                      />
                    </details>
                  )}
                  {errorItemId === item.id && submitError && <p className="form-error" role="alert" tabIndex={-1} ref={errorRef}>{submitError}</p>}
                  <div className="checkout-line-total">
                    <div className="cart-controls">
                      <div>
                        <button type="button" aria-label={`Remove one ${item.name}`} disabled={item.quantity <= (isTieredNapkins(item) ? NAPKIN_MIN_QTY : 1)} onClick={() => updateItem(item.id, { quantity: item.quantity - 1 })}><Dash /></button>
                        <span>{item.quantity}</span>
                        <button type="button" aria-label={`Add one ${item.name}`} disabled={item.quantity >= 500} onClick={() => updateItem(item.id, { quantity: item.quantity + 1 })}><Plus /></button>
                      </div>
                      <button type="button" className="remove-link" onClick={() => removeItem(item.id)}>Remove</button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <aside className="checkout-side">
          <div className="checkout-summary-card">
            <p className="eyebrow">SUMMARY</p>
            <p><span>Pieces</span><b>${itemsTotal.toFixed(2)}</b></p>
            <p><span>Design fees</span><b>${designTotal.toFixed(2)}</b></p>
            <p className="checkout-grand"><span>{hasCustomItem ? 'Priced total' : 'Estimated total'}</span><b>${total.toFixed(2)}</b></p>
            {hasCustomItem && <small>Custom pieces are quoted after review and are not in this total.</small>}
            <small>Estimated before shipping.</small>
          </div>

          <div className="checkout-summary-card">
            <p className="eyebrow">YOUR DETAILS</p>
            {!user && <p className="helper">Have an account? <Link href="/login?next=/checkout">Sign in</Link> to prefill and track this order. · <Link href="/login?mode=signup&next=/checkout">Create one</Link></p>}
            <label>Name<input name="name" required autoComplete="name" defaultValue={user?.full_name || ''} /></label>
            <label>Email<input type="email" name="email" required autoComplete="email" defaultValue={user?.email || ''} /></label>
            <label>Phone (optional)<PhoneInput name="phone" defaultValue={user?.phone || ''} /></label>
          </div>

          <div className="checkout-summary-card">
            <p className="eyebrow">SHIP TO</p>
            {website?.info?.pickupEnabled && (
              <fieldset className="checkout-delivery">
                <legend>Delivery method</legend>
                <label className="save-address"><input type="radio" name="delivery_method" value="shipping" checked={delivery === 'shipping'} onChange={(e) => setDelivery(e.target.value)} /><span>Shipping</span></label>
                <label className="save-address"><input type="radio" name="delivery_method" value="pickup" checked={delivery === 'pickup'} onChange={(e) => setDelivery(e.target.value)} /><span>Local pickup</span></label>
              </fieldset>
            )}
            <fieldset className="checkout-address" disabled={delivery !== 'shipping'} hidden={delivery !== 'shipping'}><AddressFields defaultAddress={user} required={delivery === 'shipping'} /></fieldset>
            {delivery === 'pickup' && <p>{website?.info?.pickupInstructions}</p>}
            {user && delivery === 'shipping' && (
              <label className="save-address">
                <input type="checkbox" name="save_address" value="1" defaultChecked={hasAddressInput(user)} />
                <span>Save this address to my account</span>
              </label>
            )}
          </div>

          <div className="checkout-summary-card">
            <p className="eyebrow">PAYMENT</p>
            <label>Venmo username
              <input
                name="venmo_username"
                required
                placeholder="@username"
                autoComplete="off"
                value={venmo}
                onChange={(event) => {
                  setVenmo(event.target.value);
                  setVenmoVerified(false);
                }}
              />
            </label>
            <label className="save-address">
              <input
                type="checkbox"
                name="venmo_verified"
                value="1"
                required
                checked={venmoVerified}
                onChange={(event) => setVenmoVerified(event.target.checked)}
              />
              <span>This Venmo username is correct</span>
            </label>
            {user && (
              <label className="save-address">
                <input type="checkbox" name="save_venmo" value="1" defaultChecked={Boolean(user.venmo_username)} />
                <span>Save this Venmo username to my account</span>
              </label>
            )}
          </div>

          <div className="checkout-summary-card">
            <label>Anything else?<textarea name="customer_notes" placeholder="Gift note, drop-off, or other details" /></label>
            {paused && <p className="form-error" role="status">{website.pausedMessage || 'New orders are paused right now. Please check back soon.'}</p>}
            {submitError && !lineError && <p className="form-error" role="alert" tabIndex={-1} ref={errorRef}>{submitError}</p>}
            <button className="studio-primary" type="submit" disabled={isSubmitting || paused}>{paused ? 'Orders paused' : isSubmitting ? 'Sending order…' : hasCustomItem ? 'Send order' : `Send order · $${total.toFixed(2)}`}</button>
            <Link className="continue-shopping" href="/shop">Back to shop</Link>
          </div>
        </aside>
      </form>
    </main>
  );
}
