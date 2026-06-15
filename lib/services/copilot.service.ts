/**
 * Copilot Service — POST /api/copilot/chat
 * Wraps the Gemini-powered AI sustainability chat endpoint.
 */
import apiClient from '../api-client'
import type { CopilotRequest, CopilotResponse, CarbonProfileRequest } from '../types'

export async function sendCopilotMessage(
  message: string,
  profileContext?: Partial<CarbonProfileRequest>,
  signal?: AbortSignal
): Promise<CopilotResponse> {
  const body: CopilotRequest = {
    message: message.trim(),
    context: profileContext as Record<string, unknown> | undefined,
  }

  const { data } = await apiClient.post<CopilotResponse>('/api/copilot/chat', body, {
    ...(signal ? { signal } : {}),
  })

  return data
}
