'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft, Leaf, Loader2, CheckCircle2 } from 'lucide-react'
import { useAppStore } from '@/lib/store'

// ── Questions map exactly to CarbonProfileRequest fields ─────────────────────
// Values are the exact API enum strings — no adapter translation required.

interface Question {
  id: string
  question: string
  subtitle: string
  icon: string
  type: 'choice' | 'number' | 'boolean'
  options?: { label: string; value: string; detail?: string; icon?: string }[]
  numberConfig?: { min: number; max: number; step: number; unit: string; default: number }
}

const questions: Question[] = [
  {
    id: 'commute',
    question: 'How do you travel to work?',
    subtitle: 'Your daily commute is often the largest source of personal transport emissions.',
    icon: '🚗',
    type: 'choice',
    options: [
      { label: 'Petrol / Diesel Car',  value: 'car',           icon: '🚗', detail: '~171 gCO₂/km' },
      { label: 'Electric Vehicle',     value: 'electric_car',  icon: '⚡', detail: '~47 gCO₂/km' },
      { label: 'Bus',                  value: 'bus',           icon: '🚌', detail: '~89 gCO₂/km' },
      { label: 'Train / Metro',        value: 'train',         icon: '🚆', detail: '~41 gCO₂/km' },
      { label: 'Bicycle / Walking',    value: 'bicycle',       icon: '🚴', detail: '0 gCO₂/km'   },
      { label: 'Motorcycle / Scooter', value: 'motorcycle',    icon: '🛵', detail: '~114 gCO₂/km'},
      { label: 'I work from home',     value: 'work_from_home',icon: '🏠', detail: 'No commute'  },
    ],
  },
  {
    id: 'commute_km_per_day',
    question: 'How far is your daily one-way commute?',
    subtitle: 'Enter the distance from home to work in kilometres. Enter 0 if you work from home.',
    icon: '📍',
    type: 'number',
    numberConfig: { min: 0, max: 200, step: 1, unit: 'km', default: 15 },
  },
  {
    id: 'food',
    question: 'What best describes your diet?',
    subtitle: 'Food production accounts for 26% of global greenhouse gas emissions.',
    icon: '🍽️',
    type: 'choice',
    options: [
      { label: 'Meat-Heavy',    value: 'meat_heavy',  icon: '🥩', detail: '~7.2 kg CO₂/day' },
      { label: 'Mixed / Flexitarian', value: 'mixed', icon: '🍱', detail: '~5.1 kg CO₂/day' },
      { label: 'Pescatarian',   value: 'pescatarian', icon: '🐟', detail: '~4.0 kg CO₂/day' },
      { label: 'Vegetarian',    value: 'vegetarian',  icon: '🥗', detail: '~3.8 kg CO₂/day' },
      { label: 'Vegan',         value: 'vegan',       icon: '🌱', detail: '~2.9 kg CO₂/day' },
    ],
  },
  {
    id: 'travel',
    question: 'How often do you travel by plane?',
    subtitle: 'A single long-haul flight can equal months of driving emissions.',
    icon: '✈️',
    type: 'choice',
    options: [
      { label: 'Never',               value: 'never',    icon: '🚫', detail: '0 flights/year'      },
      { label: 'Rarely (1–2 / year)', value: 'rarely',   icon: '✈️', detail: '1–2 flights/year'    },
      { label: 'Occasionally (~monthly)', value: 'monthly', icon: '🛫', detail: '~12 flights/year' },
      { label: 'Frequently (weekly+)',value: 'weekly',   icon: '🌍', detail: '50+ flights/year'    },
      { label: 'Very Frequent Flyer', value: 'frequent', icon: '💼', detail: '100+ flights/year'   },
    ],
  },
  {
    id: 'work',
    question: 'What is your primary work arrangement?',
    subtitle: 'Office buildings and commuting together account for a significant share of emissions.',
    icon: '🏢',
    type: 'choice',
    options: [
      { label: 'Office (full-time)',   value: 'office',  icon: '🏢', detail: 'Full office commute'   },
      { label: 'Hybrid (part remote)', value: 'hybrid',  icon: '🔀', detail: 'Reduced commute days'  },
      { label: 'Fully Remote',         value: 'remote',  icon: '💻', detail: 'No commute'            },
      { label: 'Not currently working',value: 'no_work', icon: '🏠', detail: 'Student / retired etc' },
    ],
  },
  {
    id: 'home_size',
    question: 'How would you describe your home?',
    subtitle: 'Home energy use for heating, cooling, and appliances is a major emissions source.',
    icon: '🏠',
    type: 'choice',
    options: [
      { label: 'Studio / Bedsit',       value: 'studio',            icon: '🚪', detail: '~30 m²'  },
      { label: 'Small Apartment',       value: 'apartment_small',   icon: '🏠', detail: '~50 m²'  },
      { label: 'Medium Apartment',      value: 'apartment_medium',  icon: '🏡', detail: '~80 m²'  },
      { label: 'Large Apartment / Flat',value: 'apartment_large',   icon: '🏘️', detail: '~120 m²' },
      { label: 'Small House',           value: 'house_small',       icon: '🏡', detail: '~100 m²' },
      { label: 'Large House',           value: 'house_large',       icon: '🏰', detail: '~200 m²' },
    ],
  },
  {
    id: 'renewable_energy',
    question: 'Is your home powered by renewable energy?',
    subtitle: 'Green energy tariffs, solar panels, or 100% renewable suppliers can cut home emissions by up to 80%.',
    icon: '☀️',
    type: 'boolean',
    options: [
      { label: 'Yes — renewable / green tariff', value: 'true',     icon: '🌱', detail: 'Solar, wind, or green tariff' },
      { label: 'No — standard grid supply',      value: 'false',    icon: '🔌', detail: 'Standard electricity supply'  },
      { label: 'Not sure',                        value: 'not_sure', icon: '❓', detail: 'We will use the grid average'  },
    ],
  },
  {
    id: 'shopping_habit',
    question: 'How would you describe your shopping habits?',
    subtitle: 'Manufacturing and shipping goods accounts for ~21% of a typical household carbon footprint.',
    icon: '🛍️',
    type: 'choice',
    options: [
      { label: 'Minimal — buy only essentials', value: 'minimal',  icon: '♻️', detail: 'Low consumption'     },
      { label: 'Average — typical consumer',    value: 'average',  icon: '🛒', detail: 'Moderate consumption' },
      { label: 'High — frequent shopper',       value: 'high',     icon: '🛍️', detail: 'High consumption'    },
    ],
  },
]

// ── Helper: build the final API payload from answers ─────────────────────────

function buildProfilePayload(answers: Record<string, string>) {
  return {
    commute:               answers.commute            ?? 'car',
    commute_km_per_day:    Number(answers.commute_km_per_day ?? 15),
    food:                  answers.food               ?? 'mixed',
    travel:                answers.travel             ?? 'rarely',
    work:                  answers.work               ?? 'office',
    home_size:             answers.home_size          ?? 'apartment_medium',
    renewable_energy:      answers.renewable_energy === 'true',
    shopping_habit:        answers.shopping_habit     ?? 'average',
    num_people_household:  2,
  }
}

export default function OnboardingPage() {
  const router = useRouter()
  const { setProfile } = useAppStore()
  const [currentStep, setCurrentStep]   = useState(0)
  const [answers, setAnswers]           = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [numberInput, setNumberInput]   = useState<Record<string, string>>({})

  const q = questions[currentStep]

  const handleAnswer = (value: string) => {
    setAnswers(prev => ({ ...prev, [q.id]: value }))
  }

  const handleNumberChange = (value: string) => {
    setNumberInput(prev => ({ ...prev, [q.id]: value }))
    setAnswers(prev => ({ ...prev, [q.id]: value }))
  }

  const canProceed = (): boolean => {
    if (q.type === 'number') {
      const v = Number(answers[q.id] ?? numberInput[q.id])
      const cfg = q.numberConfig!
      return !isNaN(v) && v >= cfg.min && v <= cfg.max
    }
    return q.id in answers && answers[q.id] !== ''
  }

  const handleNext = async () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(s => s + 1)
      return
    }

    // Final step — build payload and fire API
    setIsSubmitting(true)
    const payload = buildProfilePayload(answers)

    // Persist profile to store so all pages can read it
    setProfile({
      commute:            payload.commute,
      diet:               payload.food,
      travelFrequency:    payload.travel,
      workStyle:          payload.work,
      completedOnboarding: true,
    })

    // Pre-fetch carbon profile + recommendations for dashboard
    const store = (await import('@/lib/store')).useAppStore.getState()
    const ctrl  = new AbortController()
    await Promise.allSettled([
      store.fetchCarbonProfile(ctrl.signal),
      store.fetchRecommendations(undefined, ctrl.signal),
    ])

    router.push('/dashboard')
  }

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1)
  }

  const progress = ((currentStep) / questions.length) * 100

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-center gap-2 mb-5">
            <Leaf className="w-9 h-9 text-primary" />
            <span className="text-2xl font-bold">CarbonWise AI</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">Build your carbon profile</h1>
          <p className="text-foreground/60 text-sm">
            {questions.length} questions · Takes about 2 minutes · Powered by DEFRA 2023 data
          </p>
        </motion.div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs text-foreground/50 mb-2">
            <span>Question {currentStep + 1} of {questions.length}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <div className="h-1.5 bg-card rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
              animate={{ width: `${Math.max(progress, 4)}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
          <div className="flex gap-1 mt-2">
            {questions.map((_, i) => (
              <div
                key={i}
                className={`h-0.5 flex-1 rounded-full transition-colors duration-300 ${
                  i < currentStep ? 'bg-primary' : i === currentStep ? 'bg-accent' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="glass p-8 rounded-xl border border-white/10 mb-6"
          >
            {/* Question header */}
            <div className="flex items-start gap-3 mb-2">
              <span className="text-3xl mt-0.5">{q.icon}</span>
              <div>
                <h2 className="text-2xl font-bold leading-tight">{q.question}</h2>
                <p className="text-sm text-foreground/50 mt-1">{q.subtitle}</p>
              </div>
            </div>

            <div className="border-t border-white/5 my-5" />

            {/* Choice options */}
            {q.type !== 'number' && q.options && (
              <div className="space-y-2">
                {q.options.map((opt) => (
                  <motion.button
                    key={opt.value}
                    onClick={() => handleAnswer(opt.value)}
                    className={`w-full p-4 rounded-lg border-2 text-left smooth-transition flex items-center gap-4 ${
                      answers[q.id] === opt.value
                        ? 'border-primary bg-primary/10'
                        : 'border-white/10 bg-card/40 hover:bg-card/70 hover:border-white/20'
                    }`}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <span className="text-xl w-8 text-center flex-shrink-0">{opt.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm ${answers[q.id] === opt.value ? 'text-primary' : 'text-foreground'}`}>
                        {opt.label}
                      </p>
                      {opt.detail && (
                        <p className="text-xs text-foreground/45 mt-0.5">{opt.detail}</p>
                      )}
                    </div>
                    {answers[q.id] === opt.value && (
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    )}
                  </motion.button>
                ))}
              </div>
            )}

            {/* Number input */}
            {q.type === 'number' && q.numberConfig && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min={q.numberConfig.min}
                    max={q.numberConfig.max}
                    step={q.numberConfig.step}
                    value={numberInput[q.id] ?? q.numberConfig.default}
                    onChange={e => handleNumberChange(e.target.value)}
                    className="w-32 px-4 py-3 text-2xl font-bold text-center bg-card border-2 border-primary/40 rounded-xl text-foreground focus:outline-none focus:border-primary"
                  />
                  <span className="text-2xl font-semibold text-foreground/60">{q.numberConfig.unit}</span>
                </div>
                <input
                  type="range"
                  min={q.numberConfig.min}
                  max={q.numberConfig.max}
                  step={q.numberConfig.step}
                  value={numberInput[q.id] ?? q.numberConfig.default}
                  onChange={e => handleNumberChange(e.target.value)}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-foreground/40">
                  <span>{q.numberConfig.min} {q.numberConfig.unit}</span>
                  <span>{q.numberConfig.max} {q.numberConfig.unit}</span>
                </div>
                {/* Helpful context */}
                {(() => {
                  const v = Number(numberInput[q.id] ?? q.numberConfig!.default)
                  if (v === 0) return <p className="text-xs text-primary">No commute — zero transport emissions!</p>
                  if (v <= 5)  return <p className="text-xs text-foreground/50">Short commute — below average.</p>
                  if (v <= 20) return <p className="text-xs text-foreground/50">Average commute distance.</p>
                  if (v <= 50) return <p className="text-xs text-amber-400/80">Above average — consider hybrid working.</p>
                  return          <p className="text-xs text-red-400/80">Long commute — significant emissions impact.</p>
                })()}
              </div>
            )}

            <div className="border-t border-white/5 mt-6 pt-5 flex gap-3">
              <button
                onClick={handleBack}
                disabled={currentStep === 0}
                className="px-5 py-2.5 rounded-lg border border-white/10 font-medium text-sm hover:bg-card disabled:opacity-30 disabled:cursor-not-allowed smooth-transition flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleNext}
                disabled={!canProceed() || isSubmitting}
                className="ml-auto px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed smooth-transition flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analysing your profile…
                  </>
                ) : currentStep === questions.length - 1 ? (
                  <>Complete <CheckCircle2 className="w-4 h-4" /></>
                ) : (
                  <>Next <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Data trust footer */}
        <motion.div
          className="glass p-4 rounded-xl border border-white/10 flex items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <span className="text-2xl">🔒</span>
          <div>
            <p className="text-xs font-semibold text-foreground/70">Your data stays private</p>
            <p className="text-xs text-foreground/45">
              Emission factors sourced from DEFRA 2023 · IEA 2023 · ICAO 2023.
              No account required — data stored locally on your device.
            </p>
          </div>
        </motion.div>

      </div>
    </div>
  )
}
