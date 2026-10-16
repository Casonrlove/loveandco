'use client';

import { trackingUrl } from '@/lib/operations-utils';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { Check2 } from 'react-bootstrap-icons';
import { formatPhoneInput } from '@/lib/phone';
import { formatDate } from '@/lib/scheduler';
import AddressFields from './AddressFields';
import PhoneInput from './PhoneInput';
import { createClient } from '@/lib/supabase/client';

function statusCopy(order) {
  if (order.payment_status === 'refunded') return 'Refunded';
  if (order.fulfillment_status === 'shipped') return order.tracking_number ? `Shipped · ${order.tracking_number}` : 'Shipped';
  if (order.fulfillment_status === 'started') return 'Started — on the machine';
  if (order.fulfillment_status === 'queued') return 'Queued for production';
  if (order.fulfillment_status === 'complete') return 'Complete';
  if (order.fulfillment_status === 'cancelled') return 'Cancelled';
  if (order.payment_status === 'requested') return 'Venmo request sent';
  if (order.payment_status === 'paid') return 'Paid and in review';
  return 'Received — awaiting review';
}

// Four-step progress from the two status columns; cancelled and refunded show no steps.
function orderStep(order) {
  if (['shipped', 'complete'].includes(order.fulfillment_status)) return 4;
  if (['queued', 'started'].includes(order.fulfillment_status)) return 3;
  if (['requested', 'paid'].includes(order.payment_status)) return 2;
  return 1;
}

export default function AccountClient({ profile, orders }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(profile.full_name || '');
  const [phone, setPhone] = useState(formatPhoneInput(profile.phone || ''));
  const [venmo, setVenmo] = useState(profile.venmo_username || '');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

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
        setMessage(result.error || 'I couldn’t save your profile. Please try again.');
        return;
      }
      setStatus('saved');
      setMessage('Your profile is saved. Checkout will use these details next time.');
    } catch {
      setStatus('error');
      setMessage('I couldn’t save your profile. Please try again.');
    }
  };

  const signOut = async () => {
    await createClient().auth.signOut();
    router.replace('/');
    router.refresh();
  };

  return (
    <main className="account-page">
      <section className="studio-hero">
        <div>
          <p className="eyebrow">YOUR ACCOUNT</p>
          <h1>Hello{profile.full_name ? `, ${profile.full_name}` : ''}.</h1>
          <p>{profile.email}</p>
        </div>
        <div className="account-actions">
          {profile.role === 'admin' && <Link className="studio-primary" href="/studio">Open studio</Link>}
          <Link className="continue-shopping" href="/update-password">Change password</Link>
          <button type="button" className="continue-shopping" onClick={signOut}>Sign out</button>
        </div>
      </section>

      <section className="studio-grid">
        <form className="studio-panel order-form" onSubmit={save} onInput={resetStatus}>
          <p className="eyebrow">PROFILE</p>
          <h2>How I can reach you</h2>
          <label>Name<input value={fullName} onChange={(event) => { setFullName(event.target.value); resetStatus(); }} /></label>
          <label>Phone<PhoneInput value={phone} onChange={(value) => { setPhone(value); resetStatus(); }} /></label>
          <label>Venmo username<input value={venmo} onChange={(event) => { setVenmo(event.target.value); resetStatus(); }} /></label>
          <p className="eyebrow account-ship">SHIP TO</p>
          <AddressFields defaultAddress={profile} required={false} />
          <p className="helper">Leave blank if you don’t want a saved address.</p>
          {message && <p className={`save-affirm${status === 'error' ? ' is-error' : ''}`} role="status">{message}</p>}
          <button
            className={`studio-primary${status === 'saved' ? ' is-saved' : ''}`}
            type="submit"
            disabled={status === 'saving' || status === 'saved'}
          >
            {status === 'saving' ? 'Saving…' : status === 'saved' ? <><Check2 /> Saved</> : 'Save profile'}
          </button>
        </form>

        <section className="studio-panel">
          <p className="eyebrow">ORDERS</p>
          <h2>What you’ve placed</h2>
          {orders.length === 0 ? <p className="empty-copy">No orders yet. Once you place one, you can follow it here.</p> : (
            <div className="queue-list">
              {orders.map((order) => (
                <article className="queue-order" key={order.id}>
                  <div>
                    <strong>{(order.items || []).map((item) => item.name).join(', ')}</strong>
                    {/* ponytail: UTC calendar date; late-evening Central orders show the next day */}
                    <p>Order #{order.id.slice(0, 8)} · Placed {formatDate(String(order.created_at).slice(0, 10))}</p>
                    {order.fulfillment_status !== 'cancelled' && order.payment_status !== 'refunded' && (
                      <ol className="account-steps">
                        {['Received', 'Venmo requested', 'In production', order.delivery_method === 'pickup' ? 'Ready' : 'Shipped'].map((label, index) => (
                          <li key={label} aria-current={orderStep(order) === index + 1 ? 'step' : undefined}>{label}</li>
                        ))}
                      </ol>
                    )}
                    <p>{statusCopy(order)}</p>
                    {order.delivery_method === 'pickup' && <p>Local pickup · {order.pickup_instructions || 'I’ll arrange pickup with you.'}</p>}
                    {order.delivery_method !== 'pickup' && trackingUrl(order.carrier, order.tracking_number) && <a href={trackingUrl(order.carrier, order.tracking_number)} target="_blank" rel="noopener noreferrer">Track shipment</a>}
                    <details>
                      <summary>Pieces</summary>
                      <ul>
                        {(order.items || []).map((item) => (
                          <li key={item.id || item.name}>
                            {item.quantity} × {item.name}
                            {item.personalization && <span className="account-personalization">{item.personalization}</span>}
                          </li>
                        ))}
                      </ul>
                      {order.delivery_method !== 'pickup' && <p>Ship to {[order.address_line, order.address_line2, order.city, order.region, order.postal_code].filter(Boolean).join(', ')}</p>}
                    </details>
                    <small>${Number(order.subtotal || 0).toFixed(2)}</small>
                    <Link href={`/contact?order=${order.id.slice(0, 8)}`}>Question about this order</Link>
                  </div>
                  <div className="completion">
                    <span>Promised</span>
                    <strong>{order.promised_on ? formatDate(order.promised_on) : 'After payment'}</strong>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
