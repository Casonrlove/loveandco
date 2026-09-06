import 'server-only';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { getWebsiteSettings, listProducts } from '@/lib/store';
import { listInstagramPosts } from '@/lib/instagram';

const project = process.env.NEXT_PUBLIC_SUPABASE_URL || 'local';

// Cache only public output. Auth, profiles, orders, and credentials stay uncached.
export const getPublicProducts = cache(unstable_cache(
  () => listProducts(),
  ['public-products', project],
  { revalidate: 900, tags: ['catalog'] },
));

export const getPublicInstagram = cache(unstable_cache(
  () => listInstagramPosts({ limit: 18 }),
  ['public-instagram', project],
  { revalidate: 3600, tags: ['instagram'] },
));

export const getPublicWebsite = cache(unstable_cache(
  () => getWebsiteSettings(), ['public-website', project], { revalidate: 300, tags: ['website'] },
));
