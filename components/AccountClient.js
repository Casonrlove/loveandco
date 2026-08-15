'use client';

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
  if (order.fulfillment_status === 'shipped') return order.tracking_number ? `Shipped · ${order.tracking_number}` : 'Shipped';
  if (order.fulfillment_status === 'started') return 'Started — on the machine';
  if (order.fulfillment_status === 'queued') return 'Queued for production';
  if (order.fulfillment_status === 'complete') return 'Complete';
  if (order.fulfillment_status === 'cancelled') return 'Cancelled';
  if (order.payment_status === 'requested') return 'Venmo request sent';
  if (order.payment_status === 'paid') return 'Paid and in review';
  return 'Received — awaiting review';
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
      <section className="studio-hero">
        <div>
          <p className="eyebrow">YOUR ACCOUNT</p>
          <h1>Hello{profile.full_name ? `, ${profile.full_name}` : ''}.</h1>
          <p>{profile.email}</p>
        </div>
        <div className="account-actions">
          {profile.role === 'admin' && <Link className="studio-primary" href="/studio">Open studio</Link>}
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
          {orders.length === 0 ? <p className="empty-copy">No orders yet. When you place one, it will appear here.</p> : (
            <div className="queue-list">
              {orders.map((order) => (
                <article className="queue-order" key={order.id}>
                  <div>
                    <strong>{(order.items || []).map((item) => item.name).join(', ')}</strong>
                    <p>{statusCopy(order)}</p>
                    <small>${Number(order.subtotal || 0).toFixed(2)}</small>
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
