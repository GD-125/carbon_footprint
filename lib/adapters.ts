/**
 * PHASE 4 — Profile Adapter
 * Maps onboarding form values (display strings) → backend API enums.
 * Maps backend API responses (kg CO2e) → store data (display units).
 *
 * All mismatch fixes live here — pages never know about the translation.
 */
import type {
  CommuteType,
  DietType,
  TravelFrequency,
  WorkLocation,
  CarbonProfileRequest,
  CarbonProfileResponse,
  CarbonBreakdown,
  InsightItem,
  InsightSeverity,
} from './types'
import type { CarbonData, Insight } from './store'

// ── Onboarding → API enums ────────────────────────────────────────────────────

const COMMUTE_MAP: Record<string, CommuteType> = {
  car: 'car',
  'car (gasoline)': 'car',
  'electric vehicle': 'electric_car',
  ev: 'electric_car',
  bus: 'bus',
  'public transit': 'bus',
  train: 'train',
  subway: 'subway',
  'bike/walk': 'bicycle',
  bicycle: 'bicycle',
  walking: 'walking',
  walk: 'walking',
  motorcycle: 'motorcycle',
  remote: 'work_from_home',
  'work from home': 'work_from_home',
  wfh: 'work_from_home',
  mixed: 'car', // default mixed to car for calculation
}

const DIET_MAP: Record<string, DietType> = {
  omnivore: 'mixed',
  'meat eater': 'meat_heavy',
  'meat heavy': 'meat_heavy',
  meatheavy: 'meat_heavy',
  mixed: 'mixed',
  vegetarian: 'vegetarian',
  vegan: 'vegan',
  pescatarian: 'pescatarian',
}

const TRAVEL_MAP: Record<string, TravelFrequency> = {
  rarely: 'rarely',
  never: 'never',
  'once/year': 'rarely',
  'once a year': 'rarely',
  '1-2 times/year': 'rarely',
  'few times/year': 'monthly',
  'few times a year': 'monthly',
  'monthly+': 'frequent',
  monthly: 'monthly',
  weekly: 'weekly',
  frequent: 'frequent',
}

const WORK_MAP: Record<string, WorkLocation> = {
  'fully remote': 'remote',
  remote: 'remote',
  hybrid: 'hybrid',
  'in-office': 'office',
  'in office': 'office',
  office: 'office',
  'self-employed': 'office', // default to office for self-employed
}

function normalize(value: string): string {
  return value.toLowerCase().trim()
}

export function mapCommuteToApi(value: string): CommuteType {
  return COMMUTE_MAP[normalize(value)] ?? 'car'
}

export function mapDietToApi(value: string): DietType {
  return DIET_MAP[normalize(value)] ?? 'mixed'
}

export function mapTravelToApi(value: string): TravelFrequency {
  return TRAVEL_MAP[normalize(value)] ?? 'rarely'
}

export function mapWorkToApi(value: string): WorkLocation {
  return WORK_MAP[normalize(value)] ?? 'office'
}

// ── Build a full CarbonProfileRequest from onboarding answers ─────────────────

export interface OnboardingAnswers {
  commute: string
  commute_km_per_day?: number | string
  diet: string
  travelFrequency: string
  workStyle: string
  home_size?: string
  renewable_energy?: boolean | string
  shopping_habit?: string
}

export function buildProfileRequest(answers: OnboardingAnswers): CarbonProfileRequest {
  return {
    // Values from new onboarding are already exact API enum strings
    commute:              (answers.commute ?? 'car')          as CarbonProfileRequest['commute'],
    commute_km_per_day:   Number(answers.commute_km_per_day ?? 15),
    food:                 (answers.diet ?? 'mixed')           as CarbonProfileRequest['food'],
    travel:               (answers.travelFrequency ?? 'rarely') as CarbonProfileRequest['travel'],
    work:                 (answers.workStyle ?? 'office')     as CarbonProfileRequest['work'],
    home_size:            (answers.home_size ?? 'apartment_medium'),
    shopping_habit:       (answers.shopping_habit ?? 'average'),
    renewable_energy:     answers.renewable_energy === true || answers.renewable_energy === 'true',
    num_people_household: 2,
  }
}

// ── Backend response → Store types ────────────────────────────────────────────

/** Convert backend kg CO2e → CarbonData (store format, display in tonnes) */
export function adaptProfileResponse(response: CarbonProfileResponse): CarbonData {
  const kgToTonnes = (kg: number) => kg / 1000

  const breakdown = response.breakdown as Partial<CarbonBreakdown>

  return {
    score: kgToTonnes(response.estimated_monthly_emissions),
    monthlyBudget: kgToTonnes(response.comparison.paris_target_monthly_kg),
    currentEmissions: kgToTonnes(response.estimated_monthly_emissions),
    potentialSavings: 0, // Populated after recommendations
    weeklyTrend: buildWeeklyTrend(response.estimated_monthly_emissions),
    sources: {
      transport: kgToTonnes(breakdown.transport ?? 0),
      food: kgToTonnes(breakdown.food ?? 0),
      shopping: kgToTonnes((breakdown.shopping ?? 0) + (breakdown.waste ?? 0)),
      energy: kgToTonnes((breakdown.energy ?? 0) + (breakdown.travel ?? 0)),
    },
  }
}

/** Synthesize a plausible weekly trend from a monthly total */
function buildWeeklyTrend(monthlyKg: number): Array<{ day: string; emissions: number }> {
  const dailyAvg = monthlyKg / 30.4
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  // Weekdays slightly higher, weekends lower
  const weights = [1.1, 1.0, 1.05, 1.0, 1.2, 0.5, 0.5]
  return days.map((day, i) => ({
    day,
    emissions: Number(((dailyAvg * weights[i]) / 1000).toFixed(3)), // tonnes
  }))
}

// ── Backend InsightItem → Store Insight ───────────────────────────────────────

const SEVERITY_TO_PRIORITY: Record<InsightSeverity, Insight['priority']> = {
  critical: 'high',
  warning: 'high',
  neutral: 'medium',
  positive: 'low',
}

export function adaptInsightItem(item: InsightItem, index: number): Insight {
  return {
    id: `insight-${index}`,
    title: `${item.category.charAt(0).toUpperCase() + item.category.slice(1)} Insight`,
    description: item.insight,
    impact: item.data_point ?? '',
    action: '',
    priority: SEVERITY_TO_PRIORITY[item.severity as InsightSeverity] ?? 'medium',
  }
}
