'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Dash, Plus } from 'react-bootstrap-icons';
import { CART_EVENT, NAPKIN_MIN_QTY, addonTotal, basePrice, cartTotal, designFee, isPerPersonPackage, isTieredNapkins, lineTotal, orderDesignFee, summarizeBundleAddons } from '@/lib/catalog';
import { loadCart, persistCart } from '@/lib/cart';
import { hasAddressInput, validateAddress } from '@/lib/address';
import { summarizeDesign, validateDesignItem } from '@/lib/design-options';
import AddressFields from './AddressFields';
import PhoneInput from './PhoneInput';
import TurnaroundNote from './TurnaroundNote';
import { createClient } from '@/lib/supabase/client';

export default function Checkout({ user, turnaround }) {
  const router = useRouter();
  const [cart, setCart] = useState([]);
  const [ready, setReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [venmo, setVenmo] = useState(user?.venmo_username || '');
  const [venmoVerified, setVenmoVerified] = useState(false);

  useEffect(() => {
    setCart(loadCart());
    setReady(true);
  }, []);
  // The bag drawer lives in the layout and can edit the cart while this page
  // is open, so mirror storage back into local state when it changes.
  useEffect(() => {
    const sync = () => {
      const next = loadCart();
      setCart((current) => (JSON.stringify(current) === JSON.stringify(next) ? current : next));
    };
    window.addEventListener(CART_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CART_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  useEffect(() => {
    if (user?.venmo_username) {
      setVenmo((current) => current.trim() ? current : user.venmo_username);
      return;
    }
    if (!user) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.from('profiles').select('venmo_username').eq('id', user.id).maybeSingle();
        if (!cancelled && data?.venmo_username) {
          setVenmo((current) => current.trim() ? current : data.venmo_username);
        }
      } catch {
        /* keep whatever is already in the field */
      }
    })();
    return () => { cancelled = true; };
  }, [user]);
  useEffect(() => {
    if (!ready) return;
    persistCart(cart);
  }, [cart, ready]);

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
    if (!cart.length) return;
    const form = Object.fromEntries(new FormData(event.currentTarget).entries());
    const designError = cart.map(validateDesignItem).find(Boolean);
    if (designError) {
      setSubmitError(designError);
      return;
    }
    const addressError = validateAddress(form);
    if (addressError) {
      setSubmitError(addressError);
      return;
    }
    if (!String(form.venmo_username || '').trim() || form.venmo_verified !== '1') {
      setSubmitError('Confirm your Venmo username is correct.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, items: cart }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Your order could not be sent.');
      setIsSubmitted(true);
      setCart([]);
      persistCart([]);
      window.dispatchEvent(new Event(CART_EVENT));
    } catch (error) {
      setSubmitError(error.message || 'Your order could not be sent. Please try again or contact us directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!ready) return <main className="section" />;

  if (isSubmitted) {
    return (
      <main className="section">
        <div className="container">
          <section className="checkout-confirm">
            <p className="eyebrow">Order received</p>
            <h1>Thank you — your order is with us.</h1>
            <p>I’ll review your details and send a Venmo request. Production begins after that payment is received. You can follow status from your account if you used the same email.</p>
            <TurnaroundNote turnaround={turnaround} />
            <Link href="/shop" className="btn btn--primary">Continue shopping</Link>
          </section>
        </div>
      </main>
    );
  }

  if (!cart.length) {
    return (
      <main className="section">
        <div className="container">
          <section className="checkout-confirm">
            <p className="eyebrow">Checkout</p>
            <h1>Your bag is empty.</h1>
            <p>Add a piece from the shop, then come back to complete your order.</p>
            <Link href="/shop" className="btn btn--primary">Go to the shop</Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="section">
      <div className="container">
        <div className="page-head">
          <p className="eyebrow">Checkout</p>
          <h1>Complete your order</h1>
          <p>Review your bag and send your details. Custom design notes were saved when you added each piece. I only take Venmo after I review the order.</p>
          <TurnaroundNote turnaround={turnaround} />
        </div>

        <form className="checkout-grid" onSubmit={submitOrder}>
          <section className="checkout-items">
            <p className="eyebrow">Your pieces</p>
            {cart.map((item) => {
              const fee = designFee(item);
              return (
                <article className="checkout-line" key={item.id}>
                  <img src={item.image} alt="" />
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
                      <p className="checkout-design-summary">Custom design · ${fee.toFixed(2)}</p>
                    )}
                    {(item.wantsDesign || item.isCustom) && summarizeDesign(item) && (
                      <p className="checkout-design-summary">{summarizeDesign(item)}</p>
                    )}
                    <div className="checkout-line-total">
                      <div className="cart-controls">
                        <div className="qty-stepper">
                          <button type="button" aria-label={`Remove one ${item.name}`} onClick={() => {
                            const min = isTieredNapkins(item) ? NAPKIN_MIN_QTY : 1;
                            return item.quantity <= min ? removeItem(item.id) : updateItem(item.id, { quantity: item.quantity - 1 });
                          }}><Dash aria-hidden="true" /></button>
                          <span>{item.quantity}</span>
                          <button type="button" aria-label={`Add one ${item.name}`} onClick={() => updateItem(item.id, { quantity: item.quantity + 1 })}><Plus aria-hidden="true" /></button>
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
            <div className="checkout-card">
              <p className="eyebrow">Summary</p>
              <p className="summary-row"><span>Items</span><b>${itemsTotal.toFixed(2)}</b></p>
              <p className="summary-row"><span>Design fees</span><b>${designTotal.toFixed(2)}</b></p>
              <p className="summary-row summary-total"><span>{hasCustomItem ? 'Priced total' : 'Estimated total'}</span><b>${total.toFixed(2)}</b></p>
              {hasCustomItem && <small>Custom pieces are quoted after review and are not in this total.</small>}
            </div>

            <div className="checkout-card">
              <p className="eyebrow">Your details</p>
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
              <label className="choice">
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
                <label className="choice">
                  <input type="checkbox" name="save_venmo" value="1" defaultChecked={Boolean(user.venmo_username)} />
                  <span>Save this Venmo username to my account</span>
                </label>
              )}
              <p className="helper">I’ll send the Venmo request here after I review your order.</p>
            </div>

            <div className="checkout-card">
              <p className="eyebrow">Ship to</p>
              <AddressFields defaultAddress={user} />
              {user ? (
                <label className="choice">
                  <input type="checkbox" name="save_address" value="1" defaultChecked={hasAddressInput(user)} />
                  <span>Save this address to my account</span>
                </label>
              ) : (
                <p className="helper">Want this saved for next time? <Link href="/login?next=/checkout">Sign in</Link> first.</p>
              )}
              <label>Anything else?<textarea name="customer_notes" placeholder="Gift note, drop-off, or other details" /></label>
              {!user && <p className="helper">Want to track this later? <Link href="/login?next=/account">Create an account</Link> with the same email.</p>}
              {submitError && <p className="form-error" role="alert">{submitError}</p>}
              <div className="form-actions">
                <button className="btn btn--primary btn--block" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Sending order…' : 'Place order'}</button>
                <button className="btn btn--ghost btn--block" type="button" onClick={() => router.push('/shop')}>Back to shop</button>
              </div>
            </div>
          </aside>
        </form>
      </div>
    </main>
  );
}
