'use client';

import { useMemo, useRef, useState } from 'react';
import { Calendar3, Check2, Clock, Search, Trash3 } from 'react-bootstrap-icons';
import { CATEGORIES, PRODUCT_IMAGES, slugify } from '@/lib/catalog';
import { proofRows } from '@/lib/design-options';
import { createSchedule, formatDate, normalizeSettings, toScheduleOrder, turnaround } from '@/lib/scheduler';
import { orderMinutes, studioInsights } from '@/lib/studio-insights';
import FancySelect from './FancySelect';
import StudioCalendar from './StudioCalendar';

function DesignProof({ item }) {
  const rows = proofRows(item.custom_details);
  if (rows.length) {
    return (
      <dl className="design-proof">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd className={label.startsWith('Name confirmed') || label.startsWith('Confirmed') ? 'verified' : undefined}>{value}</dd>
          </div>
        ))}
      </dl>
    );
  }
  if (item.personalization) return <p>{item.personalization}</p>;
  return null;
}

const emptyManual = { name: '', item: '', email: '', price: '', design_minutes: 0, stitch_minutes: 30, priority: 'standard' };
const emptyProduct = {
  name: '',
  detail: '',
  category: 'trucker-hats',
  item_price: '',
  embroidery_price: '',
  design_minutes: 15,
  stitch_minutes: 30,
  image_path: PRODUCT_IMAGES[0],
  active: true,
};

function productToDraft(product) {
  return {
    id: product.id,
    name: product.name || '',
    detail: product.detail || '',
    category: product.category || 'trucker-hats',
    item_price: product.item_price ?? product.price ?? '',
    embroidery_price: product.embroidery_price ?? product.embroideryPrice ?? '',
    design_minutes: product.design_minutes ?? 15,
    stitch_minutes: product.stitch_minutes ?? 30,
    image_path: product.image_path || product.image || PRODUCT_IMAGES[0],
    sort_order: product.sort_order || 0,
    active: product.active !== false,
  };
}
const workDays = [['Monday', 1], ['Wednesday', 3], ['Friday', 5], ['Tuesday', 2], ['Thursday', 4], ['Saturday', 6], ['Sunday', 0]];

function statusLabel(order) {
  if (order.fulfillment_status === 'complete') return 'Complete';
  if (order.fulfillment_status === 'shipped') return 'Shipped';
  if (order.fulfillment_status === 'started') return 'Started';
  if (order.fulfillment_status === 'queued') return 'Queued';
  if (order.fulfillment_status === 'cancelled') return 'Cancelled';
  return 'Needs review';
}

function paymentLabel(order) {
  if (order.payment_status === 'unpaid') return 'Unpaid';
  if (order.payment_status === 'requested') return 'Venmo sent';
  return null;
}

function matchesQuery(order, query) {
  if (!query) return true;
  const hay = [order.name, order.email, order.venmo_username, order.tracking_number, ...(order.items || []).map((item) => item.name)]
    .join(' ')
    .toLowerCase();
  return hay.includes(query.toLowerCase());
}

export default function Studio({ initialOrders, initialProducts, initialSettings, instagramConnected = false, mode }) {
  const [orders, setOrders] = useState(initialOrders);
  const [products, setProducts] = useState(initialProducts);
  const [settings, setSettings] = useState(initialSettings);
  const [tab, setTab] = useState('board');
  const [filter, setFilter] = useState('active');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(initialOrders[0]?.id || '');
  const [manual, setManual] = useState(emptyManual);
  const [productDraft, setProductDraft] = useState(emptyProduct);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const productFormRef = useRef(null);
  const [instagramToken, setInstagramToken] = useState('');
  const [instagramOn, setInstagramOn] = useState(instagramConnected);

  const schedule = useMemo(() => createSchedule(
    orders.filter((order) => order.payment_status === 'paid').map(toScheduleOrder),
    settings,
  ), [orders, settings]);
  const currentTurnaround = turnaround(schedule);
  const insights = useMemo(() => studioInsights(orders, schedule, settings), [orders, schedule, settings]);
  const selected = orders.find((order) => order.id === selectedId) || null;
  const visibleOrders = orders.filter((order) => {
    if (!matchesQuery(order, query)) return false;
    if (filter === 'all') return true;
    if (filter === 'review') return order.fulfillment_status === 'pending_review';
    if (filter === 'unpaid') return order.payment_status !== 'paid' && !['complete', 'cancelled'].includes(order.fulfillment_status);
    if (filter === 'minutes') return order.payment_status === 'paid' && orderMinutes(order) === 0 && !['complete', 'cancelled', 'shipped'].includes(order.fulfillment_status);
    if (filter === 'active') return !['complete', 'cancelled'].includes(order.fulfillment_status);
    return order.fulfillment_status === filter;
  });

  const persistSettings = async (patch) => {
    const base = normalizeSettings(settings);
    const next = normalizeSettings(typeof patch === 'function' ? patch(base) : { ...base, ...patch });
    setSettings(next);
    const response = await fetch('/api/studio/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    });
    if (!response.ok) {
      setMessage('Could not save availability.');
      return false;
    }
    return true;
  };

  const toggleDayOff = (date) => persistSettings((current) => ({
    ...current,
    daysOff: current.daysOff.includes(date)
      ? current.daysOff.filter((day) => day !== date)
      : [...current.daysOff, date],
  }));

  const setDaysOff = (daysOff) => persistSettings((current) => ({
    ...current,
    daysOff: typeof daysOff === 'function' ? daysOff(current) : daysOff,
  }));

  const patchOrder = async (id, patch) => {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`/api/studio/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Update failed.');
      setOrders((current) => current.map((order) => order.id === id ? result.order : order));
      if (result.email?.status === 'sent') setMessage('Customer email sent.');
      else if (result.email?.status === 'disabled') setMessage('Order updated. Customer email is not set up yet — add Resend under Availability.');
      else if (result.email?.status === 'failed') setMessage(`Order updated, but the email failed: ${result.email.error || 'Resend error'}`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const addManualOrder = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/studio/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manual),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not add order.');
      setOrders((current) => [result.order, ...current]);
      setSelectedId(result.order.id);
      setManual(emptyManual);
      setTab('orders');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const editingProduct = Boolean(productDraft.id);

  const saveProduct = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/studio/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...productDraft, slug: slugify(productDraft.name) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save product.');
      setProducts((current) => {
        const others = current.filter((item) => item.id !== result.product.id);
        return [...others, result.product].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      });
      setProductDraft(emptyProduct);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const updateProduct = async (product, patch) => {
    const response = await fetch('/api/studio/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...product, ...patch }),
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error || 'Could not update product.');
      return;
    }
    setProducts((current) => current.map((item) => item.id === result.product.id ? result.product : item));
    setProductDraft((current) => (current.id === result.product.id ? productToDraft(result.product) : current));
  };

  const removeProduct = async (id) => {
    const response = await fetch(`/api/studio/products?id=${id}`, { method: 'DELETE' });
    if (!response.ok) {
      setMessage('Could not delete product.');
      return;
    }
    setProducts((current) => current.filter((item) => item.id !== id));
    setProductDraft((current) => (current.id === id ? emptyProduct : current));
  };

  const openOrder = (id) => {
    setSelectedId(id);
    setTab('orders');
    setCalendarOpen(false);
  };

  return (
    <main className="studio-page">
      <div className="container">
        <section className="studio-hero">
          <div>
            <p className="eyebrow">Private studio</p>
            <h1>Command center</h1>
            <p>{currentTurnaround.label}</p>
            {mode === 'local' && <p className="helper">Local preview store — connect Supabase for the live database.</p>}
          </div>
          <div className="studio-hero-actions">
            <div className="turnaround-card">
              <span>Live website message</span>
              <strong>{currentTurnaround.label}</strong>
              <small>{currentTurnaround.detail}</small>
            </div>
            <button className="btn btn--secondary" type="button" onClick={() => setCalendarOpen(true)}>
              <Calendar3 aria-hidden="true" /> Open calendar
            </button>
          </div>
        </section>

        <section className="insight-grid">
          <button type="button" onClick={() => { setFilter('review'); setTab('orders'); }}><span>Needs review</span><strong>{insights.review}</strong></button>
          <button type="button" onClick={() => { setFilter('unpaid'); setTab('orders'); }}><span>Waiting on Venmo</span><strong>{insights.unpaid}</strong><small>${insights.pendingTotal.toFixed(0)}</small></button>
          <button type="button" onClick={() => { setFilter('queued'); setTab('board'); }}><span>In production</span><strong>{insights.production}</strong></button>
          <button type="button" onClick={() => { setFilter('minutes'); setTab('orders'); }}><span>Missing minutes</span><strong>{insights.missingMinutes}</strong></button>
          <button type="button" onClick={() => setCalendarOpen(true)}><span>This week booked</span><strong>{insights.weekPct}%</strong><small>{insights.weekUsed}/{insights.weekCap || 0} min</small></button>
          <button type="button" onClick={() => setCalendarOpen(true)}><span>Next open night</span><strong>{insights.nextOpen ? formatDate(insights.nextOpen) : '—'}</strong><small>{insights.nextOpenMinutes} min free</small></button>
          <div><span>Paid so far</span><strong>${insights.paidTotal.toFixed(0)}</strong></div>
          <div><span>Queue minutes</span><strong>{insights.bookedMinutes}m</strong></div>
        </section>

        <section className="night-strip">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Next nights</p>
              <h2>Flip any night off</h2>
            </div>
            <button className="btn btn--link" type="button" onClick={() => setCalendarOpen(true)}>Full month</button>
          </div>
          <div className="night-row">
            {insights.upcoming.map((session) => {
              const used = Number(settings.minutesPerSession) - session.minutesRemaining;
              return (
                <article key={session.date}>
                  <strong>{formatDate(session.date)}</strong>
                  <small>{used}m booked · {session.minutesRemaining}m open</small>
                  {session.jobs.slice(0, 2).map((job, index) => <p key={`${job.orderId}-${index}`}>{job.customer.split(' ')[0]} · {job.phase}</p>)}
                  <button className="btn btn--secondary btn--sm" type="button" onClick={() => toggleDayOff(session.date)}>Take off</button>
                </article>
              );
            })}
            {insights.nightsOff.slice(0, 4).map((date) => (
              <article className="is-off" key={date}>
                <strong>{formatDate(date)}</strong>
                <small>Off</small>
                <button className="btn btn--secondary btn--sm" type="button" onClick={() => toggleDayOff(date)}>Restore</button>
              </article>
            ))}
          </div>
        </section>

        <div className="studio-tabs" role="tablist">
          {[['board', 'Board'], ['orders', 'Orders'], ['products', 'Products'], ['add', 'Add job']].map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>
          ))}
          <button type="button" className="tab-aside" onClick={() => setCalendarOpen(true)}>Calendar</button>
        </div>
        {message && <p className="form-error studio-message" role="alert">{message}</p>}

        {tab === 'board' && (
          <section className="studio-panel queue-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Board</p>
                <h2>What’s on your plate</h2>
              </div>
              <label className="studio-search"><Search aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, item" /></label>
            </div>
            {visibleOrders.length === 0 ? (
              <div className="empty-state"><Clock size={28} aria-hidden="true" /><p>Nothing in this view. New shop orders land here automatically.</p></div>
            ) : (
              <div className="queue-table-wrap">
                <table className="queue-table">
                  <thead>
                    <tr>
                      <th scope="col">Order</th>
                      <th scope="col">Projected finish</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleOrders.map((order) => {
                      const result = schedule.results[order.id];
                      const minutes = orderMinutes(order);
                      const payChip = paymentLabel(order);
                      return (
                        <tr className={order.fulfillment_status === 'complete' ? 'complete' : undefined} key={order.id}>
                          <td className="queue-order-main">
                            <div className="order-name">
                              <strong>{order.name}</strong>
                              {order.priority === 'rush' && <span className="chip chip--alert">Rush</span>}
                              <span className="chip">{statusLabel(order)}</span>
                              {payChip && <span className="chip chip--quiet">{payChip}</span>}
                              {order.payment_status === 'paid' && minutes === 0 && <span className="chip chip--quiet">needs minutes</span>}
                            </div>
                            <p>{(order.items || []).map((item) => `${item.quantity}× ${item.name}`).join(', ')}</p>
                            <small>{minutes}m total · {order.email} · {order.venmo_username || 'no Venmo'} · ${Number(order.subtotal || 0).toFixed(2)}</small>
                          </td>
                          <td className="completion">
                            {order.fulfillment_status === 'complete' ? (
                              <strong className="is-done"><Check2 aria-hidden="true" /> Complete</strong>
                            ) : (
                              <strong>{result?.completionDate ? formatDate(result.completionDate) : order.payment_status === 'paid' ? 'Set minutes' : 'After payment'}</strong>
                            )}
                          </td>
                          <td className="queue-actions-cell">
                            <div className="order-actions">
                              {order.payment_status === 'unpaid' && (
                                <button className="btn btn--secondary btn--sm" type="button" disabled={busy} onClick={() => patchOrder(order.id, { payment_status: 'requested' })}>Venmo sent</button>
                              )}
                              {order.payment_status !== 'paid' ? (
                                <button className="btn btn--secondary btn--sm" type="button" disabled={busy} onClick={() => patchOrder(order.id, { payment_status: 'paid', fulfillment_status: 'queued' })}>Paid</button>
                              ) : order.fulfillment_status === 'queued' ? (
                                <button className="btn btn--secondary btn--sm" type="button" disabled={busy} onClick={() => patchOrder(order.id, { fulfillment_status: 'started' })}>Start</button>
                              ) : null}
                              {['queued', 'started'].includes(order.fulfillment_status) && (
                                <button className="btn btn--secondary btn--sm" type="button" disabled={busy} onClick={() => patchOrder(order.id, { fulfillment_status: 'shipped' })}>Ship</button>
                              )}
                              <button className="btn btn--primary btn--sm" type="button" onClick={() => openOrder(order.id)}>Open</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {tab === 'orders' && (
          <section className="studio-grid studio-orders">
            <aside className="studio-panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Orders</p>
                  <h2>{visibleOrders.length} showing</h2>
                </div>
              </div>
              <label className="studio-search"><Search aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" /></label>
              <div className="mt-4">
                <FancySelect
                  value={filter}
                  onChange={setFilter}
                  aria-label="Filter orders"
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'review', label: 'Needs review' },
                    { value: 'unpaid', label: 'Unpaid' },
                    { value: 'minutes', label: 'Missing minutes' },
                    { value: 'queued', label: 'Queued' },
                    { value: 'started', label: 'Started' },
                    { value: 'shipped', label: 'Shipped' },
                    { value: 'complete', label: 'Complete' },
                    { value: 'all', label: 'All' },
                  ]}
                />
              </div>
              <div className="order-index">
                {visibleOrders.map((order) => (
                  <button type="button" key={order.id} className={order.id === selectedId ? 'active' : ''} onClick={() => setSelectedId(order.id)}>
                    <strong>{order.name}</strong>
                    <span>{statusLabel(order)} · {order.payment_status} · ${Number(order.subtotal || 0).toFixed(0)}</span>
                  </button>
                ))}
                {visibleOrders.length === 0 && <p className="empty-copy">No orders in this filter.</p>}
              </div>
            </aside>
            <section className="studio-panel">
              {!selected ? <div className="empty-state"><p>Select an order to review it.</p></div> : (
                <>
                  <div className="panel-head">
                    <div>
                      <p className="eyebrow">{selected.email}</p>
                      <h2>{selected.name}</h2>
                    </div>
                    <strong>${Number(selected.subtotal || 0).toFixed(2)}</strong>
                  </div>
                  <p className="helper">
                    Venmo {selected.venmo_username || '—'} · {selected.phone || 'no phone'} · {selected.priority}
                    {schedule.results[selected.id]?.completionDate ? ` · finish ${formatDate(schedule.results[selected.id].completionDate)}` : ''}
                  </p>
                  {selected.customer_notes && <p>{selected.customer_notes}</p>}
                  {schedule.results[selected.id] && (
                    <p className="helper">Split across {(schedule.results[selected.id].design.length + schedule.results[selected.id].stitch.length)} session blocks · {schedule.results[selected.id].totalMinutes}m</p>
                  )}
                  <div className="item-editor">
                    {(selected.items || []).map((item, index) => (
                      <article key={item.id || index}>
                        <strong>{item.quantity} × {item.name}</strong>
                        <DesignProof item={item} />
                        <div className="form-grid form-grid--2">
                          <label>Design min
                            <input type="number" min="0" value={item.design_minutes} onChange={(event) => {
                              const items = selected.items.map((row) => row.id === item.id ? { ...row, design_minutes: event.target.value } : row);
                              setOrders((current) => current.map((order) => order.id === selected.id ? { ...order, items } : order));
                            }} />
                          </label>
                          <label>Stitch min
                            <input type="number" min="0" value={item.stitch_minutes} onChange={(event) => {
                              const items = selected.items.map((row) => row.id === item.id ? { ...row, stitch_minutes: event.target.value } : row);
                              setOrders((current) => current.map((order) => order.id === selected.id ? { ...order, items } : order));
                            }} />
                          </label>
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className="form-actions">
                    <button className="btn btn--primary" type="button" disabled={busy} onClick={() => patchOrder(selected.id, { items: selected.items })}>Save minutes</button>
                  </div>
                  <div className="order-actions wrap">
                    {selected.payment_status === 'unpaid' && <button className="btn btn--secondary btn--sm" type="button" disabled={busy} onClick={() => patchOrder(selected.id, { payment_status: 'requested' })}>Venmo requested</button>}
                    {selected.payment_status !== 'paid' && <button className="btn btn--secondary btn--sm" type="button" disabled={busy} onClick={() => patchOrder(selected.id, { payment_status: 'paid', fulfillment_status: 'queued' })}>Mark paid</button>}
                    {selected.payment_status === 'paid' && selected.fulfillment_status === 'queued' && <button className="btn btn--secondary btn--sm" type="button" disabled={busy} onClick={() => patchOrder(selected.id, { fulfillment_status: 'started' })}>Start</button>}
                    {['queued', 'started'].includes(selected.fulfillment_status) && <button className="btn btn--secondary btn--sm" type="button" disabled={busy} onClick={() => patchOrder(selected.id, { fulfillment_status: 'shipped' })}>Ship</button>}
                    {selected.fulfillment_status !== 'complete' && <button className="btn btn--secondary btn--sm" type="button" disabled={busy} onClick={() => patchOrder(selected.id, { fulfillment_status: 'complete' })}>Complete</button>}
                    {selected.priority !== 'rush' && <button className="btn btn--secondary btn--sm" type="button" disabled={busy} onClick={() => patchOrder(selected.id, { priority: 'rush' })}>Make rush</button>}
                    {selected.priority === 'rush' && <button className="btn btn--secondary btn--sm" type="button" disabled={busy} onClick={() => patchOrder(selected.id, { priority: 'standard' })}>Clear rush</button>}
                    {selected.fulfillment_status !== 'cancelled' && <button className="btn btn--danger btn--sm" type="button" disabled={busy} onClick={() => patchOrder(selected.id, { fulfillment_status: 'cancelled' })}>Cancel</button>}
                  </div>
                  <label className="mt-6">Tracking number
                    <input value={selected.tracking_number || ''} onChange={(event) => setOrders((current) => current.map((order) => order.id === selected.id ? { ...order, tracking_number: event.target.value } : order))} placeholder="Optional carrier tracking" />
                  </label>
                  <div className="form-actions">
                    <button type="button" className="btn btn--primary" disabled={busy} onClick={() => patchOrder(selected.id, { tracking_number: selected.tracking_number, fulfillment_status: selected.tracking_number && selected.fulfillment_status === 'started' ? 'shipped' : selected.fulfillment_status })}>Save tracking</button>
                  </div>
                </>
              )}
            </section>
          </section>
        )}

        {tab === 'add' && (
          <section className="studio-grid studio-grid--even">
            <aside className="studio-panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Availability</p>
                  <h2>Your stitching rhythm</h2>
                </div>
              </div>
              <label>Minutes per embroidery night
                <input type="number" min="30" step="15" value={settings.minutesPerSession} onChange={(event) => persistSettings({ minutesPerSession: event.target.value })} />
              </label>
              <p className="helper">Work nights and days off are faster from the calendar. These pills set the weekly default.</p>
              <div className="day-pills">
                {workDays.map(([label, value]) => (
                  <button type="button" className={settings.workDays.map(Number).includes(value) ? 'active' : ''} key={value} onClick={() => persistSettings((current) => ({
                    ...current,
                    workDays: current.workDays.includes(value)
                      ? current.workDays.filter((day) => day !== value)
                      : [...current.workDays, value],
                  }))}>{label.slice(0, 3)}</button>
                ))}
              </div>
              <button className="btn btn--secondary btn--block" type="button" onClick={() => setCalendarOpen(true)}>Manage nights on calendar</button>

              <hr className="divider" />

              <p className="eyebrow">Instagram</p>
              <p className="helper">{instagramOn ? 'Home is connected to @loveandcoembroidery.' : 'Paste a long-lived Instagram user token so the home page can show live posts.'}</p>
              <label>Instagram access token
                <input
                  type="password"
                  value={instagramToken}
                  onChange={(event) => setInstagramToken(event.target.value)}
                  placeholder={instagramOn ? 'Connected — paste a new token to replace' : 'Paste token'}
                  autoComplete="off"
                />
              </label>
              <div className="form-actions">
                <button
                  className="btn btn--secondary"
                  type="button"
                  disabled={busy || !instagramToken.trim()}
                  onClick={async () => {
                    setBusy(true);
                    const response = await fetch('/api/studio/instagram', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ token: instagramToken }),
                    });
                    setBusy(false);
                    if (!response.ok) {
                      setMessage('Could not save Instagram token.');
                      return;
                    }
                    setInstagramOn(true);
                    setInstagramToken('');
                    setMessage('Instagram connected. Home will show live posts.');
                  }}
                >
                  Save Instagram token
                </button>
              </div>
            </aside>
            <section className="studio-panel add-order-panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Walk-in / Instagram</p>
                  <h2>Add to production</h2>
                </div>
              </div>
              <form onSubmit={addManualOrder}>
                <label>Customer<input required value={manual.name} onChange={(event) => setManual({ ...manual, name: event.target.value })} /></label>
                <label>Email<input type="email" required value={manual.email} onChange={(event) => setManual({ ...manual, email: event.target.value })} /></label>
                <label>Item / project<input required value={manual.item} onChange={(event) => setManual({ ...manual, item: event.target.value })} /></label>
                <div className="form-grid form-grid--2">
                  <label>Order total ($)<input type="number" min="0" step="0.01" value={manual.price} onChange={(event) => setManual({ ...manual, price: event.target.value })} /></label>
                  <label>Design minutes<input type="number" min="0" step="5" value={manual.design_minutes} onChange={(event) => setManual({ ...manual, design_minutes: event.target.value })} /></label>
                </div>
                <label>Stitch minutes<input type="number" min="0" step="5" value={manual.stitch_minutes} onChange={(event) => setManual({ ...manual, stitch_minutes: event.target.value })} /></label>
                <label>Priority
                  <FancySelect
                    value={manual.priority}
                    onChange={(value) => setManual({ ...manual, priority: value })}
                    options={[
                      { value: 'standard', label: 'Standard queue' },
                      { value: 'rush', label: 'Rush — move to front' },
                    ]}
                  />
                </label>
                <div className="form-actions">
                  <button className="btn btn--primary" type="submit" disabled={busy}>Add to schedule</button>
                </div>
              </form>
            </section>
          </section>
        )}

        {tab === 'products' && (
          <section className="studio-grid studio-grid--even">
            <section className="studio-panel" ref={productFormRef}>
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Catalog</p>
                  <h2>{editingProduct ? 'Update shop piece' : 'Add a shop piece'}</h2>
                </div>
              </div>
              <form onSubmit={saveProduct}>
                <label>Name<input required value={productDraft.name} onChange={(event) => setProductDraft({ ...productDraft, name: event.target.value })} /></label>
                <label>Details<input value={productDraft.detail} onChange={(event) => setProductDraft({ ...productDraft, detail: event.target.value })} /></label>
                <label>Category
                  <FancySelect
                    value={productDraft.category}
                    onChange={(value) => setProductDraft({ ...productDraft, category: value })}
                    options={CATEGORIES.slice().sort((left, right) => left.name.localeCompare(right.name)).map((category) => ({ value: category.id, label: category.name }))}
                  />
                </label>
                {productDraft.category === 'baby-bundles' && <p className="helper">Shoppers pick The Keepsake, Signature, or Heirloom Bundle. Customization is included. They can add extra outfits ($22), burp cloths ($12), bibs ($12), and paci clips ($14).</p>}
                <div className="form-grid form-grid--2">
                  <label>Item price<input type="number" min="0" step="0.01" value={productDraft.item_price} onChange={(event) => setProductDraft({ ...productDraft, item_price: event.target.value })} /></label>
                  <label>Design fee<input type="number" min="0" step="0.01" value={productDraft.embroidery_price} onChange={(event) => setProductDraft({ ...productDraft, embroidery_price: event.target.value })} /></label>
                </div>
                <div className="form-grid form-grid--2">
                  <label>Design minutes<input type="number" min="0" value={productDraft.design_minutes} onChange={(event) => setProductDraft({ ...productDraft, design_minutes: event.target.value })} /></label>
                  <label>Stitch minutes<input type="number" min="0" value={productDraft.stitch_minutes} onChange={(event) => setProductDraft({ ...productDraft, stitch_minutes: event.target.value })} /></label>
                </div>
                <label>Photo
                  <FancySelect
                    value={productDraft.image_path}
                    onChange={(value) => setProductDraft({ ...productDraft, image_path: value })}
                    options={PRODUCT_IMAGES.map((image) => ({ value: image, label: image.replace('/images/', '') }))}
                  />
                </label>
                <div className="form-actions">
                  <button className="btn btn--primary" type="submit" disabled={busy}>{editingProduct ? 'Save changes' : 'Add to shop'}</button>
                  {editingProduct && (
                    <button className="btn btn--ghost" type="button" disabled={busy} onClick={() => setProductDraft(emptyProduct)}>Cancel edit</button>
                  )}
                </div>
              </form>
            </section>
            <section className="studio-panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Live pieces</p>
                  <h2>{products.length} in catalog</h2>
                </div>
              </div>
              <div className="product-admin-list">
                {products.map((product) => (
                  <article key={product.id} className={product.id === productDraft.id ? 'is-editing' : undefined}>
                    <img src={product.image} alt="" />
                    <div>
                      <strong>{product.name}</strong>
                      <p>{CATEGORIES.find((category) => category.id === product.category)?.name} · ${itemTotal(product).toFixed(2)} · {product.design_minutes}m / {product.stitch_minutes}m · {product.active ? 'live' : 'hidden'}</p>
                      <div className="order-actions">
                        <button className="btn btn--secondary btn--sm" type="button" onClick={() => {
                          setProductDraft(productToDraft(product));
                          setMessage('');
                          productFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}>Edit</button>
                        <button className="btn btn--secondary btn--sm" type="button" onClick={() => updateProduct(product, { active: !product.active })}>{product.active ? 'Hide' : 'Show'}</button>
                        <button className="icon-btn icon-btn--danger" type="button" onClick={() => removeProduct(product.id)} aria-label={`Delete ${product.name}`}><Trash3 aria-hidden="true" /></button>
                      </div>
                    </div>
                  </article>
                ))}
                {products.length === 0 && <div className="empty-state"><p>No shop pieces yet. Add one to the left and it will appear on the public shop.</p></div>}
              </div>
            </section>
          </section>
        )}
      </div>

      <StudioCalendar
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        schedule={schedule}
        settings={settings}
        minutesPerSession={settings.minutesPerSession}
        onToggleDayOff={toggleDayOff}
        onSetDaysOff={setDaysOff}
        onOpenOrder={openOrder}
      />
    </main>
  );
}

function itemTotal(product) {
  return Number(product.price || product.item_price || 0) + Number(product.embroideryPrice || product.embroidery_price || 0);
}
