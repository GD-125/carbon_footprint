import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Document Carbon Analyser',
  description:
    'Upload receipts, utility bills, or flight tickets and get an instant AI-powered estimate of their carbon footprint. Powered by Gemini Vision.',
  openGraph: {
    title: 'Document Carbon Analyser | CarbonWise AI',
    description: 'Upload any document and get a CO₂ impact estimate using Gemini Vision AI.',
    url: '/documents',
  },
  alternates: { canonical: '/documents' },
}

export default function DocumentsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
