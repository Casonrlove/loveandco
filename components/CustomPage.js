'use client';

import { useModalFocus } from '@/lib/use-modal-focus';

import { useMemo, useState } from 'react';
import { Dash, Plus, X } from 'react-bootstrap-icons';
import Link from 'next/link';
import { CART_EVENT, CART_KEY, CUSTOM_TYPES, basePrice, designFee, itemPrice } from '@/lib/catalog';
import { useCart } from '@/lib/use-cart';
import FancySelect from './FancySelect';
import TurnaroundNote from './TurnaroundNote';

const customProduct = {
  id: 'custom-order',
  name: 'Custom Order',
  detail: 'A one-of-a-kind project, quoted after review.',
  image: '/images/Gift_4.jpg',
  price: null,
  embroideryPrice: null,
  isCustom: true,
};
const emptyDraft = { type: '', item: '', quantity: '1', color: '', personalization: '', details: '', neededBy: '' };

export default function CustomPage({ turnaround }) {
  const [cart, setCart] = useCart();
  const [isBagOpen, setIsBagOpen] = useState(false);
  const bagDialog = useModalFocus(isBagOpen, () => setIsBagOpen(false));
  const [draft, setDraft] = useState(emptyDraft);

  const bag = cart;
  const hasCustomItem = bag.some((item) => item.isCustom);
  const total = useMemo(() => bag.reduce((sum, item) => sum + itemPrice(item) * item.quantity, 0), [bag]);
  const updateItem = (id, patch) => setCart((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  const removeItem = (id) => setCart((items) => items.filter((item) => item.id !== id));

  const addCustomToCart = (event) => {
    event.preventDefault();
    const projectType = CUSTOM_TYPES[draft.type];
    const details = [
      `Category: ${projectType.label}`,
      `Item: ${draft.item}`,
      `Quantity: ${draft.quantity}`,
      draft.color && `Color / material: ${draft.color}`,
      draft.personalization && `Personalization: ${draft.personalization}`,
      draft.neededBy && `Needed by: ${draft.neededBy}`,
      draft.details && `Project details: ${draft.details}`,
    ].filter(Boolean).join('\n');
    setCart((items) => [...items, {
      ...customProduct,
      id: `custom-${crypto.randomUUID()}`,
      quantity: 1,
      personalization: details,
      custom_details: draft,
    }]);
    setDraft(emptyDraft);
    setIsBagOpen(true);
  };

  return (
    <main className="custom-route">
      <section className="custom-hero">
        <p className="eyebrow">MADE JUST FOR YOU</p>
        <h1>Custom</h1>
        <p>Tell me what you’re dreaming up. I’ll review it and send a quote before anything is stitched.</p>
        <TurnaroundNote turnaround={turnaround} />
      </section>

      <form className="order-form custom-page-form" onSubmit={addCustomToCart}>
        <label>What are we making?
          <FancySelect
            required
            value={draft.type}
            placeholder="Choose a category"
            onChange={(value) => setDraft({ ...draft, type: value, item: '' })}
            options={Object.entries(CUSTOM_TYPES).map(([value, option]) => ({ value, label: option.label }))}
          />
        </label>
        {draft.type && (
          <label>Choose an item
            <FancySelect
              required
              value={draft.item}
              placeholder="Choose an item"
              onChange={(value) => setDraft({ ...draft, item: value })}
              options={CUSTOM_TYPES[draft.type].items.map((item) => ({ value: item, label: item }))}
            />
          </label>
        )}
        <div className="form-row">
          <label>How many?<input type="number" min="1" required value={draft.quantity} onChange={(event) => setDraft({ ...draft, quantity: event.target.value })} /></label>
          <label>Color / material<input value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })} placeholder="Optional" /></label>
        </div>
        <label>Personalization<input value={draft.personalization} onChange={(event) => setDraft({ ...draft, personalization: event.target.value })} placeholder="Names, monogram, wording" /></label>
        <label>Needed by<input type="date" value={draft.neededBy} onChange={(event) => setDraft({ ...draft, neededBy: event.target.value })} /></label>
        <label>Project details<textarea required value={draft.details} onChange={(event) => setDraft({ ...draft, details: event.target.value })} placeholder="Tell me about your idea, inspiration, or anything else I should know." /></label>
        <button className="studio-primary" type="submit">Add custom order to bag</button>
      </form>

      {isBagOpen && (
        <aside ref={bagDialog} tabIndex={-1} role="dialog" aria-modal="true" className="cart-drawer" aria-label="Shopping bag">
          <button className="drawer-close" type="button" onClick={() => setIsBagOpen(false)} aria-label="Close bag"><X /></button>
          <p className="eyebrow">YOUR BAG</p>
          <h2>Good things are coming.</h2>
          {bag.length === 0 ? <p>Your bag is waiting for something special.</p> : (
            <>
              <div className="cart-items">
                {bag.map((item) => (
                  <article className="cart-line" key={item.id}>
                    <div>
                      <strong>{item.name}</strong>
                      <span>{item.isCustom ? 'Price to be confirmed after review' : `$${basePrice(item).toFixed(2)} each`}</span>
                      {!item.isCustom && item.wantsDesign && designFee(item) > 0 && (
                        <span className="cart-design-fee">Custom design +${designFee(item).toFixed(2)}</span>
                      )}
                    </div>
                    <div className="cart-controls">
                      <div>
                        <button type="button" aria-label={`Remove one ${item.name}`} onClick={() => item.quantity === 1 ? removeItem(item.id) : updateItem(item.id, { quantity: item.quantity - 1 })}><Dash /></button>
                        <span>{item.quantity}</span>
                        <button type="button" aria-label={`Add one ${item.name}`} onClick={() => updateItem(item.id, { quantity: item.quantity + 1 })}><Plus /></button>
                      </div>
                      <button type="button" className="remove-link" onClick={() => removeItem(item.id)}>Remove</button>
                    </div>
                  </article>
                ))}
              </div>
              <div className="cart-total">
                <span>{hasCustomItem ? 'Priced items subtotal' : 'Estimated total'}</span>
                <strong>${total.toFixed(2)}</strong>
              </div>
              {hasCustomItem && <small>Custom items are quoted after review and are not included in this subtotal.</small>}
              <Link className="studio-primary" href="/checkout" onClick={() => setIsBagOpen(false)}>Continue to checkout</Link>
            </>
          )}
        </aside>
      )}
    </main>
  );
}
