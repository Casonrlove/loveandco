'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="google-mark">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.6 0-4.81-1.76-5.6-4.13H3.05v2.62A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.4 13.93A6 6 0 0 1 6.09 12c0-.67.11-1.32.31-1.93V7.45H3.05A10 10 0 0 0 2 12c0 1.61.38 3.14 1.05 4.55l3.35-2.62Z" />
      <path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.95 5.45l3.35 2.62c.79-2.37 3-4.13 5.6-4.13Z" />
    </svg>
  );
}

export default function AuthForm({ configured, initialError = '', nextPath = '/account' }) {
  const router = useRouter();
  const [mode, setMode] = useState('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [googlePending, setGooglePending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(initialError);

  const signInWithGoogle = async () => {
    setError('');
    setMessage('');
    if (!configured) {
      setError('Sign-in is temporarily unavailable. Please try again later.');
      return;
    }
    setGooglePending(true);
    const { error: authError } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });
    if (authError) {
      setError(authError.message);
      setGooglePending(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!configured) {
      setError('Sign-in is temporarily unavailable. Please try again later.');
      return;
    }

    setPending(true);
    const supabase = createClient();
    if (mode === 'signup') {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });
      if (authError) setError(authError.message);
      else if (data.session) {
        router.replace(nextPath);
        router.refresh();
      } else setMessage('Check your email to confirm your account.');
    } else {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) setError(authError.message);
      else {
        router.replace(nextPath);
        router.refresh();
      }
    }
    setPending(false);
  };

  return (
    <form onSubmit={submit} className="auth-card">
      <p className="eyebrow">YOUR ACCOUNT</p>
      <h1>{mode === 'signin' ? 'Welcome back.' : 'Save your orders.'}</h1>
      <p>{mode === 'signin' ? 'Sign in to see order status and tracking.' : 'Create an account with the same email you use at checkout.'}</p>
      <div className="studio-tabs compact">
        <button type="button" className={mode === 'signin' ? 'active' : ''} onClick={() => setMode('signin')}>Sign in</button>
        <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Create account</button>
      </div>
      <button type="button" className="google-button" onClick={signInWithGoogle} disabled={pending || googlePending || !configured}>
        <GoogleMark />
        {googlePending ? 'Connecting…' : 'Continue with Google'}
      </button>
      <p className="auth-divider"><span>or use email</span></p>
      {mode === 'signup' && <label>Name<input name="name" required value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" /></label>}
      <label>Email<input name="email" spellCheck={false} type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label>
      <label>Password<input name="password" type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} /></label>
      {mode === 'signin' && <p className="helper"><Link href="/forgot-password">Forgot password?</Link></p>}
      {!configured && <p className="helper">Sign-in is temporarily unavailable. You can still browse the shop.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <button className="studio-primary" disabled={pending || googlePending || !configured} type="submit">{pending ? 'One moment…' : mode === 'signin' ? 'Sign in' : 'Create account'}</button>
    </form>
  );
}
