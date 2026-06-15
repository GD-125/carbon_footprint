/**
 * Health Service — GET /health
 * Checks backend health status.
 */
import apiClient from '../api-client'
import type { HealthResponse } from '../types'

export async function checkHealth(): Promise<HealthResponse> {
  const { data } = await apiClient.get<HealthResponse>('/health')
  return data
}

export async function isBackendHealthy(): Promise<boolean> {
  try {
    const health = await checkHealth()
    return health.status === 'healthy' || health.status === 'degraded'
  } catch {
    return false
  }
}
