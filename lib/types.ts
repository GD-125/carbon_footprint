/**
 * PHASE 3 — API Contract Types
 * Single source of truth for all frontend ↔ backend type contracts.
 * Mirrors backend app/schemas/schemas.py exactly.
 * All types are strict — no `any`.
 */

// ── Enums ───────────────────────────────────────────────────────────────────

export type CommuteType =
  | 'car'
  | 'electric_car'
  | 'bus'
  | 'train'
  | 'subway'
  | 'bicycle'
  | 'walking'
  | 'motorcycle'
  | 'work_from_home'

export type DietType =
  | 'vegan'
  | 'vegetarian'
  | 'pescatarian'
  | 'mixed'
  | 'meat_heavy'

export type TravelFrequency = 'never' | 'rarely' | 'monthly' | 'weekly' | 'frequent'

export type WorkLocation = 'office' | 'hybrid' | 'remote' | 'no_work'

export type EffortLevel = 'low' | 'medium' | 'high'

export type ImpactLevel = 'low' | 'medium' | 'high' | 'very_high'

export type ScenarioType =
  | 'electric_vehicle'
  | 'vegetarian_diet'
  | 'vegan_diet'
  | 'remote_work'
  | 'solar_power'
  | 'reduced_flights'
  | 'led_lighting'
  | 'plant_based_meals'

export type DocumentType =
  | 'pdf'
  | 'image'
  | 'receipt'
  | 'utility_bill'
  | 'flight_ticket'
  | 'unknown'

export type InsightSeverity = 'positive' | 'neutral' | 'warning' | 'critical'

// ── Copilot ─────────────────────────────────────────────────────────────────

export interface CopilotRequest {
  message: string
  context?: Record<string, unknown>
}

export interface CopilotResponse {
  answer: string
  sources: string[]
  suggestions: string[]
  tokens_used?: number
}

// ── Carbon Profile ───────────────────────────────────────────────────────────

export interface CarbonProfileRequest {
  commute: CommuteType
  commute_km_per_day: number
  food: DietType
  travel: TravelFrequency
  work: WorkLocation
  home_size: string
  shopping_habit: string
  renewable_energy: boolean
  num_people_household: number
}

export interface CarbonBreakdown {
  transport: number
  food: number
  energy: number
  shopping: number
  travel: number
  waste: number
}

export interface CarbonComparison {
  vs_global_average_pct: number
  global_monthly_avg_kg: number
  paris_target_monthly_kg: number
  is_below_global_average: boolean
  is_paris_compliant: boolean
}

export interface CarbonProfileResponse {
  carbon_score: number                    // 0-100
  category: string
  estimated_monthly_emissions: number     // kg CO2e/month
  breakdown: CarbonBreakdown
  comparison: CarbonComparison
  profile_id?: string
}

// ── Recommendations ──────────────────────────────────────────────────────────

export interface Recommendation {
  id: string
  title: string
  description: string
  estimated_co2_saving_kg_month: number
  effort_level: EffortLevel
  impact_level: ImpactLevel
  category: string
  quick_win: boolean
  implementation_tips: string[]
}

export interface RecommendationsRequest {
  profile: CarbonProfileRequest
  max_recommendations?: number
  focus_areas?: string[]
}

export interface RecommendationsResponse {
  recommendations: Recommendation[]
  total_potential_saving_kg_month: number
  quick_wins: Recommendation[]
  top_recommendation?: Recommendation
}

// ── Scenario Simulation ──────────────────────────────────────────────────────

export interface SimulationRequest {
  profile: CarbonProfileRequest
  scenario: ScenarioType
  custom_params?: Record<string, unknown>
}

export interface SimulationResult {
  scenario: ScenarioType
  scenario_label: string
  before_kg_month: number
  after_kg_month: number
  saved_kg_month: number
  saved_kg_year: number
  reduction_percentage: number
  assumptions: string[]
  equivalent_context: string[]
  payback_months?: number
}

// ── Insights ─────────────────────────────────────────────────────────────────

export interface InsightItem {
  category: string
  insight: string
  severity: InsightSeverity
  data_point?: string
}

export interface InsightsRequest {
  profile: CarbonProfileRequest
}

export interface InsightsResponse {
  insights: InsightItem[]
  overall_summary: string
  priority_action: string
  monthly_emissions_kg: number
  peer_comparison: {
    global_average_kg_month: number
    us_average_kg_month: number
    uk_average_kg_month: number
    paris_target_kg_month: number
    your_kg_month: number
    vs_global_pct: number
    vs_uk_pct: number
    paris_gap_kg_month: number
  }
}

// ── Document Analysis ─────────────────────────────────────────────────────────

export interface DocumentEmissions {
  total_kg_co2: number
  breakdown: Record<string, number>
  methodology: string
  notes: string[]
}

export interface ExtractedDocumentData {
  raw_text?: string
  document_subtype?: string
  date?: string
  vendor?: string
  total_amount?: number
  currency?: string
  items: Array<Record<string, unknown>>
  flight_details?: Record<string, unknown>
  utility_details?: Record<string, unknown>
  confidence_score: number
}

export interface DocumentAnalysisResponse {
  document_type: DocumentType
  extracted_data: ExtractedDocumentData
  estimated_emissions: DocumentEmissions
  processing_time_ms?: number
  warnings: string[]
}

// ── Health ────────────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  version: string
  environment: string
  components: Record<string, { status: string; message?: string; latency_ms?: number }>
}

// ── API Error ─────────────────────────────────────────────────────────────────

export interface ApiError {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}
