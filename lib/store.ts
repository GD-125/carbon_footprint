/**
 * PHASE 5 — Enhanced Zustand Store
 * Full async state management for all 6 CarbonWise AI features.
 *
 * Design:
 * - Each feature has its own loading + error state
 * - Async actions call real services (not mocks)
 * - Selectors exported for performance (avoid object creation in render)
 * - Persist profile + chat across sessions
 * - CarbonData retains display-unit format (tonnes) for charts
 */
import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import { buildProfileRequest, adaptProfileResponse, adaptInsightItem } from './adapters'
import { analyzeProfile } from './services/profile.service'
import { sendCopilotMessage } from './services/copilot.service'
import { getRecommendations } from './services/recommendation.service'
import { runSimulation } from './services/simulation.service'
import { getInsights } from './services/insight.service'
import { CarbonApiError } from './api-client'
import type {
  CarbonProfileRequest,
  CarbonProfileResponse,
  CopilotResponse,
  RecommendationsResponse,
  SimulationResult,
  InsightsResponse,
  ScenarioType,
} from './types'

// ── Domain types (display format) ─────────────────────────────────────────────

export interface UserProfile {
  location: string
  commute: string
  diet: string
  travelFrequency: string
  workStyle: string
  completedOnboarding: boolean
}

export interface CarbonData {
  score: number
  monthlyBudget: number
  currentEmissions: number
  potentialSavings: number
  weeklyTrend: Array<{ day: string; emissions: number }>
  sources: {
    transport: number
    food: number
    shopping: number
    energy: number
  }
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  sources?: string[]
  suggestions?: string[]
  isError?: boolean
}

export interface Simulation {
  id: string
  name: string
  category: string
  before: number
  after: number
  savings: number
  description: string
  assumptions?: string[]
  equivalentContext?: string[]
}

export interface Challenge {
  id: string
  name: string
  description: string
  progress: number
  target: number
  badge?: string
  completed: boolean
}

export interface Insight {
  id: string
  title: string
  description: string
  impact: string
  action: string
  priority: 'high' | 'medium' | 'low'
}

// ── Async feature state slices ─────────────────────────────────────────────────

interface AsyncState<T> {
  data: T | null
  isLoading: boolean
  error: string | null
  lastFetched: number | null
}

function makeAsync<T>(initial?: T): AsyncState<T> {
  return { data: initial ?? null, isLoading: false, error: null, lastFetched: null }
}

// ── Store interface ───────────────────────────────────────────────────────────

interface AppStore {
  // ── Profile ──────────────────────────────────────────────────────────────
  profile: UserProfile
  setProfile: (profile: Partial<UserProfile>) => void

  // ── Carbon Data ───────────────────────────────────────────────────────────
  carbonData: CarbonData
  setCarbonData: (data: Partial<CarbonData>) => void

  // ── API response cache (raw backend data) ─────────────────────────────────
  profileApiData: AsyncState<CarbonProfileResponse>
  fetchCarbonProfile: (signal?: AbortSignal) => Promise<void>

  // ── Copilot Chat ──────────────────────────────────────────────────────────
  messages: ChatMessage[]
  isCopilotLoading: boolean
  copilotError: string | null
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  clearChat: () => void
  sendCopilotMessage: (text: string, signal?: AbortSignal) => Promise<void>

  // ── Recommendations ───────────────────────────────────────────────────────
  recommendationsState: AsyncState<RecommendationsResponse>
  fetchRecommendations: (focusAreas?: string[], signal?: AbortSignal) => Promise<void>

  // ── Simulations ───────────────────────────────────────────────────────────
  simulations: Simulation[]
  simulationLoadingId: string | null
  simulationError: string | null
  runScenarioSimulation: (
    scenarioId: ScenarioType,
    scenarioName: string,
    signal?: AbortSignal
  ) => Promise<void>
  removeSimulation: (id: string) => void
  clearSimulations: () => void

  // ── Insights ──────────────────────────────────────────────────────────────
  insights: Insight[]
  insightsState: AsyncState<InsightsResponse>
  fetchInsights: (signal?: AbortSignal) => Promise<void>

  // ── Challenges (static/gamification) ─────────────────────────────────────
  challenges: Challenge[]
  updateChallenge: (id: string, challenge: Partial<Challenge>) => void

  // ── UI ────────────────────────────────────────────────────────────────────
  isDarkMode: boolean
  toggleTheme: () => void

  // ── Settings ──────────────────────────────────────────────────────────────
  canExportData: () => string
  canImportData: (data: string) => void
}

// ── Default values ────────────────────────────────────────────────────────────

const defaultCarbonData: CarbonData = {
  score: 6.2,
  monthlyBudget: 10,
  currentEmissions: 8.5,
  potentialSavings: 2.1,
  weeklyTrend: [
    { day: 'Mon', emissions: 1.8 },
    { day: 'Tue', emissions: 1.6 },
    { day: 'Wed', emissions: 1.7 },
    { day: 'Thu', emissions: 1.5 },
    { day: 'Fri', emissions: 2.1 },
    { day: 'Sat', emissions: 0.4 },
    { day: 'Sun', emissions: 0.4 },
  ],
  sources: { transport: 4.2, food: 2.1, shopping: 1.0, energy: 1.2 },
}

const defaultChallenges: Challenge[] = [
  {
    id: '1',
    name: 'No-Car Week',
    description: 'Use alternative transport for 7 days',
    progress: 5,
    target: 7,
    completed: false,
  },
  {
    id: '2',
    name: 'Green Commute Month',
    description: 'Use public transport or bike 20 days',
    progress: 12,
    target: 20,
    completed: false,
  },
  {
    id: '3',
    name: 'Plant-Based Challenge',
    description: 'Go vegetarian for 14 days',
    progress: 14,
    target: 14,
    badge: '🌱',
    completed: true,
  },
]

// ── Store ─────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // ── Profile ──────────────────────────────────────────────────────
        profile: {
          location: '',
          commute: '',
          diet: '',
          travelFrequency: '',
          workStyle: '',
          completedOnboarding: false,
        },
        setProfile: (profile) =>
          set((state) => ({ profile: { ...state.profile, ...profile } })),

        // ── Carbon Data ──────────────────────────────────────────────────
        carbonData: defaultCarbonData,
        setCarbonData: (data) =>
          set((state) => ({ carbonData: { ...state.carbonData, ...data } })),

        // ── Profile API ──────────────────────────────────────────────────
        profileApiData: makeAsync<CarbonProfileResponse>(),

        fetchCarbonProfile: async (signal) => {
          const { profile } = get()

          set((state) => ({
            profileApiData: { ...state.profileApiData, isLoading: true, error: null },
          }))

          try {
            // Use real profile if onboarded, otherwise safe defaults for demo
            const request = profile.completedOnboarding
              ? buildProfileRequest({
                  commute: profile.commute,
                  diet: profile.diet,
                  travelFrequency: profile.travelFrequency,
                  workStyle: profile.workStyle,
                })
              : {
                  commute: 'car' as const,
                  commute_km_per_day: 20.0,
                  food: 'mixed' as const,
                  travel: 'rarely' as const,
                  work: 'office' as const,
                  home_size: 'apartment_medium',
                  shopping_habit: 'average',
                  renewable_energy: false,
                  num_people_household: 2,
                }

            const response = await analyzeProfile(request, signal)
            const adapted = adaptProfileResponse(response)

            set({
              profileApiData: {
                data: response,
                isLoading: false,
                error: null,
                lastFetched: Date.now(),
              },
              carbonData: adapted,
            })
          } catch (err) {
            if (signal?.aborted) return
            const msg = err instanceof CarbonApiError ? err.message : 'Failed to analyze profile'
            set((state) => ({
              profileApiData: { ...state.profileApiData, isLoading: false, error: msg },
            }))
          }
        },

        // ── Copilot Chat ─────────────────────────────────────────────────
        messages: [],
        isCopilotLoading: false,
        copilotError: null,

        addMessage: (message) =>
          set((state) => ({
            messages: [
              ...state.messages,
              { ...message, id: `${Date.now()}-${Math.random()}`, timestamp: Date.now() },
            ],
          })),

        clearChat: () => set({ messages: [], copilotError: null }),

        sendCopilotMessage: async (text, signal) => {
          const { addMessage, profile, profileApiData } = get()

          // Add user message immediately
          addMessage({ role: 'user', content: text.trim() })
          set({ isCopilotLoading: true, copilotError: null })

          try {
            // Build optional context from profile API data
            const context = profileApiData.data
              ? { ...profileApiData.data, profile }
              : undefined

            const response: CopilotResponse = await sendCopilotMessage(
              text,
              context as Record<string, unknown> | undefined,
              signal
            )

            addMessage({
              role: 'assistant',
              content: response.answer,
              sources: response.sources,
              suggestions: response.suggestions,
            })
          } catch (err) {
            if (signal?.aborted) {
              set({ isCopilotLoading: false })
              return
            }
            const msg = err instanceof CarbonApiError ? err.message : 'AI response failed. Please try again.'
            addMessage({
              role: 'assistant',
              content: `⚠️ ${msg}`,
              isError: true,
            })
            set({ copilotError: msg })
          } finally {
            set({ isCopilotLoading: false })
          }
        },

        // ── Recommendations ──────────────────────────────────────────────
        recommendationsState: makeAsync<RecommendationsResponse>(),

        fetchRecommendations: async (focusAreas, signal) => {
          const { profile } = get()

          set((state) => ({
            recommendationsState: { ...state.recommendationsState, isLoading: true, error: null },
          }))

          try {
            const request = profile.completedOnboarding
              ? buildProfileRequest({
                  commute: profile.commute,
                  diet: profile.diet,
                  travelFrequency: profile.travelFrequency,
                  workStyle: profile.workStyle,
                })
              : {
                  commute: 'car' as const,
                  commute_km_per_day: 20.0,
                  food: 'mixed' as const,
                  travel: 'rarely' as const,
                  work: 'office' as const,
                  home_size: 'apartment_medium',
                  shopping_habit: 'average',
                  renewable_energy: false,
                  num_people_household: 2,
                }

            const data = await getRecommendations(request, { focusAreas, signal })

            // Update potential savings in carbon data
            set((state) => ({
              recommendationsState: { data, isLoading: false, error: null, lastFetched: Date.now() },
              carbonData: {
                ...state.carbonData,
                potentialSavings: data.total_potential_saving_kg_month / 1000, // kg → tonnes
              },
            }))
          } catch (err) {
            if (signal?.aborted) return
            const msg = err instanceof CarbonApiError ? err.message : 'Failed to fetch recommendations'
            set((state) => ({
              recommendationsState: { ...state.recommendationsState, isLoading: false, error: msg },
            }))
          }
        },

        // ── Simulations ──────────────────────────────────────────────────
        simulations: [],
        simulationLoadingId: null,
        simulationError: null,

        runScenarioSimulation: async (scenarioId, scenarioName, signal) => {
          const { profile, simulations } = get()

          // Toggle off if already active
          if (simulations.some((s) => s.id === scenarioId)) {
            set((state) => ({
              simulations: state.simulations.filter((s) => s.id !== scenarioId),
            }))
            return
          }

          set({ simulationLoadingId: scenarioId, simulationError: null })

          try {
            const request = buildProfileRequest({
              commute: profile.commute,
              diet: profile.diet,
              travelFrequency: profile.travelFrequency,
              workStyle: profile.workStyle,
            })

            const result: SimulationResult = await runSimulation(request, scenarioId, undefined, signal)

            const simulation: Simulation = {
              id: scenarioId,
              name: scenarioName,
              category: result.scenario_label,
              before: result.before_kg_month / 1000, // kg → tonnes
              after: result.after_kg_month / 1000,
              savings: result.saved_kg_month / 1000,
              description: result.assumptions[0] ?? '',
              assumptions: result.assumptions,
              equivalentContext: result.equivalent_context,
            }

            set((state) => ({
              simulations: [...state.simulations, simulation],
              simulationLoadingId: null,
            }))
          } catch (err) {
            if (signal?.aborted) {
              set({ simulationLoadingId: null })
              return
            }
            const msg = err instanceof CarbonApiError ? err.message : 'Simulation failed'
            set({ simulationError: msg, simulationLoadingId: null })
          }
        },

        removeSimulation: (id) =>
          set((state) => ({
            simulations: state.simulations.filter((s) => s.id !== id),
          })),

        clearSimulations: () => set({ simulations: [] }),

        // ── Insights ─────────────────────────────────────────────────────
        insights: [],
        insightsState: makeAsync<InsightsResponse>(),

        fetchInsights: async (signal) => {
          const { profile } = get()
          if (!profile.completedOnboarding) return

          set((state) => ({
            insightsState: { ...state.insightsState, isLoading: true, error: null },
          }))

          try {
            const request = buildProfileRequest({
              commute: profile.commute,
              diet: profile.diet,
              travelFrequency: profile.travelFrequency,
              workStyle: profile.workStyle,
            })

            const data = await getInsights(request, signal)

            const storeInsights = data.insights.map(adaptInsightItem)

            set({
              insightsState: { data, isLoading: false, error: null, lastFetched: Date.now() },
              insights: storeInsights,
            })
          } catch (err) {
            if (signal?.aborted) return
            const msg = err instanceof CarbonApiError ? err.message : 'Failed to fetch insights'
            set((state) => ({
              insightsState: { ...state.insightsState, isLoading: false, error: msg },
            }))
          }
        },

        // ── Challenges ───────────────────────────────────────────────────
        challenges: defaultChallenges,
        updateChallenge: (id, challenge) =>
          set((state) => ({
            challenges: state.challenges.map((c) =>
              c.id === id ? { ...c, ...challenge } : c
            ),
          })),

        // ── UI ────────────────────────────────────────────────────────────
        isDarkMode: true,
        toggleTheme: () =>
          set((state) => ({ isDarkMode: !state.isDarkMode })),

        // ── Settings ──────────────────────────────────────────────────────
        canExportData: () => JSON.stringify(get()),
        canImportData: (data) => {
          try {
            const parsed = JSON.parse(data)
            set(parsed)
          } catch {
            console.error('Failed to import data')
          }
        },
      }),
      {
        name: 'carbon-wise-store',
        version: 2,
        // Only persist user profile + theme (not loading states)
        partialize: (state) => ({
          profile: state.profile,
          carbonData: state.carbonData,
          messages: state.messages,
          challenges: state.challenges,
          isDarkMode: state.isDarkMode,
        }),
      }
    )
  )
)

// ── Typed selectors ───────────────────────────────────────────────────────────

export const selectProfile = (s: AppStore) => s.profile
export const selectCarbonData = (s: AppStore) => s.carbonData
export const selectMessages = (s: AppStore) => s.messages
export const selectIsCopilotLoading = (s: AppStore) => s.isCopilotLoading
export const selectCopilotError = (s: AppStore) => s.copilotError
export const selectInsights = (s: AppStore) => s.insights
export const selectInsightsLoading = (s: AppStore) => s.insightsState.isLoading
export const selectInsightsError = (s: AppStore) => s.insightsState.error
export const selectSimulations = (s: AppStore) => s.simulations
export const selectSimulationLoadingId = (s: AppStore) => s.simulationLoadingId
export const selectRecommendations = (s: AppStore) =>
  s.recommendationsState.data?.recommendations ?? []
export const selectRecommendationsLoading = (s: AppStore) => s.recommendationsState.isLoading
export const selectProfileLoading = (s: AppStore) => s.profileApiData.isLoading
export const selectProfileError = (s: AppStore) => s.profileApiData.error
