import ForgotPasswordForm from '@/components/ForgotPasswordForm';
import { hasSupabaseConfig } from '@/lib/supabase/config';

export const metadata = { title: 'Reset password', robots: { index: false, follow: false } };

export default async function ForgotPasswordPage({ searchParams }) {
  const params = await searchParams;
  return (
    <main className="auth-page">
      <ForgotPasswordForm configured={hasSupabaseConfig()} initialError={params?.error === 'expired' ? 'That reset link expired or was already used. Request a new one below.' : ''} />
    </main>
  );
}
