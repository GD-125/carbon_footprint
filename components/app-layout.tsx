'use client'

import { Navigation } from './navigation'
import { BackendStatus } from './backend-status'

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Navigation />
      <main className="flex-1 ml-64 p-8 overflow-auto">
        {children}
      </main>
      <BackendStatus />
    </div>
  )
}
