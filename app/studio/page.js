import { redirect } from 'next/navigation';
import Studio from '@/components/Studio';
import { isAdminProfile } from '@/lib/admin';
import { listOrders, listProducts, getSettings, getInstagramToken, persistenceMode } from '@/lib/store';
import { getSessionProfile } from '@/lib/supabase/auth';
import { hasSupabaseConfig } from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Studio · Love & Co. Embroidery' };

export default async function StudioPage() {
  const mode = persistenceMode();
  const profile = await getSessionProfile();
  if (hasSupabaseConfig()) {
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
    />
  );
}
