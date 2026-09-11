'use client';

import { useState } from 'react';
import { CUSTOM_TYPES } from '@/lib/catalog';
import { loadCart, persistCart } from '@/lib/cart';
import { openCart } from '@/lib/cart-ui';
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
  const [draft, setDraft] = useState(emptyDraft);

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
    persistCart([...loadCart(), {
      ...customProduct,
      id: `custom-${crypto.randomUUID()}`,
      quantity: 1,
      personalization: details,
      custom_details: draft,
    }]);
    setDraft(emptyDraft);
    openCart();
  };

  return (
    <main className="custom-route">
      <section className="shop-hero shop-hero--center">
        <div className="container">
          <p className="eyebrow">Made just for you</p>
          <h1>A special idea, <i>made just for you.</i></h1>
          <p>Tell me what you’re dreaming up. I’ll review it and send a quote before anything is stitched.</p>
          <TurnaroundNote turnaround={turnaround} />
        </div>
      </section>

      <section className="section section--tight">
        <div className="container">
          <form className="form-card" onSubmit={addCustomToCart}>
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
            <div className="form-grid form-grid--2">
              <label>How many?<input type="number" min="1" required value={draft.quantity} onChange={(event) => setDraft({ ...draft, quantity: event.target.value })} /></label>
              <label>Color / material<input value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })} placeholder="Optional" /></label>
            </div>
            <label>Personalization<input value={draft.personalization} onChange={(event) => setDraft({ ...draft, personalization: event.target.value })} placeholder="Names, monogram, wording" /></label>
            <label>Needed by<input type="date" value={draft.neededBy} onChange={(event) => setDraft({ ...draft, neededBy: event.target.value })} /></label>
            <label>Project details<textarea required value={draft.details} onChange={(event) => setDraft({ ...draft, details: event.target.value })} placeholder="Tell me about your idea, inspiration, or anything else I should know." /></label>
            <div className="form-actions">
              <button className="btn btn--primary" type="submit">Add custom order to bag</button>
            </div>
          </form>
        </div>
      </section>

    </main>
  );
}
