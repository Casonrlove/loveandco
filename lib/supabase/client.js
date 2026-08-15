import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseConfig } from './config';

let client;

export function createClient() {
  if (!client) {
    const { url, key } = getSupabaseConfig();
    client = createBrowserClient(url, key);
  }

  return client;
}
