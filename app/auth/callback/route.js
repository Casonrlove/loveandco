import { safeNextPath } from '@/lib/security';
import { NextResponse } from 'next/server';
import { claimOrdersForUser } from '@/lib/store';
import { hasSupabaseConfig } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';

export async function GET(request) {
  const { origin, searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const providerError = searchParams.get('error');
  const requestedPath = searchParams.get('next') || '/account';
  const next = safeNextPath(requestedPath);

  if (!hasSupabaseConfig()) return NextResponse.redirect(`${origin}/login`);
  if (providerError) {
    const reason = providerError === 'access_denied' ? 'auth_cancelled' : 'auth_provider';
    return NextResponse.redirect(`${origin}/login?error=${reason}`);
  }
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email && user.email_confirmed_at) await claimOrdersForUser(user.id, user.email).catch(() => {});
      return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(`${origin}/login?error=auth_retry`);
  }
  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
