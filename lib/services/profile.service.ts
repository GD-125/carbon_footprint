/**
 * Profile Service — POST /api/profile/analyze
 * Submits a carbon profile for full analysis.
 */
import apiClient from '../api-client'
import type { CarbonProfileRequest, CarbonProfileResponse } from '../types'

export async function analyzeProfile(
  profile: CarbonProfileRequest,
  signal?: AbortSignal
): Promise<CarbonProfileResponse> {
  const { data } = await apiClient.post<CarbonProfileResponse>(
    '/api/profile/analyze',
    profile,
    { signal }
  )
  return data
}
