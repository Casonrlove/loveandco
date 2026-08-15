import UpdatePasswordForm from '@/components/UpdatePasswordForm';

export const metadata = { title: 'Update password · Love & Co. Embroidery' };

export default function UpdatePasswordPage() {
  return (
    <main className="auth-page">
      <UpdatePasswordForm />
    </main>
  );
}
