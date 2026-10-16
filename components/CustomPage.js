'use client';

import { useState } from 'react';
import { CUSTOM_TYPES } from '@/lib/catalog';
import { openBag } from '@/lib/cart';
import { useCart } from '@/lib/use-cart';
import { parseCustomQuantity } from '@/lib/custom-order';
import FancySelect from './FancySelect';
import TurnaroundNote from './TurnaroundNote';

const customProduct = {
  id: 'custom-order',
  name: 'Custom piece',
  detail: 'A one-of-a-kind project, quoted after review.',
  image: '/images/Gift_4.jpg',
  price: null,
  embroideryPrice: null,
  isCustom: true,
};
const emptyDraft = { type: '', item: '', quantity: '1', color: '', personalization: '', details: '', neededBy: '' };

export default function CustomPage() {
  const [, setCart] = useCart();
  const [draft, setDraft] = useState(emptyDraft);

  const addCustomToCart = (event) => {
    event.preventDefault();
    const quantity = parseCustomQuantity(draft.quantity);
    if (quantity === null) return;
    const projectType = CUSTOM_TYPES[draft.type];
    const details = [
      `Category: ${projectType.label}`,
      `Item: ${draft.item}`,
      draft.color && `Color / material: ${draft.color}`,
      draft.personalization && `Personalization: ${draft.personalization}`,
      draft.neededBy && `Needed by: ${draft.neededBy}`,
      draft.details && `Project details: ${draft.details}`,
    ].filter(Boolean).join('\n');
    setCart((items) => [...items, {
      ...customProduct,
      id: `custom-${crypto.randomUUID()}`,
      quantity,
      personalization: details,
      custom_details: { ...draft, quantity: String(quantity) },
    }]);
    setDraft(emptyDraft);
    openBag();
  };

  return (
    <main className="custom-route">
      <section className="custom-hero">
        <p className="eyebrow">MADE JUST FOR YOU</p>
        <h1>Custom</h1>
        <p>Tell me what you’re dreaming up. I’ll review it and send a quote before anything is stitched.</p>
        <TurnaroundNote />
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
          <label>Choose a piece
            <FancySelect
              required
              value={draft.item}
              placeholder="Choose a piece"
              onChange={(value) => setDraft({ ...draft, item: value })}
              options={CUSTOM_TYPES[draft.type].items.map((item) => ({ value: item, label: item }))}
            />
          </label>
        )}
        <div className="form-row">
          <label>How many?<input type="number" min="1" max="500" step="1" required value={draft.quantity} onChange={(event) => setDraft({ ...draft, quantity: event.target.value })} /></label>
          <label>Color / material<input value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })} placeholder="Optional" /></label>
        </div>
        <label>Personalization<input value={draft.personalization} onChange={(event) => setDraft({ ...draft, personalization: event.target.value })} placeholder="Names, monogram, wording" /></label>
        <label>Needed by<input type="date" min={new Date().toISOString().slice(0, 10)} value={draft.neededBy} onChange={(event) => setDraft({ ...draft, neededBy: event.target.value })} /></label>
        <label>Project details<textarea required value={draft.details} onChange={(event) => setDraft({ ...draft, details: event.target.value })} placeholder="Tell me about your idea, inspiration, or anything else I should know." /></label>
        <button className="studio-primary" type="submit">Add custom piece to bag</button>
      </form>
    </main>
  );
}
