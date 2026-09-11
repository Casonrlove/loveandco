'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check2 } from 'react-bootstrap-icons';
import { formatPhoneInput } from '@/lib/phone';
import { formatDate } from '@/lib/scheduler';
import AddressFields from './AddressFields';
import PhoneInput from './PhoneInput';
import { createClient } from '@/lib/supabase/client';

const TRACK_STEPS = ['Received', 'Paid', 'In production', 'Shipped'];

function statusCopy(order) {
  if (order.fulfillment_status === 'shipped') return 'Shipped';
  if (order.fulfillment_status === 'started') return 'Started — on the machine';
  if (order.fulfillment_status === 'queued') return 'Queued for production';
  if (order.fulfillment_status === 'complete') return 'Complete';
  if (order.fulfillment_status === 'cancelled') return 'Cancelled';
  if (order.payment_status === 'requested') return 'Venmo request sent';
  if (order.payment_status === 'paid') return 'Paid and in review';
  return 'Received — awaiting review';
}

function statusTone(order) {
  if (order.fulfillment_status === 'cancelled') return 'chip--alert';
  if (['shipped', 'complete'].includes(order.fulfillment_status)) return 'chip--success';
  if (order.fulfillment_status === 'started') return 'chip--accent';
  return 'chip--quiet';
}

/** How many of TRACK_STEPS this order has completed. Display only. */
function completedSteps(order) {
  if (['shipped', 'complete'].includes(order.fulfillment_status)) return 4;
  if (order.fulfillment_status === 'started') return 3;
  if (order.payment_status === 'paid') return 2;
  return 1;
}

function isCancelled(order) {
  return order.fulfillment_status === 'cancelled';
}

function initials(name, email) {
  const source = String(name || '').trim();
  if (source) {
    const parts = source.split(/\s+/).slice(0, 2);
    return parts.map((part) => part[0]).join('').toUpperCase();
  }
  return String(email || '?').slice(0, 2).toUpperCase();
}

function orderRef(id) {
  return String(id || '').replace(/-/g, '').slice(-6).toUpperCase();
}

function placedOn(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function AccountClient({ profile, orders }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(profile.full_name || '');
  const [phone, setPhone] = useState(formatPhoneInput(profile.phone || ''));
  const [venmo, setVenmo] = useState(profile.venmo_username || '');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const stats = useMemo(() => {
    const active = orders.filter((order) => !['complete', 'cancelled', 'shipped'].includes(order.fulfillment_status));
    const promised = active
      .map((order) => order.promised_on)
      .filter(Boolean)
      .sort();
    return { total: orders.length, active: active.length, nextPromised: promised[0] || '' };
  }, [orders]);

  const resetStatus = () => {
    if (status === 'saving') return;
    setStatus('idle');
    setMessage('');
  };

  const save = async (event) => {
    event.preventDefault();
    if (status === 'saving') return;
    setStatus('saving');
    setMessage('');
    const form = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          phone,
          venmo_username: venmo,
          address_line: form.address_line,
          address_line2: form.address_line2,
          city: form.city,
          region: form.region,
          postal_code: form.postal_code,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus('error');
        setMessage(result.error || 'Could not save your profile. Try again.');
        return;
      }
      setStatus('saved');
      setMessage('Your profile is saved. Checkout will use these details next time.');
    } catch {
      setStatus('error');
      setMessage('Could not save your profile. Try again.');
    }
  };

  const signOut = async () => {
    await createClient().auth.signOut();
    router.replace('/');
    router.refresh();
  };

  return (
    <main className="account-page">
      <div className="container">
        <section className="account-header">
          <div className="account-identity">
            <span className="account-avatar" aria-hidden="true">{initials(profile.full_name, profile.email)}</span>
            <div>
              <p className="eyebrow">Your account</p>
              <h1>{profile.full_name || 'Welcome back'}</h1>
              <p className="account-email">{profile.email}</p>
            </div>
          </div>
          <div className="page-hero-actions">
            {profile.role === 'admin' && <Link className="btn btn--primary" href="/studio">Open studio</Link>}
            <button type="button" className="btn btn--secondary" onClick={signOut}>Sign out</button>
          </div>
        </section>

        {orders.length > 0 && (
          <section className="account-stats" aria-label="Order summary">
            <div><span>Orders placed</span><strong>{stats.total}</strong></div>
            <div><span>In progress</span><strong>{stats.active}</strong></div>
            <div><span>Next promised</span><strong>{stats.nextPromised ? formatDate(stats.nextPromised) : '—'}</strong></div>
          </section>
        )}

        <div className="account-layout">
          <section className="account-main">
            <div className="section-head">
              <p className="eyebrow">Orders</p>
              <h2>What you’ve placed</h2>
            </div>

            {orders.length === 0 ? (
              <div className="studio-panel">
                <div className="empty-state">
                  <p>No orders yet. When you place one, you’ll be able to follow it here from review through shipping.</p>
                  <Link className="btn btn--primary btn--sm" href="/shop">Browse the shop</Link>
                </div>
              </div>
            ) : (
              <div className="order-list">
                {orders.map((order) => {
                  const done = completedSteps(order);
                  const cancelled = isCancelled(order);
                  const placed = placedOn(order.created_at);
                  return (
                    <article className={`order-card${cancelled ? ' is-cancelled' : ''}`} key={order.id}>
                      <header className="order-card-head">
                        <div>
                          <span className="order-ref">Order #{orderRef(order.id)}</span>
                          <h3>{(order.items || []).map((item) => item.name).join(', ') || 'Custom order'}</h3>
                        </div>
                        <div className="order-card-amount">
                          <strong>${Number(order.subtotal || 0).toFixed(2)}</strong>
                          {placed && <span>Placed {placed}</span>}
                        </div>
                      </header>

                      {!cancelled && (
                        <ol className="order-track">
                          {TRACK_STEPS.map((label, index) => (
                            <li
                              key={label}
                              className={`${index < done ? 'is-done' : ''}${index === done - 1 ? ' is-current' : ''}`.trim() || undefined}
                            >
                              {label}
                            </li>
                          ))}
                        </ol>
                      )}

                      <footer className="order-card-foot">
                        <span className={`chip ${statusTone(order)}`}>{statusCopy(order)}</span>
                        {order.tracking_number && order.fulfillment_status === 'shipped' && (
                          <span className="order-tracking">{order.tracking_number}</span>
                        )}
                        {!cancelled && (
                          <span className="order-promise">
                            Promised <strong>{order.promised_on ? formatDate(order.promised_on) : 'after payment'}</strong>
                          </span>
                        )}
                      </footer>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="account-side">
            <form className="studio-panel" onSubmit={save} onInput={resetStatus}>
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Profile</p>
                  <h2>How I can reach you</h2>
                </div>
              </div>
              <label>Name<input value={fullName} onChange={(event) => { setFullName(event.target.value); resetStatus(); }} /></label>
              <label>Phone<PhoneInput value={phone} onChange={(value) => { setPhone(value); resetStatus(); }} /></label>
              <label>Venmo username<input value={venmo} onChange={(event) => { setVenmo(event.target.value); resetStatus(); }} /></label>
              <p className="eyebrow mt-6">Ship to</p>
              <AddressFields defaultAddress={profile} required={false} />
              <p className="helper">Leave blank if you don’t want a saved address.</p>
              {message && <p className={`save-affirm${status === 'error' ? ' is-error' : ''}`} role="status">{message}</p>}
              <div className="form-actions">
                <button
                  className={`btn btn--primary${status === 'saved' ? ' is-saved' : ''}`}
                  type="submit"
                  disabled={status === 'saving' || status === 'saved'}
                >
                  {status === 'saving' ? 'Saving…' : status === 'saved' ? <><Check2 aria-hidden="true" /> Saved</> : 'Save profile'}
                </button>
              </div>
            </form>
          </aside>
        </div>
      </div>
    </main>
  );
}
