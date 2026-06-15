'use client'

/**
 * BackendStatus — Shows a non-intrusive indicator when backend is unreachable.
 * Mounts once on app layout and polls every 30s.
 */
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, Wifi } from 'lucide-react'
import { isBackendHealthy } from '@/lib/services/health.service'

export function BackendStatus() {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking')

  const check = async () => {
    const healthy = await isBackendHealthy()
    setStatus(healthy ? 'online' : 'offline')
  }

  useEffect(() => {
    check()
    const interval = setInterval(check, 30_000)
    return () => clearInterval(interval)
  }, []) // eslint-disable-line

  return (
    <AnimatePresence>
      {status === 'offline' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/90 text-white text-sm font-medium shadow-lg"
        >
          <WifiOff className="w-4 h-4" />
          Backend offline — using cached data
          <button
            onClick={check}
            className="ml-2 text-xs underline opacity-80 hover:opacity-100"
          >
            Retry
          </button>
        </motion.div>
      )}
      {status === 'online' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed bottom-4 right-4 flex items-center gap-1.5 text-xs text-green-400/60"
        >
          <Wifi className="w-3 h-3" />
          API connected
        </motion.div>
      )}
    </AnimatePresence>
  )
}
