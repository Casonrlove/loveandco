import './globals.css';
import CartDrawer from '@/components/CartDrawer';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { getPublicTurnaround } from '@/lib/schedule-service';
import { getSessionProfile } from '@/lib/supabase/auth';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Love & Co. Embroidery',
  description: 'Custom embroidered keepsakes, made with care.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

function buildLabel() {
  const commit = (process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_GIT_SHA || '').slice(0, 7);
  const branch = process.env.VERCEL_GIT_COMMIT_REF || process.env.NEXT_PUBLIC_GIT_BRANCH;
  const environment = process.env.VERCEL_ENV || (commit ? 'local development' : '');
  return commit
    ? `${environment || 'deployment'} · ${branch || 'detached'}@${commit}`
    : 'local development · uncommitted build';
}

export default async function RootLayout({ children }) {
  const [turnaround, user] = await Promise.all([
    getPublicTurnaround(),
    getSessionProfile(),
  ]);

  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <Header turnaround={turnaround} user={user} />
        {children}
        <Footer buildLabel={buildLabel()} />
        <CartDrawer turnaround={turnaround} />
      </body>
    </html>
  );
}
