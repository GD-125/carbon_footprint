import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'AI Sustainability Insights',
  description:
    'Get AI-generated sustainability insights tailored to your carbon profile. Understand peer comparisons, priority actions, and your Paris Agreement compliance status.',
  openGraph: {
    title: 'AI Sustainability Insights | CarbonWise AI',
    description: 'Personalised AI insights to help you reduce your carbon footprint and meet Paris targets.',
    url: '/insights',
  },
  alternates: { canonical: '/insights' },
}

export default function InsightsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
