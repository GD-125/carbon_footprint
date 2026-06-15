'use client'

import { useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { AppLayout } from '@/components/app-layout'
import {
  useAppStore,
  selectInsights,
  selectInsightsLoading,
  selectInsightsError,
} from '@/lib/store'
import { AlertCircle, TrendingDown, Lightbulb, Target, RefreshCw, Loader2, Sparkles } from 'lucide-react'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
}
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

export default function InsightsPage() {
  const insights = useAppStore(selectInsights)
  const isLoading = useAppStore(selectInsightsLoading)
  const error = useAppStore(selectInsightsError)
  const insightsState = useAppStore((s) => s.insightsState)
  const fetchInsights = useAppStore((s) => s.fetchInsights)
  const profile = useAppStore((s) => s.profile)

  const abortRef = useRef<AbortController | null>(null)

  const loadInsights = useCallback(() => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    if (profile.completedOnboarding) {
      fetchInsights(ctrl.signal)
    }
  }, [fetchInsights, profile.completedOnboarding])

  useEffect(() => {
    loadInsights()
    return () => { abortRef.current?.abort() }
  }, [loadInsights])

  const handleRefresh = () => {
    abortRef.current?.abort()
    loadInsights()
  }

  const highPriority = insights.filter((i) => i.priority === 'high')
  const mediumPriority = insights.filter((i) => i.priority === 'medium')
  const lowPriority = insights.filter((i) => i.priority === 'low')

  const aiSummary = insightsState.data?.overall_summary
  const priorityAction = insightsState.data?.priority_action
  const peerComparison = insightsState.data?.peer_comparison

  return (
    <AppLayout>
      <motion.div className="space-y-8" variants={container} initial="hidden" animate="show">
        {/* Header */}
        <motion.div variants={item} className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">AI-Generated Insights</h1>
            <p className="text-foreground/60">
              Personalised sustainability analysis powered by Gemini 2.5 Flash
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isLoading || !profile.completedOnboarding}
            className="flex items-center gap-2 px-4 py-2 glass border border-white/10 rounded-lg hover:bg-card/80 smooth-transition disabled:opacity-50 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Analyzing…' : 'Refresh'}
          </button>
        </motion.div>

        {/* Onboarding gate */}
        {!profile.completedOnboarding && (
          <motion.div
            variants={item}
            className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400"
          >
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm">Complete onboarding to unlock AI insights.</p>
          </motion.div>
        )}

        {/* Loading */}
        {isLoading && (
          <motion.div
            variants={item}
            className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10"
          >
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <p className="text-sm text-foreground/60">Generating AI insights…</p>
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <motion.div
            variants={item}
            className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
          >
            <AlertCircle className="w-4 h-4" />
            {error}
          </motion.div>
        )}

        {/* AI Summary */}
        {aiSummary && (
          <motion.div variants={item} className="glass p-6 rounded-xl border border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-primary">AI Summary</h3>
            </div>
            <p className="text-foreground/80 text-sm leading-relaxed">{aiSummary}</p>
            {priorityAction && (
              <div className="mt-4 p-3 bg-card/30 rounded-lg">
                <p className="text-xs text-foreground/50 mb-1">🎯 Priority Action</p>
                <p className="text-sm font-medium">{priorityAction}</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Peer Comparison */}
        {peerComparison && (
          <motion.div variants={item} className="glass p-6 rounded-xl border border-white/10">
            <h3 className="text-lg font-semibold mb-4">Peer Comparison</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Your Monthly', value: peerComparison.your_kg_month, unit: 'kg CO₂' },
                { label: 'Global Avg', value: peerComparison.global_average_kg_month, unit: 'kg CO₂' },
                { label: 'UK Avg', value: peerComparison.uk_average_kg_month, unit: 'kg CO₂' },
                { label: 'Paris Target', value: peerComparison.paris_target_kg_month, unit: 'kg CO₂' },
              ].map((stat) => (
                <div key={stat.label} className="p-3 bg-card/30 rounded-lg text-center">
                  <p className="text-xs text-foreground/50 mb-1">{stat.label}</p>
                  <p className="text-xl font-bold text-primary">{stat.value?.toFixed(0) ?? '—'}</p>
                  <p className="text-xs text-foreground/40">{stat.unit}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-foreground/40 mt-3">
              You are {peerComparison.vs_global_pct > 0 ? '+' : ''}{peerComparison.vs_global_pct?.toFixed(0)}% vs global average
            </p>
          </motion.div>
        )}

        {/* Summary Cards */}
        <motion.div variants={container} className="grid md:grid-cols-3 gap-6">
          <motion.div variants={item} className="glass p-6 rounded-xl border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <h3 className="font-semibold">High Priority</h3>
            </div>
            <p className="text-3xl font-bold mb-2">{highPriority.length}</p>
            <p className="text-sm text-foreground/60">Actions that save the most CO₂</p>
          </motion.div>

          <motion.div variants={item} className="glass p-6 rounded-xl border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <Target className="w-6 h-6 text-yellow-500" />
              <h3 className="font-semibold">Medium Priority</h3>
            </div>
            <p className="text-3xl font-bold mb-2">{mediumPriority.length}</p>
            <p className="text-sm text-foreground/60">Moderate impact opportunities</p>
          </motion.div>

          <motion.div variants={item} className="glass p-6 rounded-xl border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <Lightbulb className="w-6 h-6 text-blue-500" />
              <h3 className="font-semibold">Low Priority</h3>
            </div>
            <p className="text-3xl font-bold mb-2">{lowPriority.length}</p>
            <p className="text-sm text-foreground/60">Smaller impact actions</p>
          </motion.div>
        </motion.div>

        {/* Insights List */}
        <motion.div variants={container} className="space-y-8">
          {[
            { list: highPriority, label: 'High Priority Actions', color: 'red', emoji: '🔴' },
            { list: mediumPriority, label: 'Medium Priority Actions', color: 'yellow', emoji: '🟡' },
            { list: lowPriority, label: 'Low Priority Actions', color: 'blue', emoji: '🔵' },
          ]
            .filter(({ list }) => list.length > 0)
            .map(({ list, label, color, emoji }) => (
              <motion.div key={label} variants={item}>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <span>{emoji}</span>
                  {label}
                </h2>
                <div className="space-y-4">
                  {list.map((insight, index) => (
                    <motion.div
                      key={insight.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`glass p-6 rounded-xl border-2 border-${color}-500/20 bg-${color}-500/5`}
                    >
                      <div>
                        <h3 className="text-lg font-bold mb-2">{insight.title}</h3>
                        <p className="text-foreground/80 mb-3">{insight.description}</p>
                        {(insight.impact || insight.action) && (
                          <div className="grid md:grid-cols-2 gap-4 mb-4">
                            {insight.impact && (
                              <div className="p-3 bg-card/30 rounded-lg">
                                <p className="text-xs text-foreground/60 mb-1">Impact</p>
                                <p className="font-semibold text-primary">{insight.impact}</p>
                              </div>
                            )}
                            {insight.action && (
                              <div className="p-3 bg-card/30 rounded-lg">
                                <p className="text-xs text-foreground/60 mb-1">Action</p>
                                <p className="font-semibold text-accent">{insight.action}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}

          {!isLoading && insights.length === 0 && profile.completedOnboarding && !error && (
            <motion.div
              variants={item}
              className="text-center py-12 text-foreground/40"
            >
              <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Click Refresh to generate AI insights for your profile</p>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AppLayout>
  )
}
