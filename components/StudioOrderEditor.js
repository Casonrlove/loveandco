'use client';

import StudioProofs from './StudioProofs';
import { trackingUrl } from '@/lib/operations-utils';
import { useEffect, useState } from 'react';
import { fulfillmentStatuses, paymentStatuses } from '@/lib/studio-operations';
import { proofRows } from '@/lib/design-options';
const label = (value) => value.replaceAll('_', ' ');
const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

export default function StudioOrderEditor({ order, onSaved, onDirty }) {
  const [draft, setDraft] = useState(() => ({ ...order, items: order.items.map((item) => ({ ...item })) }));
  const [staffNotes, setStaffNotes] = useState('');
  const [notesReady, setNotesReady] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/studio/orders/${order.id}`, { signal: controller.signal }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load private notes. Reopen this order to retry.');
      setStaffNotes(data.staffNotes); setNotesReady(true);
    }).catch((error) => { if (error.name !== 'AbortError') setMessage(error.message); });
    return () => controller.abort();
  }, [order.id]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  const field = (key, value) => { setDirty(true); setDraft((d) => ({ ...d, [key]: value })); };
  const itemField = (id, key, value) => { setDirty(true); setDraft((d) => ({ ...d, items: d.items.map((i) => i.id === id ? { ...i, [key]: value } : i) })); };
  const quoteText = `Hi ${order.name},\n\nYour Love & Co. quote is ${money(order.subtotal)}.\n${order.items.map((item) => `${item.quantity} × ${item.name}`).join('\n')}\n\nPlease reply to confirm your design and shipping details. Production begins after payment is confirmed.\n\nLove & Co. Embroidery`;
  const total = draft.items.reduce((sum, item) => sum + (Number(item.item_price || 0) + Number(item.embroidery_price || 0)) * Number(item.quantity || 0), 0);
  const save = async (event) => {
    event.preventDefault();
    if (['refunded', 'cancelled'].some((status) => (draft.payment_status === status && order.payment_status !== status) || (draft.fulfillment_status === status && order.fulfillment_status !== status))) {
      if (!window.confirm('Record this cancellation or refund? Return any payment separately in Venmo.')) return;
    }
    setBusy(true); setMessage('');
    const { name, phone, venmo_username, address_line, address_line2, city, region, postal_code, customer_notes, payment_status, fulfillment_status, priority, tracking_number, items, delivery_method, carrier, pickup_instructions } = draft;
    try {
      const res = await fetch(`/api/studio/orders/${order.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, phone: phone || '', venmo_username: venmo_username || '', address_line: address_line || '', address_line2: address_line2 || '', city: city || '', region: region || '', postal_code: postal_code || '', customer_notes: customer_notes || '', payment_status, fulfillment_status, priority, tracking_number: tracking_number || '', delivery_method: delivery_method || 'shipping', carrier: carrier || '', pickup_instructions: pickup_instructions || '', items, ...(notesReady ? { staff_notes: staffNotes } : {}) }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save order.');
      setDraft(data.order); setDirty(false); onSaved(data.order);
      setMessage(data.warning || (data.notification?.status === 'failed' ? 'Order saved. Customer email failed; contact the customer directly.' : data.notification?.status === 'disabled' ? 'Order saved. Email delivery is not configured.' : 'Order saved.'));
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };
  return <section className="studio-panel order-workbench">
    <div className="queue-title"><div><p className="eyebrow">ORDER · {order.id.slice(0, 8)}</p><h2>{order.name}</h2><a href={`mailto:${encodeURIComponent(order.email)}`}>{order.email}</a></div><strong>{money(total)}</strong></div>
    <div className="order-actions no-print"><button type="button" onClick={() => window.print()}>Print order sheet</button><a className="soft-button" href={`mailto:${encodeURIComponent(order.email)}?subject=${encodeURIComponent('Your Love & Co. order')}`}>Draft customer email</a><a className="soft-button" href={`mailto:${encodeURIComponent(order.email)}?subject=${encodeURIComponent('Your Love & Co. quote')}&body=${encodeURIComponent(quoteText)}`}>Draft quote email</a></div>
    <p className="helper no-print">Status changes may email the customer. Payment statuses record payments handled separately in Venmo.</p>
    <form onSubmit={save} className="order-form">
      <fieldset><legend>Customer & shipping</legend><div className="form-row">
        <label>Customer name<input required maxLength={500} value={draft.name} onChange={(e) => field('name', e.target.value)} /></label>
        <label>Phone<input type="tel" value={draft.phone || ''} onChange={(e) => field('phone', e.target.value)} /></label>
      </div><label>Venmo username<input value={draft.venmo_username || ''} onChange={(e) => field('venmo_username', e.target.value)} /></label>
      <label>Street address<input autoComplete="shipping address-line1" value={draft.address_line || ''} onChange={(e) => field('address_line', e.target.value)} /></label>
      <label>Apartment / unit<input autoComplete="shipping address-line2" value={draft.address_line2 || ''} onChange={(e) => field('address_line2', e.target.value)} /></label>
      <div className="form-row">{[['city', 'City'], ['region', 'State'], ['postal_code', 'ZIP code']].map(([key, text]) => <label key={key}>{text}<input value={draft[key] || ''} onChange={(e) => field(key, e.target.value)} /></label>)}</div></fieldset>
      <fieldset><legend>Items & quote</legend><p className="helper">Prices and minutes are per piece. Saving recalculates the order total.</p>
      {draft.items.map((item) => <article className="studio-line-item" key={item.id}><h3>{item.name}</h3>
        <dl className="design-proof">{proofRows(item.custom_details).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')}</dd></div>)}</dl>
        {item.personalization && <p>{item.personalization}</p>}
        <div className="form-row">{[['quantity', 'Quantity', 1, 500, 1], ['item_price', 'Item price ($)', 0, 100000, 0.01], ['embroidery_price', 'Design fee ($)', 0, 100000, 0.01], ['design_minutes', 'Design minutes', 0, 100000, 1], ['stitch_minutes', 'Stitch minutes', 0, 100000, 1]].map(([key, text, min, max, step]) => <label key={key}>{text}<input type="number" required min={min} max={max} step={step} value={item[key] ?? 0} onChange={(e) => itemField(item.id, key, e.target.value)} /></label>)}</div>
      </article>)}<p className="studio-quote-total">Order total <strong>{money(total)}</strong></p></fieldset>
      <fieldset><legend>Fulfillment</legend><div className="form-row">
        <label>Payment<select value={draft.payment_status} onChange={(e) => field('payment_status', e.target.value)}>{paymentStatuses.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select></label>
        <label>Order status<select value={draft.fulfillment_status} onChange={(e) => field('fulfillment_status', e.target.value)}>{fulfillmentStatuses.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select></label>
        <label>Priority<select value={draft.priority} onChange={(e) => field('priority', e.target.value)}><option value="standard">Standard</option><option value="rush">Rush</option></select></label>
      </div><div className="form-row"><label>Delivery method<select value={draft.delivery_method || 'shipping'} onChange={(e) => field('delivery_method',e.target.value)}><option value="shipping">Shipping</option><option value="pickup">Local pickup</option></select></label><label>Carrier<select value={draft.carrier || ''} onChange={(e) => field('carrier',e.target.value)}><option value="">Choose a carrier</option>{['usps','ups','fedex','dhl'].map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}</select></label></div>
      {draft.delivery_method === 'pickup' && <label>Pickup instructions<textarea maxLength={500} rows={3} value={draft.pickup_instructions || ''} onChange={(e) => field('pickup_instructions',e.target.value)} /></label>}
      <label>Tracking number<input value={draft.tracking_number || ''} onChange={(e) => field('tracking_number', e.target.value)} /></label>{trackingUrl(draft.carrier, draft.tracking_number) && <a href={trackingUrl(draft.carrier, draft.tracking_number)} target="_blank" rel="noopener noreferrer">Open carrier tracking</a>}</fieldset>
      <label>Customer-facing notes<textarea maxLength={10000} rows={3} value={draft.customer_notes || ''} onChange={(e) => field('customer_notes', e.target.value)} /></label>
      <label className="no-print">Private staff notes<textarea disabled={!notesReady} maxLength={10000} rows={4} value={staffNotes} onChange={(e) => { setDirty(true); setStaffNotes(e.target.value); }} /><small>Only visible in Studio. Excluded from the customer account, exports, and printed order sheet.</small></label>
      <div className="studio-save-bar no-print"><span>{dirty ? 'Unsaved changes' : 'Up to date'}</span><button type="submit" className="studio-primary" disabled={busy}>{busy ? 'Saving…' : 'Save order'}</button></div>
      {message && <p role="status" className="studio-feedback no-print">{message}</p>}
    </form>
    <StudioProofs order={order} revision={draft.updated_at} />
  </section>;
}
