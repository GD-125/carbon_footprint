import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Carbon Dashboard',
  description:
    'View your personal carbon footprint breakdown, monthly emissions, Paris target compliance, and weekly trend charts — all powered by DEFRA 2023 emission factors.',
  openGraph: {
    title: 'Carbon Dashboard | CarbonWise AI',
    description: 'Track your monthly CO₂ emissions, budget, and breakdown by transport, food, energy, and shopping.',
    url: '/dashboard',
  },
  alternates: { canonical: '/dashboard' },
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
