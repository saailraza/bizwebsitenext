const API = process.env.NEXT_PUBLIC_FORMS_API || '';
const apiOrigin = API ? ' ' + new URL(API).origin : '';

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://images.unsplash.com",
  `connect-src 'self' https://formsubmit.co https://api.bizeasesolutions.online${apiOrigin}`,
  "form-action 'self' https://formsubmit.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  poweredByHeader: false,
  reactStrictMode: true,
  // the admin API reads the service list from /content at run time
  outputFileTracingIncludes: { '/api/admin/landing': ['./content/landing.json'] },
  async redirects() {
    return [
      // old blog addresses (…/blog/slug.html) -> new clean addresses
      { source: '/blog/:slug([a-z0-9-]+).html', destination: '/blog/:slug/', permanent: true },
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/:path*/index.html', destination: '/:path*/', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          // the strict policy is only for the live site; `npm run dev` needs eval for hot reload
          ...(process.env.NODE_ENV === 'production' ? [{ key: 'Content-Security-Policy', value: csp }] : []),
        ],
      },
      {
        source: '/legacy/:file*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, must-revalidate' }],
      },
    ];
  },
};

export default nextConfig;
