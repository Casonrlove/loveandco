'use client';

import StoreImage from './StoreImage';

import { useEffect, useMemo, useState } from 'react';
import { Calendar3, Check2, Clock, Plus, Search, Trash3 } from 'react-bootstrap-icons';
import { CATEGORIES, PRODUCT_IMAGES, slugify } from '@/lib/catalog';
import StudioPhotos from './StudioPhotos';
import StudioInventory from './StudioInventory';
import StudioOrderEditor from './StudioOrderEditor';
import { exportOrders, Pagination, StudioCustomers, StudioInbox, StudioWebsite } from './StudioOperations';
import { createSchedule, formatDate, toScheduleOrder, turnaround } from '@/lib/scheduler';
import { orderMinutes, studioInsights } from '@/lib/studio-insights';
import FancySelect from './FancySelect';
import StudioCalendar from './StudioCalendar';

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
const workDays = [['Monday', 1], ['Wednesday', 3], ['Friday', 5], ['Tuesday', 2], ['Thursday', 4], ['Saturday', 6], ['Sunday', 0]];

function statusLabel(order) {
  if (order.fulfillment_status === 'complete') return 'Complete';
  if (order.fulfillment_status === 'shipped') return 'Shipped';
  if (order.fulfillment_status === 'started') return 'Started';
  if (order.fulfillment_status === 'queued') return 'Queued';
  if (order.fulfillment_status === 'cancelled') return 'Cancelled';
  return 'Needs review';
}

function matchesQuery(order, query) {
  if (!query) return true;
  const hay = [order.name, order.email, order.venmo_username, order.tracking_number, ...(order.items || []).map((item) => item.name)]
    .join(' ')
    .toLowerCase();
  return hay.includes(query.toLowerCase());
}

export default function Studio({ initialOrders, initialProducts, initialSettings, instagramConnected = false, mode, initialView = {} }) {
  const [orders, setOrders] = useState(initialOrders);
  const [products, setProducts] = useState(initialProducts);
  const [settings, setSettings] = useState(initialSettings);
  const [tab, rawSetTab] = useState(initialView.tab || 'board');
  const [orderDirty, setOrderDirty] = useState(false);
  const [page, setPage] = useState(0);
  const leaveOrder = () => !orderDirty || window.confirm('Discard unsaved order changes?');
  const setTab = (value) => { if (value === tab) return; if (leaveOrder()) { rawSetTab(value); setOrderDirty(false); } };
  const [filter, setFilter] = useState(initialView.filter || 'active');
  const [query, setQuery] = useState(initialView.query || '');
  const [selectedId, rawSelectId] = useState(initialView.order || initialOrders[0]?.id || '');
  const setSelectedId = (id) => { if (id === selectedId) return; if (leaveOrder()) { rawSelectId(id); setOrderDirty(false); } };
  useEffect(() => {
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries({ tab, filter, q: query, order: selectedId })) { if (value) url.searchParams.set(key, value); else url.searchParams.delete(key); }
    window.history.replaceState(null, '', url);
  }, [tab, filter, query, selectedId]);
  const [manual, setManual] = useState(emptyManual);
  const [productDraft, setProductDraft] = useState(emptyProduct);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
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

  const currentPage = Math.min(page, Math.max(0, Math.ceil(visibleOrders.length / 25) - 1));
  const displayedOrders = visibleOrders.slice(currentPage * 25, currentPage * 25 + 25);

  const persistSettings = async (patch) => {
    const next = typeof patch === 'function' ? patch(settings) : { ...settings, ...patch };
    setSettings(next);
    setBusy(true);
    try {
      const response = await fetch('/api/studio/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save availability.');
      setSettings(result.settings); setMessage('Availability saved.');
    } catch (error) { setSettings(settings); setMessage(error.message); }
    finally { setBusy(false); }
  };

  const toggleDayOff = (date) => persistSettings((current) => ({
    ...current,
    daysOff: current.daysOff.includes(date)
      ? current.daysOff.filter((day) => day !== date)
      : [...current.daysOff, date],
  }));

  const setDaysOff = (daysOff) => persistSettings({ daysOff });

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
      if (result.warning) setMessage(result.warning);
      else if (result.notification?.status === 'failed') setMessage('Order saved. Customer email failed; contact the customer directly.');
      else if (result.notification?.status === 'disabled') setMessage('Order saved. Email delivery is not configured.');
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

  const saveProduct = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/studio/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...productDraft, slug: productDraft.slug || slugify(productDraft.name) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save product.');
      setProducts((current) => {
        const others = current.filter((item) => item.id !== result.product.id);
        return [...others, result.product].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      });
      setProductDraft(emptyProduct);
      setMessage('Product saved.');
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
  };

  const removeProduct = async (id) => {
    if (!window.confirm('Delete this product from the catalog? This cannot be undone.')) return;
    const response = await fetch(`/api/studio/products?id=${id}`, { method: 'DELETE' });
    if (!response.ok) {
      setMessage('Could not delete product.');
      return;
    }
    setProducts((current) => current.filter((item) => item.id !== id));
  };

  const openOrder = (id) => {
    if (!leaveOrder()) return;
    rawSelectId(id); rawSetTab('orders'); setOrderDirty(false);
    setCalendarOpen(false);
  };

  return (
    <main className="studio-page">
      <section className="studio-hero">
        <div>
          <p className="eyebrow">PRIVATE STUDIO</p>
          <h1>The studio workbench</h1>
          <p>{currentTurnaround.label}</p>
          {mode === 'local' && <p className="helper">Local preview store — connect Supabase for the live database.</p>}
        </div>
        <div className="studio-hero-actions">
          <button className="soft-button" type="button" onClick={() => setCalendarOpen(true)}>Open calendar</button>
          <div className="turnaround-card">
            <span>LIVE WEBSITE MESSAGE</span>
            <strong>{currentTurnaround.label}</strong>
            <small>{currentTurnaround.detail}</small>
          </div>
        </div>
      </section>

      {tab === 'board' && <><section className="insight-grid">
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
        <div className="queue-title">
          <div><p className="eyebrow">NEXT NIGHTS</p><h2>Flip any night off</h2></div>
          <button className="ghost-button" type="button" onClick={() => setCalendarOpen(true)}>Full month</button>
        </div>
        <div className="night-row">
          {insights.upcoming.map((session) => {
            const used = Number(settings.minutesPerSession) - session.minutesRemaining;
            return (
              <article key={session.date}>
                <strong>{formatDate(session.date)}</strong>
                <small>{used}m booked · {session.minutesRemaining}m open</small>
                {session.jobs.slice(0, 2).map((job, index) => <p key={`${job.orderId}-${index}`}>{job.customer.split(' ')[0]} · {job.phase}</p>)}
                <button type="button" disabled={busy} onClick={() => toggleDayOff(session.date)}>Take off</button>
              </article>
            );
          })}
          {insights.nightsOff.slice(0, 4).map((date) => (
            <article className="is-off" key={date}>
              <strong>{formatDate(date)}</strong>
              <small>Off</small>
              <button type="button" disabled={busy} onClick={() => toggleDayOff(date)}>Restore</button>
            </article>
          ))}
        </div>
      </section>

      </>}
      <div className="studio-tabs">
        {[['board', 'Work queue'], ['orders', 'Orders'], ['products', 'Products'], ['customers', 'Customers'], ['inbox', 'Inquiries'], ['website', 'Website'], ['inventory', 'Inventory'], ['add', 'Add order'], ['settings', 'Availability & Instagram']].map(([id, label]) => (
          <button key={id} type="button" aria-current={tab === id ? 'page' : undefined} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
        <button type="button" className="active-soft" onClick={() => setCalendarOpen(true)}>Calendar</button>
      </div>
      {message && <p className="form-error studio-message" role="alert">{message}</p>}

      {tab === 'board' && (
        <section className="studio-panel queue-panel">
          <div className="studio-toolbar"><label>Queue filter<select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(0); }}>{[["active", "Active"], ["review", "Needs review"], ["unpaid", "Awaiting payment"], ["queued", "Queued"], ["started", "Started"], ["shipped", "Shipped"], ["complete", "Complete"], ["cancelled", "Cancelled"], ["all", "All orders"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button type="button" className="soft-button" onClick={() => exportOrders(visibleOrders)}>Export this view</button></div>
          <div className="queue-title">
            <div><p className="eyebrow">BOARD</p><h2>What’s on your plate</h2></div>
            <label className="studio-search"><Search /><input aria-label="Search orders" name="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, item" /></label>
          </div>
          {visibleOrders.length === 0 ? (
            <div className="empty-queue"><Clock size={28} /><p>Nothing in this view. New shop orders land here automatically.</p></div>
          ) : (
            <div className="queue-list">
              {displayedOrders.map((order) => {
                const result = schedule.results[order.id];
                const minutes = orderMinutes(order);
                return (
                  <article className={`queue-order ${order.fulfillment_status === 'complete' ? 'complete' : ''}`} key={order.id}>
                    <div>
                      <div className="order-name">
                        <strong>{order.name}</strong>
                        {order.priority === 'rush' && <span className="rush">RUSH</span>}
                        <span className="status-chip">{statusLabel(order)}</span>
                        {order.payment_status !== 'paid' && <span className="status-chip">{order.payment_status}</span>}
                        {order.payment_status === 'paid' && minutes === 0 && <span className="status-chip">needs minutes</span>}
                      </div>
                      <p>{(order.items || []).map((item) => `${item.quantity}× ${item.name}`).join(', ')}</p>
                      <small>{minutes}m total · {order.email} · {order.venmo_username || 'no Venmo'} · ${Number(order.subtotal || 0).toFixed(2)}</small>
                    </div>
                    <div className="completion">
                      {order.fulfillment_status === 'complete' ? <><Check2 /><span>Complete</span></> : (
                        <><span>Projected finish</span><strong>{result?.completionDate ? formatDate(result.completionDate) : order.payment_status === 'paid' ? 'Set minutes' : 'After payment'}</strong></>
                      )}
                    </div>
                    <div className="order-actions">
                      {order.payment_status === 'unpaid' && <button type="button" disabled={busy} onClick={() => patchOrder(order.id, { payment_status: 'requested' })}>Venmo sent</button>}
                      {order.payment_status !== 'paid' && <button type="button" disabled={busy} onClick={() => patchOrder(order.id, { payment_status: 'paid', fulfillment_status: 'queued' })}>Paid</button>}
                      {order.payment_status === 'paid' && order.fulfillment_status === 'queued' && <button type="button" disabled={busy} onClick={() => patchOrder(order.id, { fulfillment_status: 'started' })}>Start</button>}
                      {['queued', 'started'].includes(order.fulfillment_status) && <button type="button" onClick={() => openOrder(order.id)}>Shipping details</button>}
                      <button type="button" onClick={() => openOrder(order.id)}>Open</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          <Pagination page={currentPage} setPage={setPage} count={visibleOrders.length} />
        </section>
      )}

      {tab === 'orders' && (
        <section className="studio-grid studio-orders">
          <aside className="studio-panel">
            <div className="queue-title">
              <div><p className="eyebrow">ORDERS</p><h2>{visibleOrders.length}</h2></div>
            </div>
            <label className="studio-search"><Search /><input aria-label="Search orders" name="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" /></label>
            <label>Order filter<FancySelect
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'review', label: 'Needs review' },
                { value: 'unpaid', label: 'Unpaid' },
                { value: 'minutes', label: 'Missing minutes' },
                { value: 'queued', label: 'Queued' },
                { value: 'started', label: 'Started' },
                { value: 'shipped', label: 'Shipped' },
                { value: 'complete', label: 'Complete' },
                { value: 'cancelled', label: 'Cancelled' },
                { value: 'all', label: 'All' },
              ]}
            /></label>
            <div className="order-index">
              {displayedOrders.map((order) => (
                <button type="button" key={order.id} className={order.id === selectedId ? 'active' : ''} onClick={() => setSelectedId(order.id)}>
                  <strong>{order.name}</strong>
                  <span>{statusLabel(order)} · {order.payment_status} · ${Number(order.subtotal || 0).toFixed(0)}</span>
                </button>
              ))}
              {visibleOrders.length === 0 && <p className="empty-copy">No orders in this filter.</p>}
            </div>
            <Pagination page={currentPage} setPage={setPage} count={visibleOrders.length} />
          </aside>
          {selected ? <StudioOrderEditor key={selected.id} order={selected} onDirty={setOrderDirty} onSaved={(saved) => setOrders((current) => current.map((order) => order.id === saved.id ? saved : order))} /> : <section className="studio-panel"><p>Select an order to review it.</p></section>}
        </section>
      )}

      {(tab === 'add' || tab === 'settings') && (
        <section className="studio-grid">
          {tab === 'settings' && <aside className="studio-panel settings-panel">
            <div className="panel-heading"><Calendar3 /><div><p className="eyebrow">AVAILABILITY</p><h2>Your stitching rhythm</h2></div></div>
            <label>Minutes per embroidery night
              <input type="number" min="30" step="15" key={settings.minutesPerSession} defaultValue={settings.minutesPerSession} onBlur={(event) => { if (Number(event.target.value) !== Number(settings.minutesPerSession)) persistSettings({ minutesPerSession: Number(event.target.value) }); }} />
            </label>
            <p className="helper">Work nights and days off are faster from the calendar. These pills set the weekly default.</p>
            <div className="day-pills">
              {workDays.map(([label, value]) => (
                <button type="button" disabled={busy} className={settings.workDays.includes(value) ? 'active' : ''} key={value} onClick={() => persistSettings({
                  workDays: settings.workDays.includes(value)
                    ? settings.workDays.filter((day) => day !== value)
                    : [...settings.workDays, value],
                })}>{label.slice(0, 3)}</button>
              ))}
            </div>
            <button className="soft-button" type="button" onClick={() => setCalendarOpen(true)}>Manage nights on calendar</button>
            <p className="eyebrow" style={{ marginTop: '1.6rem' }}>INSTAGRAM</p>
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
            <button
              className="soft-button"
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
          </aside>}
          {tab === 'add' && <section className="studio-panel add-order-panel">
            <div className="panel-heading"><Plus /><div><p className="eyebrow">WALK-IN / INSTAGRAM</p><h2>Add to production</h2></div></div>
            <form onSubmit={addManualOrder} className="order-form">
              <label>Customer<input required value={manual.name} onChange={(event) => setManual({ ...manual, name: event.target.value })} /></label>
              <label>Email<input type="email" required value={manual.email} onChange={(event) => setManual({ ...manual, email: event.target.value })} /></label>
              <label>Phone<input type="tel" value={manual.phone || ''} onChange={(event) => setManual({ ...manual, phone: event.target.value })} /></label>
              <label>Customer notes<textarea value={manual.customer_notes || ''} onChange={(event) => setManual({ ...manual, customer_notes: event.target.value })} /></label>
              <label>Item / project<input required value={manual.item} onChange={(event) => setManual({ ...manual, item: event.target.value })} /></label>
              <div className="form-row">
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
              <button className="studio-primary" type="submit" disabled={busy}>Create unpaid order</button>
            </form>
          </section>}
        </section>
      )}

      {tab === 'products' && (
        <section className="studio-grid">
          <section className="studio-panel">
            <div className="panel-heading"><Plus /><div><p className="eyebrow">CATALOG</p><h2>{productDraft.id ? 'Edit shop piece' : 'Add a shop piece'}</h2></div></div>
            <form className="order-form" onSubmit={saveProduct}>
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
              <div className="form-row">
                <label>Item price<input type="number" min="0" step="0.01" value={productDraft.item_price} onChange={(event) => setProductDraft({ ...productDraft, item_price: event.target.value })} /></label>
                <label>Design fee<input type="number" min="0" step="0.01" value={productDraft.embroidery_price} onChange={(event) => setProductDraft({ ...productDraft, embroidery_price: event.target.value })} /></label>
              </div>
              <div className="form-row">
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
              <label>Display order<input type="number" min="0" max="100000" value={productDraft.sort_order || 0} onChange={(event) => setProductDraft({ ...productDraft, sort_order: event.target.value })} /></label>
              <StoreImage className="studio-product-preview" src={productDraft.image_path} alt="Product photo preview" />
              <StudioPhotos photos={productDraft.photo_paths || []} onChange={(photos) => setProductDraft({ ...productDraft, photo_paths: photos, image_path: photos[0] || '/images/Logo.png' })} />
              <button className="studio-primary" type="submit" disabled={busy}>{productDraft.id ? 'Save product' : 'Add to shop'}</button>
              {productDraft.id && <button type="button" className="soft-button" onClick={() => setProductDraft(emptyProduct)}>Cancel editing</button>}
            </form>
          </section>
          <section className="studio-panel">
            <div className="queue-title"><div><p className="eyebrow">LIVE PIECES</p><h2>{products.length} in catalog</h2></div></div>
            <div className="product-admin-list">
              {products.map((product) => (
                <article key={product.id}>
                  <StoreImage src={product.image} alt="" />
                  <div>
                    <strong>{product.name}</strong>
                    <p>{CATEGORIES.find((category) => category.id === product.category)?.name} · ${itemTotal(product).toFixed(2)} · {product.design_minutes}m / {product.stitch_minutes}m · {product.active ? 'live' : 'hidden'}</p>
                    <div className="order-actions">
                      <button type="button" onClick={() => { setProductDraft(product); window.scrollTo({ top: 0, behavior: 'instant' }); }}>Edit</button>
                      <button type="button" onClick={() => setProductDraft({ ...product, id: undefined, name: `${product.name} copy`, slug: '', active: false })}>Duplicate draft</button>
                      <button type="button" onClick={() => updateProduct(product, { active: !product.active })}>{product.active ? 'Hide' : 'Show'}</button>
                      <button className="icon-button" type="button" onClick={() => removeProduct(product.id)} aria-label={`Delete ${product.name}`}><Trash3 /></button>
                    </div>
                  </div>
                </article>
              ))}
              {products.length === 0 && <p className="empty-copy">No shop pieces yet. Add one to the left and it will appear on the public shop.</p>}
            </div>
          </section>
        </section>
      )}

      {tab === 'customers' && <StudioCustomers orders={orders} openOrder={openOrder} />}
      {tab === 'inbox' && <StudioInbox onCreateOrder={(inquiry) => { setManual({ ...emptyManual, name: inquiry.name, email: inquiry.email, phone: inquiry.phone || '', customer_notes: inquiry.message }); setTab('add'); }} />}
      {tab === 'inventory' && <StudioInventory />}
      {tab === 'website' && <StudioWebsite mode={mode} />}
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
