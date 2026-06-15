/**
 * Recommendation Service — POST /api/recommendations
 * Fetches personalized sustainability recommendations.
 */
import apiClient from '../api-client'
import type {
  CarbonProfileRequest,
  RecommendationsRequest,
  RecommendationsResponse,
} from '../types'

export async function getRecommendations(
  profile: CarbonProfileRequest,
  options?: {
    maxRecommendations?: number
    focusAreas?: string[]
    signal?: AbortSignal
  }
): Promise<RecommendationsResponse> {
  const body: RecommendationsRequest = {
    profile,
    max_recommendations: options?.maxRecommendations ?? 8,
    focus_areas: options?.focusAreas,
  }

  const { data } = await apiClient.post<RecommendationsResponse>(
    '/api/recommendations',
    body,
    { signal: options?.signal }
  )

  return data
}
