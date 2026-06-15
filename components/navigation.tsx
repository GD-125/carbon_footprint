'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Leaf,
  MessageSquare,
  Settings,
  Zap,
  Trophy,
  Moon,
  Sun,
  Lightbulb,
  FileText,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'

export function Navigation() {
  const pathname = usePathname()
  const { isDarkMode, toggleTheme } = useAppStore()

  const navItems = [
    { href: '/', label: 'Home', icon: Leaf },
    { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { href: '/copilot', label: 'Copilot', icon: MessageSquare },
    { href: '/simulator', label: 'Simulator', icon: Zap },
    { href: '/insights', label: 'Insights', icon: Lightbulb },
    { href: '/documents', label: 'Documents', icon: FileText },
    { href: '/challenges', label: 'Challenges', icon: Trophy },
    { href: '/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <nav className="fixed left-0 top-0 h-screen w-64 glass border-r border-white/10 flex flex-col justify-between p-6">
      {/* Logo & Header */}
      <div>
        <Link href="/" className="flex items-center gap-2 mb-8">
          <Leaf className="w-8 h-8 text-primary" />
          <span className="text-xl font-bold">CarbonWise</span>
        </Link>

        {/* Navigation Items */}
        <div className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg smooth-transition',
                  isActive
                    ? 'bg-primary/20 text-primary'
                    : 'text-foreground/70 hover:bg-card hover:text-foreground'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="flex items-center justify-center w-full py-3 rounded-lg bg-card/50 hover:bg-card smooth-transition border border-white/10"
      >
        {isDarkMode ? (
          <Sun className="w-5 h-5 text-accent" />
        ) : (
          <Moon className="w-5 h-5 text-accent" />
        )}
      </button>
    </nav>
  )
}
