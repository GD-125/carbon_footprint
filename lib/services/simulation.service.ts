/**
 * Simulation Service — POST /api/simulate
 * Runs a scenario simulation for a given lifestyle change.
 */
import apiClient from '../api-client'
import type {
  CarbonProfileRequest,
  ScenarioType,
  SimulationRequest,
  SimulationResult,
} from '../types'

export async function runSimulation(
  profile: CarbonProfileRequest,
  scenario: ScenarioType,
  customParams?: Record<string, unknown>,
  signal?: AbortSignal
): Promise<SimulationResult> {
  const body: SimulationRequest = {
    profile,
    scenario,
    custom_params: customParams,
  }

  const { data } = await apiClient.post<SimulationResult>('/api/simulate', body, { signal })
  return data
}

/** Run multiple scenarios in parallel and return an array of results */
export async function runMultipleSimulations(
  profile: CarbonProfileRequest,
  scenarios: ScenarioType[],
  signal?: AbortSignal
): Promise<SimulationResult[]> {
  const results = await Promise.allSettled(
    scenarios.map((scenario) => runSimulation(profile, scenario, undefined, signal))
  )

  return results
    .filter((r): r is PromiseFulfilledResult<SimulationResult> => r.status === 'fulfilled')
    .map((r) => r.value)
}
