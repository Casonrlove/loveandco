import ForgotPasswordForm from '@/components/ForgotPasswordForm';
import { hasSupabaseConfig } from '@/lib/supabase/config';

export const metadata = { title: 'Reset password · Love & Co. Embroidery' };

export default function ForgotPasswordPage() {
  return (
    <main className="auth-page">
      <ForgotPasswordForm configured={hasSupabaseConfig()} />
    </main>
  );
}
