'use client';

import StoreImage from './StoreImage';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Dash, Plus } from 'react-bootstrap-icons';
import { CART_EVENT, NAPKIN_MIN_QTY, addonTotal, basePrice, cartTotal, designFee, isPerPersonPackage, isTieredNapkins, lineTotal, orderDesignFee, summarizeBundleAddons } from '@/lib/catalog';
import { useCart } from '@/lib/use-cart';
import { hasAddressInput, validateAddress } from '@/lib/address';
import { summarizeDesign, validateDesignItem } from '@/lib/design-options';
import AddressFields from './AddressFields';
import PhoneInput from './PhoneInput';
import TurnaroundNote from './TurnaroundNote';

export default function Checkout({ user, turnaround, website }) {
  const [cart, setCart, ready] = useCart();
  const submitting = useRef(false);
  const retry = useRef(null);
  const [delivery, setDelivery] = useState('shipping');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [venmo, setVenmo] = useState(user?.venmo_username || '');
  const [venmoVerified, setVenmoVerified] = useState(false);

  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
  const itemsTotal = useMemo(() => cart.reduce((sum, item) => (
    item.isCustom ? sum : sum + basePrice(item) * item.quantity + addonTotal(item)
  ), 0), [cart]);
  const designTotal = useMemo(() => cart.reduce((sum, item) => (
    item.isCustom || !item.wantsDesign ? sum : sum + designFee(item) * item.quantity
  ), 0) + orderDesignFee(cart), [cart]);
  const total = useMemo(() => cartTotal(cart), [cart]);
  const hasCustomItem = cart.some((item) => item.isCustom);

  const updateItem = (id, patch) => setCart((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  const removeItem = (id) => setCart((items) => items.filter((item) => item.id !== id));

  const submitOrder = async (event) => {
    event.preventDefault();
    if (!cart.length || submitting.current) return;
    const form = Object.fromEntries(new FormData(event.currentTarget).entries());
    const designError = cart.map(validateDesignItem).find(Boolean);
    if (designError) {
      setSubmitError(designError);
      return;
    }
    const addressError = delivery === 'shipping' ? validateAddress(form) : null;
    if (addressError) {
      setSubmitError(addressError);
      return;
    }
    if (!String(form.venmo_username || '').trim() || form.venmo_verified !== '1') {
      setSubmitError('Confirm your Venmo username is correct.');
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
      if (!response.ok) throw new Error(result.error || 'Your order could not be sent.');
      retry.current = null;
      try { sessionStorage.removeItem('loveandco-checkout-retry'); } catch {}
      setIsSubmitted(true);
      setCart([]);
    } catch (error) {
      setSubmitError(error.message || 'Your order could not be sent. Please try again or contact us directly.');
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  if (!ready) return <main className="checkout-page"><p role="status">Loading your bag…</p></main>;

  if (isSubmitted) {
    return (
      <main className="checkout-page">
        <section className="checkout-confirm">
          <p className="eyebrow">ORDER RECEIVED</p>
          <h1>Thank you — your order is with us.</h1>
          <TurnaroundNote turnaround={turnaround} />
          <p>I’ll review your details and send a Venmo request. Production begins after that payment is received. You can follow status from your account if you used the same email.</p>
          <Link href="/shop" className="soft-button">Continue shopping</Link>
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
        <p>Review your bag and send your details. Custom design notes were saved when you added each piece. I only take Venmo after I review the order.</p>
        <TurnaroundNote turnaround={turnaround} />
      </section>

      <form className="checkout-grid" onSubmit={submitOrder}>
        <section className="checkout-items">
          <p className="eyebrow">YOUR PIECES</p>
          {cart.map((item) => {
            const fee = designFee(item);
            return (
              <article className="checkout-line" key={item.id}>
                <StoreImage src={item.image} alt="" />
                <div className="checkout-line-copy">
                  <div className="checkout-line-head">
                    <div>
                      <h2>{item.name}</h2>
                      <p>{item.isCustom ? 'Quoted after review' : isPerPersonPackage(item) ? `$${basePrice(item).toFixed(2)} per person · hat + tote` : isTieredNapkins(item) ? `$${basePrice(item).toFixed(2)} each` : `Item $${basePrice(item).toFixed(2)} each`}</p>
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
                  <div className="checkout-line-total">
                    <div className="cart-controls">
                      <div>
                        <button type="button" aria-label={`Remove one ${item.name}`} onClick={() => {
                          const min = isTieredNapkins(item) ? NAPKIN_MIN_QTY : 1;
                          return item.quantity <= min ? removeItem(item.id) : updateItem(item.id, { quantity: item.quantity - 1 });
                        }}><Dash /></button>
                        <span>{item.quantity}</span>
                        <button type="button" aria-label={`Add one ${item.name}`} onClick={() => updateItem(item.id, { quantity: item.quantity + 1 })}><Plus /></button>
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
          <p className="eyebrow">DETAILS</p>
          <div className="checkout-summary-card">
            <p className="eyebrow">SUMMARY</p>
            <p><span>Items</span><b>${itemsTotal.toFixed(2)}</b></p>
            <p><span>Design fees</span><b>${designTotal.toFixed(2)}</b></p>
            <p className="checkout-grand"><span>{hasCustomItem ? 'Priced total' : 'Estimated total'}</span><b>${total.toFixed(2)}</b></p>
            {hasCustomItem && <small>Custom pieces are quoted after review and are not in this total.</small>}
          </div>

          <div className="checkout-summary-card">
            <p className="eyebrow">YOUR DETAILS</p>
            <label>Name<input name="name" required autoComplete="name" defaultValue={user?.full_name || ''} /></label>
            <label>Email<input type="email" name="email" required autoComplete="email" defaultValue={user?.email || ''} /></label>
            <label>Phone<PhoneInput name="phone" defaultValue={user?.phone || ''} /></label>
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
            <p className="helper">I’ll send the Venmo request here after I review your order.</p>
          </div>

          <div className="checkout-summary-card">
            <p className="eyebrow">SHIP TO</p>
            <label>Delivery method<select name="delivery_method" value={delivery} onChange={(e) => setDelivery(e.target.value)}><option value="shipping">Shipping</option>{website?.info?.pickupEnabled && <option value="pickup">Local pickup</option>}</select></label>
            {delivery === 'shipping' ? <AddressFields defaultAddress={user} /> : <p>{website?.info?.pickupInstructions}</p>}
            {user ? (
              <label className="save-address">
                <input type="checkbox" name="save_address" value="1" defaultChecked={hasAddressInput(user)} />
                <span>Save this address to my account</span>
              </label>
            ) : (
              <p className="helper">Want this saved for next time? <Link href="/login?next=/checkout">Sign in</Link> first.</p>
            )}
            <label>Anything else?<textarea name="customer_notes" placeholder="Gift note, drop-off, or other details" /></label>
            {!user && <p className="helper">Want to track this later? <Link href="/login?next=/account">Create an account</Link> with the same email.</p>}
            {submitError && <p className="form-error" role="alert">{submitError}</p>}
            <button className="studio-primary" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Sending order…' : 'Place order'}</button>
            <Link className="continue-shopping" href="/shop">Back to shop</Link>
          </div>
        </aside>
      </form>
    </main>
  );
}
