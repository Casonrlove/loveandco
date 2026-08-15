import { INSTAGRAM_USERNAME } from '@/lib/instagram-profile';
import { getInstagramToken, saveInstagramToken } from '@/lib/store';

export { INSTAGRAM_PROFILE, INSTAGRAM_USERNAME } from '@/lib/instagram-profile';

const FIELDS = [
  'id',
  'caption',
  'media_type',
  'media_url',
  'permalink',
  'thumbnail_url',
  'timestamp',
  'username',
  'children{id,media_type,media_url,thumbnail_url}',
].join(',');

const TEN_DAYS = 10 * 24 * 60 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;

export function isUsableInstagramToken(token) {
  const raw = String(token || '').trim();
  if (!raw) return false;
  return !/^(replace|dummy|your-instagram|xxx|changeme|placeholder)/i.test(raw);
}

function mapMedia(item) {
  const children = (item.children?.data || []).map((child) => ({
    id: child.id,
    type: child.media_type,
    url: child.media_url || child.thumbnail_url || '',
  })).filter((child) => child.url);
  const url = item.media_url || item.thumbnail_url || children[0]?.url || '';
  if (!url) return null;
  return {
    id: item.id,
    caption: item.caption || '',
    type: item.media_type,
    url,
    permalink: item.permalink,
    postedAt: item.timestamp || '',
    username: item.username || INSTAGRAM_USERNAME,
    children,
  };
}

export async function refreshInstagramToken(token) {
  const url = new URL('https://graph.instagram.com/refresh_access_token');
  url.searchParams.set('grant_type', 'ig_refresh_token');
  url.searchParams.set('access_token', token);
  const response = await fetch(url, { cache: 'no-store' }).catch(() => null);
  if (!response?.ok) return '';
  const data = await response.json().catch(() => ({}));
  return data.access_token || '';
}

export async function resolveInstagramToken() {
  const stored = await getInstagramToken().catch(() => ({ token: '', refreshedAt: null }));
  const token = stored.token || process.env.INSTAGRAM_ACCESS_TOKEN || '';
  if (!isUsableInstagramToken(token)) return '';

  const refreshedAt = stored.refreshedAt ? new Date(stored.refreshedAt).getTime() : 0;
  const age = refreshedAt ? Date.now() - refreshedAt : Number.POSITIVE_INFINITY;
  const shouldRefresh = age >= TEN_DAYS && (!refreshedAt || age >= ONE_DAY);

  if (shouldRefresh) {
    const next = await refreshInstagramToken(token);
    if (next) {
      await saveInstagramToken(next).catch(() => null);
      return next;
    }
  }

  if (!stored.token) {
    await saveInstagramToken(token).catch(() => null);
  }
  return token;
}

export async function listInstagramPosts({ limit = 24 } = {}) {
  const token = await resolveInstagramToken();
  if (!token) return { posts: [], configured: false };

  const url = new URL('https://graph.instagram.com/me/media');
  url.searchParams.set('fields', FIELDS);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('access_token', token);

  const response = await fetch(url, { next: { revalidate: 300 } }).catch(() => null);
  if (!response?.ok) return { posts: [], configured: true, error: true };
  const data = await response.json().catch(() => ({}));
  return {
    posts: (data.data || []).map(mapMedia).filter(Boolean),
    configured: true,
  };
}
