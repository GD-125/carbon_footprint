/**
 * Insight Service — POST /api/insights
 * Fetches AI-generated sustainability insights for a carbon profile.
 */
import apiClient from '../api-client'
import type { CarbonProfileRequest, InsightsRequest, InsightsResponse } from '../types'

export async function getInsights(
  profile: CarbonProfileRequest,
  signal?: AbortSignal
): Promise<InsightsResponse> {
  const body: InsightsRequest = { profile }

  const { data } = await apiClient.post<InsightsResponse>('/api/insights', body, { signal })
  return data
}
