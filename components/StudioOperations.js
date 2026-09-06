'use client';
import { useEffect, useMemo, useState } from 'react';
import { customerSummaries, ordersCsv } from '@/lib/studio-operations';

export function exportOrders(orders) {
  const url = URL.createObjectURL(new Blob([ordersCsv(orders)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = 'loveandco-orders.csv'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function StudioCustomers({ orders, openOrder }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const customers = useMemo(() => customerSummaries(orders), [orders]);
  const filtered = customers.filter((c) => `${c.name} ${c.email} ${c.phone || ''}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="studio-panel"><div className="queue-title"><div><p className="eyebrow">CUSTOMER BOOK</p><h2>People behind the pieces</h2></div><span>{customers.length} customers</span></div>
    <label className="studio-search">Search customers<input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} placeholder="Name, email, or phone…" /></label>
    <div className="studio-customer-list">{filtered.slice(page * 25, page * 25 + 25).map((c) => <article key={c.email}><div><h3>{c.name}</h3><a href={`mailto:${encodeURIComponent(c.email)}`}>{c.email}</a><p>{c.phone || 'No phone saved'}</p></div><div><strong>{c.orders.length} orders · ${c.paid.toFixed(2)} paid</strong><details><summary>Order history</summary>{c.orders.map((order) => <button type="button" key={order.id} onClick={() => openOrder(order.id)}>{order.id.slice(0, 8)} · {order.fulfillment_status.replaceAll('_', ' ')} · ${Number(order.subtotal).toFixed(2)}</button>)}</details></div></article>)}</div>
    {!filtered.length && <p>No customers match this search. Customers appear when an order is created.</p>}
    <Pagination page={page} setPage={setPage} count={filtered.length} size={25} />
  </section>;
}
export function Pagination({ page, setPage, count, size = 25 }) {
  return <nav className="studio-pagination" aria-label="Results pages"><button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page + 1} of {Math.max(1, Math.ceil(count / size))}</span><button type="button" disabled={(page + 1) * size >= count} onClick={() => setPage(page + 1)}>Next</button></nav>;
}
export function StudioInbox({ onCreateOrder }) {
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [filter, setFilter] = useState('open');
  const load = async (offset = 0) => {
    setBusy(true); setFeedback('');
    try {
      const res = await fetch(`/api/studio/messages?offset=${offset}`); const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load inquiries.');
      setMessages((current) => offset ? [...current, ...data.messages] : data.messages); setHasMore(data.hasMore);
    } catch (error) { setFeedback(error.message); } finally { setBusy(false); }
  };
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/studio/messages', { signal: controller.signal }).then(async (res) => {
      const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Could not load inquiries.');
      setMessages(data.messages); setHasMore(data.hasMore);
    }).catch((error) => { if (error.name !== 'AbortError') setFeedback(error.message); });
    return () => controller.abort();
  }, []);
  const changeStatus = async (id, status) => {
    setBusy(true); setFeedback('');
    try {
      const res = await fetch('/api/studio/messages', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Could not update inquiry.');
      setMessages((current) => current.map((m) => m.id === id ? data.message : m)); setFeedback('Inquiry updated.');
    } catch (error) { setFeedback(error.message); } finally { setBusy(false); }
  };
  const visible = messages.filter((m) => filter === 'all' || (filter === 'open' ? m.status !== 'resolved' : m.status === 'resolved'));
  return <section className="studio-panel"><div className="queue-title"><div><p className="eyebrow">INQUIRIES</p><h2>From the contact form</h2></div><button type="button" className="soft-button" disabled={busy} onClick={() => load()}>Refresh inbox</button></div>
    <label>Show inquiries<select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="open">Open</option><option value="resolved">Resolved</option><option value="all">All</option></select></label>
    {busy && <p role="status">Loading…</p>}{feedback && <p role="status">{feedback}</p>}
    <div className="studio-inbox">{visible.map((m) => <article key={m.id}><div className="queue-title"><div><h3>{m.name}</h3><a href={`mailto:${encodeURIComponent(m.email)}`}>{m.email}</a><p>{m.phone}</p></div><span className="status-chip">{m.status.replaceAll('_', ' ')}</span></div><p className="inquiry-text">{m.message}</p>
      <div className="order-actions"><a className="soft-button" href={`mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent('Your Love & Co. inquiry')}`}>Draft reply</a><button type="button" onClick={() => onCreateOrder(m)}>Create order draft</button><button type="button" disabled={busy} onClick={() => changeStatus(m.id, m.status === 'resolved' ? 'new' : 'in_progress')}>{m.status === 'resolved' ? 'Reopen' : 'Mark in progress'}</button>{m.status !== 'resolved' && <button type="button" disabled={busy} onClick={() => changeStatus(m.id, 'resolved')}>Resolve</button>}</div>
    </article>)}</div>{!busy && !visible.length && <p>No inquiries in this view. {hasMore ? 'Load more inquiries to check older messages.' : 'New contact-form messages appear here.'}</p>}
    {hasMore && <button type="button" className="soft-button" disabled={busy} onClick={() => load(messages.length)}>Load more inquiries</button>}
  </section>;
}
export function StudioWebsite({ mode }) {
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/studio/website', { signal: controller.signal }).then(async (res) => { const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Could not load website settings.'); setDraft(data.website); }).catch((e) => { if (e.name !== 'AbortError') setMessage(e.message); });
    return () => controller.abort();
  }, []);
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const res = await fetch('/api/studio/website', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Could not save website settings.');
      setDraft(data.website); setMessage('Website settings saved.');
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  };
  return <section className="studio-panel"><p className="eyebrow">SHOP CONTROLS</p><h2>Keep customers in the loop</h2><p>{mode === 'local' ? 'Changes affect this local preview.' : 'Changes update the live shop.'}</p>
    {message && <p role="status">{message}</p>}
    {!draft ? <p>Website settings are not loaded yet.</p> : <form className="order-form" onSubmit={save}>
      <label>New orders<select value={draft.ordersOpen ? 'open' : 'paused'} onChange={(e) => setDraft({ ...draft, ordersOpen: e.target.value === 'open' })}><option value="open">Accept new orders</option><option value="paused">Pause new orders</option></select></label>
      <p className="helper">Pausing blocks new checkout submissions. Existing orders and customer inquiries remain available.</p>
      <label>Shop announcement<textarea rows={3} maxLength={300} value={draft.announcement} onChange={(e) => setDraft({ ...draft, announcement: e.target.value })} /><small>Shown above page content. Leave blank to hide.</small></label>
      <label>Message while orders are paused<textarea rows={3} required={!draft.ordersOpen} maxLength={500} value={draft.pausedMessage} onChange={(e) => setDraft({ ...draft, pausedMessage: e.target.value })} /></label>
      <fieldset><legend>Shop information</legend><p>Published on the Shop information page. Write plain text; HTML is not needed.</p>
      {[['faqs','Frequently asked questions'],['care','Care instructions'],['turnaroundPolicy','Turnaround policy'],['contactEmail','Contact email'],['contactPhone','Contact phone'],['pickupInstructions','Pickup instructions']].map(([key,label]) => <label key={key}>{label}{key.startsWith('contact') ? <input type={key === 'contactEmail' ? 'email' : 'tel'} maxLength={200} value={draft.info?.[key] || ''} onChange={(e) => setDraft({ ...draft, info: { ...draft.info, [key]: e.target.value } })} /> : <textarea rows={4} maxLength={key === 'pickupInstructions' ? 500 : 10000} value={draft.info?.[key] || ''} onChange={(e) => setDraft({ ...draft, info: { ...draft.info, [key]: e.target.value } })} />}</label>)}
      <label className="check-row"><input type="checkbox" checked={draft.info?.pickupEnabled || false} onChange={(e) => setDraft({ ...draft, info: { ...draft.info, pickupEnabled: e.target.checked } })} />Offer local pickup at checkout</label><a href="/shop-info" target="_blank" rel="noopener noreferrer">Preview shop information</a></fieldset>
      <div className="studio-preview"><p className="eyebrow">ANNOUNCEMENT PREVIEW</p><p>{draft.announcement || 'No announcement'}</p>{!draft.ordersOpen && <p>{draft.pausedMessage}</p>}</div>
      <button type="submit" className="studio-primary" disabled={busy}>{busy ? 'Saving…' : 'Save website settings'}</button>
    </form>}
  </section>;
}
