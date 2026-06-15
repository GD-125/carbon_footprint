/**
 * Document Service — POST /api/document/analyze
 * Uploads a document for OCR and carbon impact analysis.
 */
import apiClient from '../api-client'
import type { DocumentAnalysisResponse } from '../types'

export async function analyzeDocument(
  file: File,
  onUploadProgress?: (progressEvent: { loaded: number; total?: number }) => void,
  signal?: AbortSignal
): Promise<DocumentAnalysisResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const { data } = await apiClient.post<DocumentAnalysisResponse>(
    '/api/document/analyze',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
      signal,
      // Document analysis can take longer — extend timeout
      timeout: 120_000,
    }
  )

  return data
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]

export const MAX_DOCUMENT_SIZE_MB = 10

export function validateDocumentFile(file: File): string | null {
  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
    return `File type not supported. Allowed: PDF, JPEG, PNG, WebP, GIF`
  }
  if (file.size > MAX_DOCUMENT_SIZE_MB * 1024 * 1024) {
    return `File too large. Maximum size: ${MAX_DOCUMENT_SIZE_MB}MB`
  }
  return null
}
