import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

// ── Fonts ─────────────────────────────────────────────────────────────────────
const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

// ── Viewport (required separate export in Next.js 15) ─────────────────────────
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
}

// ── Metadata ─────────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://carbonwise-ai.vercel.app'
  ),
  title: {
    default: 'CarbonWise AI — AI-Powered Carbon Footprint Tracker',
    template: '%s | CarbonWise AI',
  },
  description:
    'Track, analyse, and reduce your personal carbon footprint with CarbonWise AI. Get Gemini-powered insights, scenario simulations, and sustainability recommendations tailored to your lifestyle.',
  keywords: [
    'carbon footprint calculator',
    'AI sustainability',
    'carbon tracker',
    'reduce carbon emissions',
    'sustainability AI',
    'Gemini AI climate',
    'carbon budget',
    'eco friendly lifestyle',
    'CO2 emissions tracker',
    'climate action',
    'carbon neutrality',
    'green living',
  ],
  authors: [{ name: 'CarbonWise AI', url: 'https://carbonwise-ai.vercel.app' }],
  creator: 'CarbonWise AI',
  publisher: 'CarbonWise AI',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://carbonwise-ai.vercel.app',
    siteName: 'CarbonWise AI',
    title: 'CarbonWise AI — AI-Powered Carbon Footprint Tracker',
    description:
      'Reduce your carbon footprint with personalised AI insights, scenario simulations, and sustainability recommendations powered by Gemini 2.5 Flash.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CarbonWise AI — Sustainability Intelligence Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CarbonWise AI — AI-Powered Carbon Footprint Tracker',
    description:
      'Reduce your carbon footprint with AI-powered insights and sustainability recommendations.',
    images: ['/og-image.png'],
    creator: '@carbonwiseai',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  category: 'technology',
}

// ── Layout ────────────────────────────────────────────────────────────────────
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} bg-background`}
    >
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
