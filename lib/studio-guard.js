import 'server-only';
import { persistenceMode } from './store';
import { requireAdmin } from './require-admin';
export async function requireStudio() {
  if (persistenceMode() !== 'local') return requireAdmin();
  return null;
}
