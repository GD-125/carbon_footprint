/**
 * Axios HTTP Client — Production-grade with retry, typed errors, and AbortController.
 *
 * URL Strategy:
 * - In development:  Next.js rewrites /api/* → http://localhost:8000/api/*
 * - On Vercel:       Next.js rewrites /api/* → <NEXT_PUBLIC_API_URL>/api/*
 * - Both cases use relative "/" as base URL — no CORS issues ever.
 */
import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios'
import type { ApiError } from './types'

const TIMEOUT    = Number(process.env.NEXT_PUBLIC_API_TIMEOUT ?? 60_000)
const MAX_RETRIES = 2

// ── Custom error class ────────────────────────────────────────────────────────

export class CarbonApiError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly details?: Record<string, unknown>

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'CarbonApiError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }

  get isNetworkError()    { return this.statusCode === 0 }
  get isRateLimited()     { return this.statusCode === 429 }
  get isValidationError() { return this.statusCode === 422 }
  get isServerError()     { return this.statusCode >= 500 }
}

// ── Retry helpers ─────────────────────────────────────────────────────────────

function shouldRetry(error: AxiosError, count: number): boolean {
  if (count >= MAX_RETRIES) return false
  if (!error.response) return true               // network error
  return error.response.status >= 500 && error.response.status !== 501
}

const retryDelay = (count: number) => Math.pow(2, count) * 500  // 500ms, 1000ms

// ── Axios instance ────────────────────────────────────────────────────────────
// Use relative "/" so Next.js rewrites handle the proxy transparently.

const apiClient: AxiosInstance = axios.create({
  baseURL: '/',
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// ── Request interceptor — attach retry counter ────────────────────────────────

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const cfg = config as AxiosRequestConfig & { _retryCount?: number }
    cfg._retryCount ??= 0
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor — retry + typed errors ───────────────────────────────

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const config = error.config as (AxiosRequestConfig & { _retryCount: number }) | undefined

    if (config && shouldRetry(error, config._retryCount ?? 0)) {
      config._retryCount = (config._retryCount ?? 0) + 1
      await new Promise((r) => setTimeout(r, retryDelay(config._retryCount - 1)))
      return apiClient(config)
    }

    if (error.response) {
      const apiErr = error.response.data?.error
      throw new CarbonApiError(
        error.response.status,
        apiErr?.code    ?? 'API_ERROR',
        apiErr?.message ?? `Request failed with status ${error.response.status}`,
        apiErr?.details
      )
    }

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      throw new CarbonApiError(0, 'TIMEOUT', 'Request timed out. Please try again.')
    }

    throw new CarbonApiError(
      0,
      'NETWORK_ERROR',
      'Cannot reach the server. Check your connection or backend status.'
    )
  }
)

export default apiClient
