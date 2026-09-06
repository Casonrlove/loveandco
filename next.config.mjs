/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
    ] }, { source: '/media/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] }, { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'private, no-store' }] }, { source: '/api/turnaround', headers: [{ key: 'Cache-Control', value: 'public, max-age=60, s-maxage=300, stale-while-revalidate=600' }] }, { source: '/api/zip/:code', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, s-maxage=86400' }] }];
  },
  allowedDevOrigins: [
    '*.lhr.life',
    '*.ngrok-free.dev',
    '*.ngrok-free.app',
    'destinee-unbenignant-shandra.ngrok-free.dev',
  ],

};

export default nextConfig;
