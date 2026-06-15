import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Scenario Simulator',
  description:
    'Simulate the carbon impact of lifestyle changes like switching to an EV, going vegan, installing solar, or working remotely. Powered by IEA, DEFRA, and ICAO 2023 emission factors.',
  openGraph: {
    title: 'Carbon Scenario Simulator | CarbonWise AI',
    description: 'Run AI-powered simulations to see how lifestyle changes reduce your CO₂ emissions.',
    url: '/simulator',
  },
  alternates: { canonical: '/simulator' },
}

export default function SimulatorLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
