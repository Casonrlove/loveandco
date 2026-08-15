'use client';

import Link from 'next/link';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordForm({ configured }) {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!configured) return setError('Connect a Supabase project to enable password recovery.');
    setPending(true);
    const { error: authError } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    });
    if (authError) setError(authError.message);
    else setMessage('If an account exists for that email, a reset link is on its way.');
    setPending(false);
  };

  return (
    <form onSubmit={submit} className="auth-card">
      <p className="eyebrow">ACCOUNT RECOVERY</p>
      <h2>Reset your password.</h2>
      <label>Email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <button className="studio-primary" disabled={pending || !configured} type="submit">{pending ? 'Sending…' : 'Send reset link'}</button>
      <p className="helper"><Link href="/login">Back to sign in</Link></p>
    </form>
  );
}
