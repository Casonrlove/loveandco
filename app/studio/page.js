import { redirect } from 'next/navigation';
import Studio from '@/components/Studio';
import { isAdminProfile } from '@/lib/admin';
import { listOrders, listProducts, getSettings, getInstagramToken, persistenceMode } from '@/lib/store';
import { getSessionProfile } from '@/lib/supabase/auth';
import { hasSupabaseConfig } from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Studio · Love & Co. Embroidery' };

export default async function StudioPage({ searchParams }) {
  const params = await searchParams;
  const scalar = (value) => typeof value === 'string' ? value : '';
  const view = { tab: scalar(params.tab), filter: scalar(params.filter), q: scalar(params.q), order: scalar(params.order) };
  if (!['board', 'orders', 'products', 'customers', 'inbox', 'website', 'add', 'settings', 'inventory'].includes(view.tab)) view.tab = 'board';
  if (!['active', 'review', 'unpaid', 'minutes', 'queued', 'started', 'shipped', 'complete', 'cancelled', 'all'].includes(view.filter)) view.filter = 'active';
  const mode = persistenceMode();
  const profile = await getSessionProfile();
  if (hasSupabaseConfig() || mode !== 'local') {
    if (!profile) redirect('/login?next=/studio');
    if (!isAdminProfile(profile)) redirect('/account');
  }

  const [orders, products, settings, instagram] = await Promise.all([
    listOrders({ includeAll: true }),
    listProducts({ includeHidden: true }),
    getSettings(),
    getInstagramToken(),
  ]);

  return (
    <Studio
      initialOrders={orders}
      initialProducts={products}
      initialSettings={settings}
      instagramConnected={Boolean(instagram.token)}
      mode={mode}
      initialView={{ tab: view.tab, filter: view.filter, query: view.q, order: view.order }}
    />
  );
}
