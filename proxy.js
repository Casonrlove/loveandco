import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/security';
import { updateSession } from '@/lib/supabase/proxy';

export async function proxy(request) {
  if (request.nextUrl.pathname.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    if (!isSameOriginRequest(request.headers, request.nextUrl.protocol)) {
      return Response.json({ error: 'Open this site directly and try again.' }, { status: 403 });
    }
  }
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith('/api/') && !/^\/api\/(account|orders|studio)(?:\/|$)/.test(pathname)) return NextResponse.next();
  return updateSession(request);
}

export const config = {
  matcher: ['/account/:path*', '/checkout', '/login', '/update-password', '/auth/:path*', '/studio/:path*', '/api/account', '/api/orders', '/api/contact', '/api/proofs/:path*', '/api/studio/:path*'],
};
