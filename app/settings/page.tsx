'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { AppLayout } from '@/components/app-layout'
import { useAppStore } from '@/lib/store'
import {
  Moon,
  Sun,
  Download,
  Upload,
  Lock,
  Bell,
  RotateCcw,
  Check,
  X,
} from 'lucide-react'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export default function SettingsPage() {
  const { isDarkMode, toggleTheme, canExportData, clearChat, profile } =
    useAppStore()
  const [showExportSuccess, setShowExportSuccess] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const handleExport = () => {
    const data = canExportData()
    const element = document.createElement('a')
    element.setAttribute(
      'href',
      'data:text/plain;charset=utf-8,' + encodeURIComponent(data)
    )
    element.setAttribute('download', 'carbonwise-backup.json')
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)

    setShowExportSuccess(true)
    setTimeout(() => setShowExportSuccess(false), 3000)
  }

  const handleReset = () => {
    clearChat()
    setShowResetConfirm(false)
  }

  return (
    <AppLayout>
      <motion.div
        className="space-y-8 max-w-3xl"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Header */}
        <motion.div variants={item}>
          <h1 className="text-4xl font-bold mb-2">Settings</h1>
          <p className="text-foreground/60">
            Manage your preferences and account data
          </p>
        </motion.div>

        {/* Appearance */}
        <motion.div
          variants={item}
          className="glass p-6 rounded-xl border border-white/10"
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Sun className="w-6 h-6 text-accent" />
            Appearance
          </h2>

          <div className="space-y-6">
            {/* Theme Toggle */}
            <div className="flex items-center justify-between p-4 bg-card/30 rounded-lg">
              <div>
                <h3 className="font-semibold mb-1">Dark Mode</h3>
                <p className="text-sm text-foreground/60">
                  Toggle dark mode for better visibility
                </p>
              </div>
              <button
                onClick={toggleTheme}
                className={`relative inline-flex h-8 w-14 items-center rounded-full smooth-transition ${
                  isDarkMode ? 'bg-primary' : 'bg-card'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-background smooth-transition ${
                    isDarkMode ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
                <span className="absolute left-2 text-xs">
                  {isDarkMode ? (
                    <Moon className="w-4 h-4" />
                  ) : (
                    <Sun className="w-4 h-4" />
                  )}
                </span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Notifications */}
        <motion.div
          variants={item}
          className="glass p-6 rounded-xl border border-white/10"
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Bell className="w-6 h-6 text-accent" />
            Notifications
          </h2>

          <div className="space-y-4">
            {[
              {
                title: 'Daily Insights',
                description: 'Get daily sustainability tips',
              },
              {
                title: 'Challenge Updates',
                description: 'Notifications about challenge progress',
              },
              {
                title: 'Weekly Summary',
                description: 'Get a summary of your weekly emissions',
              },
              {
                title: 'Milestone Alerts',
                description: 'Celebrate when you reach goals',
              },
            ].map((notification) => (
              <div
                key={notification.title}
                className="flex items-center justify-between p-4 bg-card/30 rounded-lg"
              >
                <div>
                  <h3 className="font-semibold mb-1">{notification.title}</h3>
                  <p className="text-sm text-foreground/60">
                    {notification.description}
                  </p>
                </div>
                <button className="relative inline-flex h-8 w-14 items-center rounded-full smooth-transition bg-primary">
                  <span className="inline-block h-6 w-6 transform rounded-full bg-background translate-x-7" />
                </button>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Privacy */}
        <motion.div
          variants={item}
          className="glass p-6 rounded-xl border border-white/10"
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Lock className="w-6 h-6 text-accent" />
            Privacy & Data
          </h2>

          <div className="space-y-4">
            {/* Export Data */}
            <div className="p-4 bg-card/30 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold mb-1 flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Export Your Data
                  </h3>
                  <p className="text-sm text-foreground/60">
                    Download a backup of all your data in JSON format
                  </p>
                </div>
                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-primary/20 text-primary hover:bg-primary/30 rounded-lg font-medium smooth-transition flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>

              {showExportSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-primary/20 border border-primary/30 rounded-lg flex items-center gap-2 text-sm text-primary"
                >
                  <Check className="w-4 h-4" />
                  Data exported successfully!
                </motion.div>
              )}
            </div>

            {/* Import Data */}
            <div className="p-4 bg-card/30 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold mb-1 flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Import Data
                  </h3>
                  <p className="text-sm text-foreground/60">
                    Restore data from a previous export
                  </p>
                </div>
                <button className="px-4 py-2 bg-accent/20 text-accent hover:bg-accent/30 rounded-lg font-medium smooth-transition flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Import
                </button>
              </div>
            </div>

            {/* Privacy Policy */}
            <div className="p-4 bg-card/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold mb-1">Privacy Policy</h3>
                  <p className="text-sm text-foreground/60">
                    Read our privacy policy and terms
                  </p>
                </div>
                <button className="px-4 py-2 bg-card/50 hover:bg-card smooth-transition rounded-lg font-medium">
                  View
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Preferences */}
        <motion.div
          variants={item}
          className="glass p-6 rounded-xl border border-white/10"
        >
          <h2 className="text-2xl font-bold mb-6">Your Profile</h2>

          <div className="space-y-4">
            {[
              { label: 'Location', value: profile.location || 'Not set' },
              { label: 'Commute Method', value: profile.commute || 'Not set' },
              { label: 'Diet Preference', value: profile.diet || 'Not set' },
              { label: 'Travel Frequency', value: profile.travelFrequency || 'Not set' },
              { label: 'Work Style', value: profile.workStyle || 'Not set' },
            ].map((item) => (
              <div
                key={item.label}
                className="p-4 bg-card/30 rounded-lg flex items-center justify-between"
              >
                <div>
                  <p className="text-sm text-foreground/60">{item.label}</p>
                  <p className="font-semibold">{item.value}</p>
                </div>
                <button className="px-3 py-1 text-sm bg-accent/20 text-accent hover:bg-accent/30 rounded smooth-transition">
                  Update
                </button>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          variants={item}
          className="glass p-6 rounded-xl border-2 border-red-500/20 bg-red-500/5"
        >
          <h2 className="text-2xl font-bold mb-6 text-red-400">Danger Zone</h2>

          <div className="space-y-4">
            {/* Clear Chat */}
            <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold mb-1">Clear Chat History</h3>
                  <p className="text-sm text-foreground/60">
                    Delete all conversation history with the AI copilot
                  </p>
                </div>
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg font-medium smooth-transition"
                >
                  Clear
                </button>
              </div>

              {showResetConfirm && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-red-500/20 rounded-lg border border-red-500/30"
                >
                  <p className="font-semibold mb-4">
                    Are you sure? This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleReset}
                      className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 smooth-transition flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Yes, Delete
                    </button>
                    <button
                      onClick={() => setShowResetConfirm(false)}
                      className="flex-1 px-4 py-2 bg-card/50 text-foreground rounded-lg font-medium hover:bg-card smooth-transition flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Reset All */}
            <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold mb-1 flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" />
                    Reset All Data
                  </h3>
                  <p className="text-sm text-foreground/60">
                    Reset all settings and start fresh (cannot be undone)
                  </p>
                </div>
                <button className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg font-medium smooth-transition">
                  Reset
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          variants={item}
          className="border-t border-white/10 pt-8 pb-2"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-foreground/40">
            <div className="flex items-center gap-3">
              <span className="text-base">🌿</span>
              <div>
                <p className="font-semibold text-foreground/60 text-sm">CarbonWise AI</p>
                <p>Version 1.0.0 · Built with Next.js &amp; Gemini 2.5 Flash</p>
              </div>
            </div>
            <div className="text-center sm:text-right space-y-1">
              <p>© 2026 CarbonWise AI. All rights reserved.</p>
              <p>Emission data: DEFRA 2023 · IEA 2023 · ICAO 2023</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AppLayout>
  )
}
