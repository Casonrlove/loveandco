export const dynamic = 'force-dynamic';

import { safeNextPath } from '@/lib/security';
import { redirect } from 'next/navigation';
import AuthForm from '@/components/AuthForm';
import { hasSupabaseConfig } from '@/lib/supabase/config';
import { getSessionProfile } from '@/lib/supabase/auth';

export const metadata = { title: 'Sign in · Love & Co. Embroidery' };

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const requestedPath = params?.next || '/account';
  const nextPath = safeNextPath(requestedPath);
  const user = await getSessionProfile();
  if (user) redirect(nextPath);

  const authMessages = {
    auth_retry: 'That Google sign-in expired. Please try Continue with Google again.',
    auth_cancelled: 'Google sign-in was canceled. You can try again whenever you are ready.',
    auth_provider: 'Google could not complete sign-in. Please try again.',
    auth_callback: 'That login link is incomplete or expired. Please start again.',
  };

  return (
    <main className="auth-page">
      <AuthForm configured={hasSupabaseConfig()} initialError={authMessages[params?.error] || ''} nextPath={nextPath} />
    </main>
  );
}
