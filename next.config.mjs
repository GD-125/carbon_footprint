/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── TypeScript ──────────────────────────────────────────────────────────────
  // Keep false in production — errors should block deploys
  typescript: {
    ignoreBuildErrors: false,
  },

  // ── Images ──────────────────────────────────────────────────────────────────
  images: {
    unoptimized: false, // Enable Vercel image optimisation
    formats: ['image/avif', 'image/webp'],
  },

  // ── Rewrites — proxy /api/* → FastAPI backend in all environments ─────────
  // On Vercel, set NEXT_PUBLIC_API_URL to your Railway/Render backend URL.
  // In local dev, the rewrites below let you call /api/* without CORS issues.
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
      {
        source: '/health',
        destination: `${apiUrl}/health`,
      },
    ]
  },

  // ── Security Headers ────────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options',    value: 'nosniff' },
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-XSS-Protection',          value: '1; mode=block' },
          { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

export default nextConfig
