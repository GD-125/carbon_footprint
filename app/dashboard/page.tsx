'use client'

import { useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { AppLayout } from '@/components/app-layout'
import {
  useAppStore,
  selectCarbonData,
  selectProfileLoading,
  selectProfileError,
} from '@/lib/store'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { TrendingDown, Zap, Leaf, Target, RefreshCw, AlertCircle, Loader2 } from 'lucide-react'
import type { Metadata } from 'next'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
}
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

// ── Recharts tooltip formatter (typed correctly for recharts v3) ───────────────
const lineFormatter = (v: unknown) => [`${Number(v ?? 0).toFixed(3)} t`, 'Emissions'] as const
const pieFormatter  = (v: unknown) => [`${Number(v ?? 0).toFixed(3)} t`, ''] as const

export default function DashboardPage() {
  const carbonData         = useAppStore(selectCarbonData)
  const isLoading          = useAppStore(selectProfileLoading)
  const error              = useAppStore(selectProfileError)
  const profile            = useAppStore((s) => s.profile)
  // Pull stable action references out of the store once
  const fetchProfile       = useAppStore((s) => s.fetchCarbonProfile)
  const fetchRecommendations = useAppStore((s) => s.fetchRecommendations)

  const abortRef = useRef<AbortController | null>(null)

  // Stable load function — never changes reference
  const loadData = useCallback(() => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    fetchProfile(ctrl.signal)
    fetchRecommendations(undefined, ctrl.signal)
  }, [fetchProfile, fetchRecommendations])

  // Empty deps [] — safe because loadData is stable via useCallback
  useEffect(() => {
    loadData()
    return () => { abortRef.current?.abort() }
  }, [loadData])

  return (
    <AppLayout>
      <motion.div className="space-y-8" variants={container} initial="hidden" animate="show">

        {/* Header */}
        <motion.div variants={item} className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Your Carbon Dashboard</h1>
            <p className="text-foreground/60">
              {profile.completedOnboarding
                ? 'Showing personalised analysis for your profile'
                : 'Showing default profile — complete onboarding for personalised data'}
            </p>
          </div>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 glass border border-white/10 rounded-lg hover:bg-card/80 smooth-transition disabled:opacity-50 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Analyzing…' : 'Refresh'}
          </button>
        </motion.div>

        {/* Loading */}
        {isLoading && (
          <motion.div variants={item} className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <p className="text-sm text-foreground/60">
              Calculating carbon profile with DEFRA 2023 emission factors…
            </p>
          </motion.div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <motion.div variants={item} className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm">Showing cached data</p>
              <p className="text-xs text-amber-400/70">{error} — Is the backend running on port 8000?</p>
            </div>
          </motion.div>
        )}

        {/* Stats Grid */}
        <motion.div variants={container} className="grid md:grid-cols-4 gap-6">
          <motion.div variants={item} className="glass p-6 rounded-xl border border-white/10">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-foreground/60 text-sm font-medium">Monthly Emissions</h3>
              <Target className="w-5 h-5 text-accent" />
            </div>
            <div className="text-4xl font-bold mb-1">{carbonData.score.toFixed(2)}</div>
            <p className="text-sm text-foreground/60">tonnes CO₂/month</p>
            <div className="mt-4 w-full bg-card rounded-full h-2">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-accent to-primary"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (carbonData.score / 10) * 100)}%` }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>
          </motion.div>

          <motion.div variants={item} className="glass p-6 rounded-xl border border-white/10">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-foreground/60 text-sm font-medium">Paris Target</h3>
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div className="text-4xl font-bold mb-1">{carbonData.monthlyBudget.toFixed(2)}</div>
            <p className="text-sm text-foreground/60">tonnes CO₂/month</p>
            <div className="mt-4 space-y-1">
              <div className="flex justify-between text-xs">
                <span>Used</span><span>{carbonData.currentEmissions.toFixed(2)}</span>
              </div>
              <div className="w-full bg-card rounded-full h-2">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (carbonData.currentEmissions / Math.max(carbonData.monthlyBudget, 0.01)) * 100)}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
              </div>
            </div>
          </motion.div>

          <motion.div variants={item} className="glass p-6 rounded-xl border border-white/10">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-foreground/60 text-sm font-medium">Potential Savings</h3>
              <TrendingDown className="w-5 h-5 text-accent" />
            </div>
            <div className="text-4xl font-bold mb-1 text-primary">{carbonData.potentialSavings.toFixed(2)}</div>
            <p className="text-sm text-foreground/60">tonnes CO₂/month</p>
            {carbonData.currentEmissions > 0 && (
              <p className="text-xs text-primary mt-4">
                {((carbonData.potentialSavings / carbonData.currentEmissions) * 100).toFixed(0)}% reduction possible
              </p>
            )}
          </motion.div>

          <motion.div variants={item} className="glass p-6 rounded-xl border border-white/10">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-foreground/60 text-sm font-medium">Paris Compliance</h3>
              <Leaf className="w-5 h-5 text-primary" />
            </div>
            <div className="text-4xl font-bold mb-1">
              {carbonData.currentEmissions > carbonData.monthlyBudget ? '❌' : '✅'}
            </div>
            <p className="text-sm text-foreground/60">
              {carbonData.currentEmissions > carbonData.monthlyBudget ? 'Over Paris target' : 'Within Paris target'}
            </p>
            <div className="mt-4 text-xs text-foreground/60">
              {Math.abs(carbonData.monthlyBudget - carbonData.currentEmissions).toFixed(2)} t{' '}
              {carbonData.currentEmissions > carbonData.monthlyBudget ? 'over' : 'under'}
            </div>
          </motion.div>
        </motion.div>

        {/* Charts */}
        <motion.div variants={container} className="grid lg:grid-cols-2 gap-6">
          <motion.div variants={item} className="glass p-6 rounded-xl border border-white/10">
            <h3 className="text-lg font-semibold mb-6">Weekly Emissions Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={carbonData.weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="day" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12 }} />
                <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: 12 }}
                  formatter={lineFormatter}
                />
                <Line type="monotone" dataKey="emissions" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#14b8a6', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div variants={item} className="glass p-6 rounded-xl border border-white/10">
            <h3 className="text-lg font-semibold mb-6">Emissions by Source</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Transport', value: +carbonData.sources.transport.toFixed(3) },
                    { name: 'Food',      value: +carbonData.sources.food.toFixed(3) },
                    { name: 'Shopping',  value: +carbonData.sources.shopping.toFixed(3) },
                    { name: 'Energy',    value: +carbonData.sources.energy.toFixed(3) },
                  ]}
                  cx="50%" cy="50%" labelLine={false}
                  label={({ name, value }) => `${name}: ${value}t`}
                  outerRadius={80} dataKey="value"
                >
                  <Cell fill="#22c55e" />
                  <Cell fill="#14b8a6" />
                  <Cell fill="#06b6d4" />
                  <Cell fill="#0ea5e9" />
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: 12 }}
                  formatter={pieFormatter}
                />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>
        </motion.div>

        {/* Breakdown */}
        <motion.div variants={item} className="glass p-6 rounded-xl border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Detailed Breakdown</h3>
            <span className="text-xs text-foreground/40">Source: DEFRA 2023 · IEA 2023</span>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { label: 'Transport', value: carbonData.sources.transport, icon: '🚗' },
              { label: 'Food',      value: carbonData.sources.food,      icon: '🍽️' },
              { label: 'Shopping',  value: carbonData.sources.shopping,  icon: '🛍️' },
              { label: 'Energy',    value: carbonData.sources.energy,    icon: '⚡' },
            ].map((s) => (
              <div key={s.label} className="p-4 bg-card/30 rounded-lg">
                <p className="text-2xl mb-2">{s.icon}</p>
                <p className="text-foreground/60 text-sm mb-1">{s.label}</p>
                <p className="text-2xl font-bold text-primary">{s.value.toFixed(3)}</p>
                <p className="text-xs text-foreground/50 mt-1">tonnes CO₂/month</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Onboarding CTA */}
        {!profile.completedOnboarding && !isLoading && (
          <motion.div variants={item} className="glass p-6 rounded-xl border border-primary/30 bg-primary/5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold mb-1">Get Personalised Analysis</h3>
                <p className="text-sm text-foreground/60">
                  Complete the 5-question onboarding to get data tailored to your lifestyle
                </p>
              </div>
              <a
                href="/onboarding"
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 smooth-transition text-sm flex-shrink-0"
              >
                Start Onboarding →
              </a>
            </div>
          </motion.div>
        )}

      </motion.div>
    </AppLayout>
  )
}
