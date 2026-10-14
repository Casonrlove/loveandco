export const dynamic = 'force-dynamic';

import { safeNextPath } from '@/lib/security';
import { redirect } from 'next/navigation';
import AuthForm from '@/components/AuthForm';
import { hasSupabaseConfig } from '@/lib/supabase/config';
import { getSessionProfile } from '@/lib/supabase/auth';

export const metadata = { title: 'Sign in', robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const requestedPath = params?.next || '/account';
  const nextPath = safeNextPath(requestedPath);
  const user = await getSessionProfile();
  if (user) redirect(nextPath);

  const authMessages = {
    auth_retry: 'That link expired or was already used. Sign in again, or request a new link below.',
    auth_cancelled: 'Google sign-in was canceled. You can try again whenever you are ready.',
    auth_provider: 'Google could not complete sign-in. Please try again.',
    auth_callback: 'That login link is incomplete or expired. Sign in again, or use Forgot password to get a new link.',
  };

  return (
    <main className="auth-page">
      <AuthForm configured={hasSupabaseConfig()} initialError={authMessages[params?.error] || ''} nextPath={nextPath} initialMode={params?.mode === 'signup' ? 'signup' : 'signin'} />
    </main>
  );
}
