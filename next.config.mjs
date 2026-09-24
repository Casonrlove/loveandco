/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === 'development';
const contentSecurityPolicy = [
  "default-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co${isDev ? ' ws:' : ''}`,
  "media-src 'self' https:",
].join('; ');

const nextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Content-Security-Policy', value: contentSecurityPolicy },
    ] }, { source: '/media/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] }, { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'private, no-store' }] }, { source: '/api/zip/:code', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, s-maxage=86400' }] }];
  },
  allowedDevOrigins: [
    '*.lhr.life',
    '*.ngrok-free.dev',
    '*.ngrok-free.app',
    'destinee-unbenignant-shandra.ngrok-free.dev',
  ],

};

export default nextConfig;
