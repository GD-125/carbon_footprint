'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { AppLayout } from '@/components/app-layout'
import {
  useAppStore,
  selectSimulations,
  selectSimulationLoadingId,
} from '@/lib/store'
import { ArrowRight, TrendingDown, Zap, AlertCircle, Loader2, TreePine } from 'lucide-react'
import type { ScenarioType } from '@/lib/types'

interface Scenario {
  id: ScenarioType
  name: string
  category: string
  icon: string
  description: string
  details: string
}

const SCENARIOS: Scenario[] = [
  {
    id: 'electric_vehicle',
    name: 'Buy an EV',
    category: 'Transportation',
    icon: '🚗',
    description: 'Switch from gas car to electric vehicle',
    details:
      'EV lifetime emissions are ~68% lower than petrol cars on the average grid. Backend calculates your actual savings based on your commute distance.',
  },
  {
    id: 'vegetarian_diet',
    name: 'Go Vegetarian',
    category: 'Food',
    icon: '🌱',
    description: 'Switch to a vegetarian diet',
    details:
      'Based on Oxford University 2023 data. Savings depend on your current diet type.',
  },
  {
    id: 'vegan_diet',
    name: 'Go Vegan',
    category: 'Food',
    icon: '🥗',
    description: 'Switch to a fully plant-based diet',
    details:
      'Vegan diets produce ~49% less CO₂ than meat-heavy diets (Oxford 2023).',
  },
  {
    id: 'remote_work',
    name: 'Work Remotely',
    category: 'Transportation',
    icon: '💻',
    description: 'Switch to 100% remote work',
    details:
      'Eliminates commute emissions. Backend offsets WFH home energy increase.',
  },
  {
    id: 'solar_power',
    name: 'Install Solar Panels',
    category: 'Energy',
    icon: '☀️',
    description: 'Cover home electricity with solar',
    details:
      'Reduces electricity emissions by up to 95%. Includes manufacture amortisation (IPCC 2022).',
  },
  {
    id: 'reduced_flights',
    name: 'Reduce Flights',
    category: 'Travel',
    icon: '✈️',
    description: 'Cut flights by 75%',
    details:
      'ICAO 2023 emission factors. Radiative forcing not included (would add 2–4×).',
  },
  {
    id: 'led_lighting',
    name: 'Switch to LED',
    category: 'Energy',
    icon: '💡',
    description: 'Replace all bulbs with LED',
    details: 'Saves ~5 kWh/month vs incandescent. Quick win with fast payback.',
  },
  {
    id: 'plant_based_meals',
    name: 'Plant-Based Meals',
    category: 'Food',
    icon: '🌿',
    description: 'Replace 7 meals/week with plant-based',
    details: 'Partial diet shift — ideal starting point before going fully vegetarian.',
  },
]

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

export default function SimulatorPage() {
  const carbonData = useAppStore((s) => s.carbonData)
  const simulations = useAppStore(selectSimulations)
  const loadingId = useAppStore(selectSimulationLoadingId)
  const simError = useAppStore((s) => s.simulationError)
  const runSimulation = useAppStore((s) => s.runScenarioSimulation)
  const removeSimulation = useAppStore((s) => s.removeSimulation)
  const profile = useAppStore((s) => s.profile)

  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  const handleApplyScenario = async (scenario: Scenario) => {
    const isActive = simulations.some((s) => s.id === scenario.id)

    if (isActive) {
      removeSimulation(scenario.id)
      return
    }

    abortRef.current?.abort()
    abortRef.current = new AbortController()
    await runSimulation(scenario.id, scenario.name, abortRef.current.signal)
  }

  const totalSavings = simulations.reduce((sum, s) => sum + s.savings, 0)
  const projectedEmissions = Math.max(0, carbonData.currentEmissions - totalSavings)

  const canSimulate = profile.completedOnboarding

  return (
    <AppLayout>
      <motion.div className="space-y-8" variants={container} initial="hidden" animate="show">
        {/* Header */}
        <motion.div variants={item}>
          <h1 className="text-4xl font-bold mb-2">Scenario Simulator</h1>
          <p className="text-foreground/60">
            AI-powered simulations — powered by real emission factors from DEFRA, IEA & ICAO
          </p>
        </motion.div>

        {/* Error */}
        {simError && (
          <motion.div
            variants={item}
            className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
          >
            <AlertCircle className="w-4 h-4" />
            {simError}
          </motion.div>
        )}

        {/* No profile warning */}
        {!canSimulate && (
          <motion.div
            variants={item}
            className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">
              Complete onboarding first to get personalised simulations.
            </p>
          </motion.div>
        )}

        {/* Impact Summary */}
        <motion.div variants={item} className="glass p-8 rounded-xl border border-white/10">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <p className="text-foreground/60 text-sm font-medium mb-2">Current Emissions</p>
              <p className="text-4xl font-bold">{carbonData.currentEmissions.toFixed(2)}</p>
              <p className="text-xs text-foreground/50 mt-1">tonnes CO₂/month</p>
            </div>
            <div>
              <p className="text-foreground/60 text-sm font-medium mb-2">Potential Savings</p>
              <p className="text-4xl font-bold text-primary">-{totalSavings.toFixed(2)}</p>
              <p className="text-xs text-foreground/50 mt-1">tonnes CO₂/month</p>
            </div>
            <div>
              <p className="text-foreground/60 text-sm font-medium mb-2">Projected Emissions</p>
              <p className="text-4xl font-bold text-accent">{projectedEmissions.toFixed(2)}</p>
              <p className="text-xs text-foreground/50 mt-1">tonnes CO₂/month</p>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-white/10">
            <p className="text-sm text-foreground/60 mb-4">Impact visualization</p>
            <div className="space-y-2">
              {[
                { label: 'Current', value: carbonData.currentEmissions, color: 'from-red-500 to-orange-500' },
                { label: 'Projected', value: projectedEmissions, color: 'from-yellow-500 to-green-500' },
              ].map((bar) => (
                <div key={bar.label} className="flex items-center gap-4">
                  <span className="text-xs font-medium w-20">{bar.label}</span>
                  <div className="flex-1 bg-card rounded-full h-4 overflow-hidden">
                    <motion.div
                      className={`h-full bg-gradient-to-r ${bar.color}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (bar.value / 10) * 100)}%` }}
                      transition={{ duration: 1 }}
                    />
                  </div>
                  <span className="text-xs w-12 text-right">
                    {((bar.value / 10) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Scenario Cards */}
        <motion.div variants={container} className="grid md:grid-cols-2 gap-6">
          {SCENARIOS.map((scenario) => {
            const isActive = simulations.some((s) => s.id === scenario.id)
            const isLoading = loadingId === scenario.id
            const result = simulations.find((s) => s.id === scenario.id)

            return (
              <motion.div
                key={scenario.id}
                variants={item}
                className={`glass p-6 rounded-xl border-2 smooth-transition cursor-pointer ${
                  isActive
                    ? 'border-primary bg-primary/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
                onClick={() => setSelectedScenario(scenario)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    <span className="text-3xl">{scenario.icon}</span>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-1">{scenario.name}</h3>
                      <p className="text-xs text-foreground/60 mb-2">{scenario.category}</p>
                      <p className="text-sm text-foreground/70">{scenario.description}</p>
                    </div>
                  </div>
                  {isActive && (
                    <span className="inline-block px-2 py-1 rounded text-xs bg-primary/30 text-primary font-semibold">
                      Applied
                    </span>
                  )}
                </div>

                {/* AI Result */}
                {result && (
                  <div className="bg-card/30 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-xs text-foreground/60">Before</p>
                        <p className="text-xl font-bold">{result.before.toFixed(2)}</p>
                        <p className="text-xs text-foreground/50">tonnes CO₂/month</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-foreground/40" />
                      <div>
                        <p className="text-xs text-foreground/60">After</p>
                        <p className="text-xl font-bold text-primary">{result.after.toFixed(2)}</p>
                        <p className="text-xs text-foreground/50">tonnes CO₂/month</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-primary text-sm font-semibold">
                      <TrendingDown className="w-4 h-4" />
                      {result.savings.toFixed(2)} tonnes saved
                    </div>
                    {result.equivalentContext && result.equivalentContext.length > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-foreground/50">
                        <TreePine className="w-3 h-3" />
                        {result.equivalentContext[0]}
                      </div>
                    )}
                  </div>
                )}

                {/* Apply Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (canSimulate) handleApplyScenario(scenario)
                  }}
                  disabled={isLoading || (!canSimulate && !isActive)}
                  className={`w-full py-2 rounded-lg font-medium smooth-transition flex items-center justify-center gap-2 ${
                    isActive
                      ? 'bg-primary/20 text-primary hover:bg-primary/30'
                      : 'bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Simulating…
                    </>
                  ) : isActive ? (
                    'Remove Scenario'
                  ) : (
                    'Apply Scenario'
                  )}
                </button>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Detail Modal */}
        {selectedScenario && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass p-8 rounded-xl border border-white/10"
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  {selectedScenario.icon} {selectedScenario.name}
                </h2>
                <p className="text-foreground/60">{selectedScenario.category}</p>
              </div>
              <button
                onClick={() => setSelectedScenario(null)}
                className="text-foreground/60 hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-foreground/80">{selectedScenario.details}</p>

              {/* Assumptions from real API */}
              {simulations.find((s) => s.id === selectedScenario.id)?.assumptions && (
                <div className="bg-card/30 rounded-lg p-4">
                  <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    AI Assumptions Used
                  </p>
                  <ul className="space-y-1">
                    {simulations
                      .find((s) => s.id === selectedScenario.id)
                      ?.assumptions?.map((a, i) => (
                        <li key={i} className="text-xs text-foreground/60">
                          · {a}
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              <button
                onClick={() => {
                  handleApplyScenario(selectedScenario)
                  setSelectedScenario(null)
                }}
                disabled={!canSimulate}
                className={`w-full py-3 rounded-lg font-semibold smooth-transition disabled:opacity-50 ${
                  simulations.some((s) => s.id === selectedScenario.id)
                    ? 'bg-primary/20 text-primary hover:bg-primary/30'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {simulations.some((s) => s.id === selectedScenario.id)
                  ? 'Remove from Simulation'
                  : 'Add to Simulation'}
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AppLayout>
  )
}
