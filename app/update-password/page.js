export const dynamic = 'force-dynamic';

import { getSessionUser } from '@/lib/supabase/auth';
import { redirect } from 'next/navigation';
import UpdatePasswordForm from '@/components/UpdatePasswordForm';

export const metadata = { title: 'Update password', robots: { index: false, follow: false } };

export default async function UpdatePasswordPage() {
  if (!(await getSessionUser())) redirect('/forgot-password');
  return (
    <main className="auth-page">
      <UpdatePasswordForm />
    </main>
  );
}
