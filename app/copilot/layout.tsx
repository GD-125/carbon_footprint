import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'AI Sustainability Copilot',
  description:
    'Chat with Gemini 2.5 Flash about your carbon footprint. Get personalised answers on reducing emissions, comparing transport options, and sustainable lifestyle changes.',
  openGraph: {
    title: 'AI Sustainability Copilot | CarbonWise AI',
    description: 'Ask Gemini 2.5 Flash anything about reducing your carbon footprint.',
    url: '/copilot',
  },
  alternates: { canonical: '/copilot' },
}

export default function CopilotLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
