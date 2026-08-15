'use client';

import { useState } from 'react';
import PhoneInput from './PhoneInput';
import TurnaroundNote from './TurnaroundNote';

export default function Contact() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error();
      setSent(true);
    } catch {
      setError('Your message could not be sent. Please email loveandcoembroidery@gmail.com.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="page-block contact-page">
      <div className="page-intro">
        <p className="eyebrow">SAY HELLO</p>
        <h1>Contact</h1>
        <p>Have a custom project in mind or a question about an order? I’d love to hear from you.</p>
        <TurnaroundNote />
      </div>
      {sent ? (
        <div className="auth-card">
          <p className="eyebrow">MESSAGE SENT</p>
          <h2>Thank you — I’ll be in touch soon.</h2>
        </div>
      ) : (
        <form className="order-form contact-form" onSubmit={submit}>
          <label>Name<input name="name" required autoComplete="name" /></label>
          <label>Email address<input type="email" name="email" required autoComplete="email" /></label>
          <label>Phone number<PhoneInput name="phone" /></label>
          <label>Details of your request<textarea name="message" rows="5" required placeholder="Tell me about your idea, item, or question." /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="studio-primary" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Sending…' : 'Send message'}</button>
        </form>
      )}
    </section>
  );
}
