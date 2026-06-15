'use client'

import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AppLayout } from '@/components/app-layout'
import { Upload, FileText, Leaf, AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react'
import {
  analyzeDocument,
  validateDocumentFile,
  ALLOWED_DOCUMENT_TYPES,
  MAX_DOCUMENT_SIZE_MB,
} from '@/lib/services/document.service'
import { CarbonApiError } from '@/lib/api-client'
import type { DocumentAnalysisResponse } from '@/lib/types'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
}
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

export default function DocumentsPage() {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [result, setResult] = useState<DocumentAnalysisResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const handleFile = useCallback((file: File) => {
    const validationError = validateDocumentFile(file)
    if (validationError) {
      setError(validationError)
      return
    }
    setSelectedFile(file)
    setResult(null)
    setError(null)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleAnalyze = async () => {
    if (!selectedFile) return

    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setIsAnalyzing(true)
    setError(null)
    setUploadProgress(0)

    try {
      const data = await analyzeDocument(
        selectedFile,
        (progress) => {
          if (progress.total) {
            setUploadProgress(Math.round((progress.loaded / progress.total) * 100))
          }
        },
        abortRef.current.signal
      )
      setResult(data)
    } catch (err) {
      if (abortRef.current?.signal.aborted) return
      setError(err instanceof CarbonApiError ? err.message : 'Analysis failed. Please try again.')
    } finally {
      setIsAnalyzing(false)
      setUploadProgress(0)
    }
  }

  const handleReset = () => {
    abortRef.current?.abort()
    setSelectedFile(null)
    setResult(null)
    setError(null)
    setUploadProgress(0)
  }

  const getDocTypeLabel = (type: string) =>
    type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())

  return (
    <AppLayout>
      <motion.div className="space-y-8 max-w-3xl mx-auto" variants={container} initial="hidden" animate="show">
        {/* Header */}
        <motion.div variants={item}>
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold">Document Analyzer</h1>
          </div>
          <p className="text-foreground/60">
            Upload receipts, utility bills, or flight tickets to estimate their carbon impact
          </p>
        </motion.div>

        {/* Upload Zone */}
        {!result && (
          <motion.div variants={item}>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer smooth-transition ${
                isDragging
                  ? 'border-primary bg-primary/10'
                  : selectedFile
                    ? 'border-green-500/40 bg-green-500/5'
                    : 'border-white/20 hover:border-white/30 hover:bg-white/5'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={ALLOWED_DOCUMENT_TYPES.join(',')}
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              {selectedFile ? (
                <div>
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-semibold mb-1">{selectedFile.name}</p>
                  <p className="text-sm text-foreground/50">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB · {selectedFile.type}
                  </p>
                </div>
              ) : (
                <div>
                  <Upload className="w-12 h-12 text-foreground/30 mx-auto mb-4" />
                  <p className="text-lg font-semibold mb-2">Drop your document here</p>
                  <p className="text-sm text-foreground/50 mb-1">
                    Supports PDF, JPEG, PNG, WebP, GIF
                  </p>
                  <p className="text-xs text-foreground/30">
                    Max {MAX_DOCUMENT_SIZE_MB}MB · Receipts, utility bills, flight tickets
                  </p>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </motion.div>
            )}

            {/* Actions */}
            {selectedFile && (
              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="flex-1 py-3 px-6 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 smooth-transition flex items-center justify-center gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {uploadProgress > 0 ? `Uploading ${uploadProgress}%…` : 'Analyzing with AI…'}
                    </>
                  ) : (
                    <>
                      <Leaf className="w-4 h-4" />
                      Analyze Carbon Impact
                    </>
                  )}
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-3 glass border border-white/10 rounded-lg text-foreground/60 hover:text-foreground smooth-transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Document Type */}
              <div className="glass p-6 rounded-xl border border-primary/20 bg-primary/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <h3 className="font-semibold text-green-400">Analysis Complete</h3>
                  </div>
                  <button
                    onClick={handleReset}
                    className="text-xs text-foreground/50 hover:text-foreground smooth-transition"
                  >
                    Analyze another
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <FileText className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-sm text-foreground/60">Document Type</p>
                    <p className="text-xl font-bold">{getDocTypeLabel(result.document_type)}</p>
                    {result.extracted_data.vendor && (
                      <p className="text-sm text-foreground/60">{result.extracted_data.vendor}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Emissions */}
              <div className="glass p-6 rounded-xl border border-white/10">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Leaf className="w-5 h-5 text-primary" />
                  Carbon Impact
                </h3>
                <div className="text-5xl font-bold text-primary mb-2">
                  {result.estimated_emissions.total_kg_co2.toFixed(1)}
                </div>
                <p className="text-foreground/60 mb-4">kg CO₂ estimated</p>
                <p className="text-sm text-foreground/50">{result.estimated_emissions.methodology}</p>

                {/* Breakdown */}
                {Object.keys(result.estimated_emissions.breakdown).length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-foreground/60 mb-2">Breakdown</p>
                    {Object.entries(result.estimated_emissions.breakdown).map(([k, v]) => (
                      <div key={k} className="flex justify-between items-center p-2 bg-card/30 rounded">
                        <span className="text-sm capitalize">{k.replace('_', ' ')}</span>
                        <span className="font-semibold text-primary">{v.toFixed(2)} kg CO₂</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Notes */}
                {result.estimated_emissions.notes.length > 0 && (
                  <div className="mt-4 text-xs text-foreground/40 space-y-1">
                    {result.estimated_emissions.notes.map((note, i) => (
                      <p key={i}>· {note}</p>
                    ))}
                  </div>
                )}
              </div>

              {/* Extracted Data */}
              <div className="glass p-6 rounded-xl border border-white/10">
                <h3 className="text-lg font-semibold mb-4">Extracted Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {result.extracted_data.date && (
                    <div className="p-3 bg-card/30 rounded-lg">
                      <p className="text-xs text-foreground/50 mb-1">Date</p>
                      <p className="font-medium">{result.extracted_data.date}</p>
                    </div>
                  )}
                  {result.extracted_data.total_amount != null && (
                    <div className="p-3 bg-card/30 rounded-lg">
                      <p className="text-xs text-foreground/50 mb-1">Total Amount</p>
                      <p className="font-medium">
                        {result.extracted_data.total_amount} {result.extracted_data.currency ?? ''}
                      </p>
                    </div>
                  )}
                  <div className="p-3 bg-card/30 rounded-lg">
                    <p className="text-xs text-foreground/50 mb-1">Confidence</p>
                    <p className="font-medium">
                      {(result.extracted_data.confidence_score * 100).toFixed(0)}%
                    </p>
                  </div>
                  {result.processing_time_ms && (
                    <div className="p-3 bg-card/30 rounded-lg">
                      <p className="text-xs text-foreground/50 mb-1">Processing Time</p>
                      <p className="font-medium">{result.processing_time_ms}ms</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Warnings */}
              {result.warnings.length > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    {result.warnings.map((w, i) => <p key={i}>{w}</p>)}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* How it works */}
        {!result && !selectedFile && (
          <motion.div variants={item} className="glass p-6 rounded-xl border border-white/10">
            <h3 className="text-lg font-semibold mb-4">How it works</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { icon: '📤', title: 'Upload', desc: 'Drop a receipt, bill, or ticket' },
                { icon: '🤖', title: 'AI Analysis', desc: 'Gemini Vision extracts key data' },
                { icon: '🌿', title: 'Carbon Estimate', desc: 'Get a CO₂ impact estimate' },
              ].map((step) => (
                <div key={step.title} className="p-4 bg-card/30 rounded-lg text-center">
                  <p className="text-2xl mb-2">{step.icon}</p>
                  <p className="font-semibold mb-1">{step.title}</p>
                  <p className="text-sm text-foreground/60">{step.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </AppLayout>
  )
}
