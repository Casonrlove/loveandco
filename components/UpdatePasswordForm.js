'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (password !== confirmation) return setError('The passwords do not match.');
    setPending(true);
    const { error: authError } = await createClient().auth.updateUser({ password });
    if (authError) {
      setError(authError.message);
      setPending(false);
      return;
    }
    router.replace('/account');
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="auth-card">
      <p className="eyebrow">SECURE YOUR ACCOUNT</p>
      <h1>Choose a new password.</h1>
      <label>New password<input type="password" minLength={8} name="password" required value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" /></label>
      <label>Confirm password<input type="password" minLength={8} name="confirmation" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="studio-primary" disabled={pending} type="submit">{pending ? 'Updating…' : 'Update password'}</button>
    </form>
  );
}
