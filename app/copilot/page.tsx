'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AppLayout } from '@/components/app-layout'
import {
  useAppStore,
  selectMessages,
  selectIsCopilotLoading,
  selectCopilotError,
} from '@/lib/store'
import { Send, Leaf, Copy, Check, AlertCircle, RefreshCw } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const suggestedPrompts = [
  'How can I reduce my footprint?',
  'Compare train vs flight.',
  'What is the impact of eating beef?',
  'How much can I save by working remotely?',
  'Best ways to reduce energy consumption?',
  'How does my impact compare to others?',
]

export default function CopilotPage() {
  const messages = useAppStore(selectMessages)
  const isLoading = useAppStore(selectIsCopilotLoading)
  const copilotError = useAppStore(selectCopilotError)
  const sendMessage = useAppStore((s) => s.sendCopilotMessage)
  const clearChat = useAppStore((s) => s.clearChat)

  const [input, setInput] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Abort on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const handleSendMessage = useCallback(
    async (text: string = input) => {
      const trimmed = text.trim()
      if (!trimmed || isLoading) return

      // Cancel previous request
      abortRef.current?.abort()
      abortRef.current = new AbortController()

      setInput('')
      await sendMessage(trimmed, abortRef.current.signal)
    },
    [input, isLoading, sendMessage]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleCopyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <AppLayout>
      <div className="h-full flex flex-col max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          className="mb-6 flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Leaf className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold">Your AI Sustainability Copilot</h1>
            </div>
            <p className="text-foreground/60">
              Powered by Gemini 2.5 Flash · Ask me anything about your carbon footprint
            </p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-foreground/60 hover:text-foreground border border-white/10 rounded-lg smooth-transition"
            >
              <RefreshCw className="w-3 h-3" />
              Clear
            </button>
          )}
        </motion.div>

        {/* Error banner */}
        {copilotError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {copilotError}
          </motion.div>
        )}

        {/* Chat Area */}
        <div className="flex-1 flex flex-col gap-4 mb-6 overflow-y-auto">
          {messages.length === 0 ? (
            <motion.div
              className="flex-1 flex flex-col items-center justify-center gap-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                  <Leaf className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Welcome to CarbonWise AI</h2>
                <p className="text-foreground/60 mb-8">
                  Ask me questions about reducing your carbon footprint
                </p>
              </div>

              <div className="w-full">
                <p className="text-sm text-foreground/60 mb-3">Try asking about:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {suggestedPrompts.map((prompt) => (
                    <motion.button
                      key={prompt}
                      onClick={() => handleSendMessage(prompt)}
                      className="p-3 glass rounded-lg border border-white/10 text-left hover:bg-card/80 smooth-transition text-sm"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {prompt}
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <>
              <AnimatePresence initial={false}>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-2xl rounded-xl p-4 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : message.isError
                            ? 'glass border border-red-500/30 bg-red-500/5'
                            : 'glass border border-white/10'
                      }`}
                    >
                      {/* Message content — render markdown for AI, plain text for user */}
                      {message.role === 'user' ? (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {message.content}
                        </p>
                      ) : (
                        <div className="chat-prose">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      )}

                      {/* Sources */}
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <p className="text-xs text-foreground/50 mb-1">Sources</p>
                          <div className="flex flex-wrap gap-1">
                            {message.sources.map((src) => (
                              <span
                                key={src}
                                className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded"
                              >
                                {src}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Follow-up suggestions */}
                      {message.suggestions && message.suggestions.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <p className="text-xs text-foreground/50 mb-2">Follow-up</p>
                          <div className="flex flex-col gap-1">
                            {message.suggestions.map((s) => (
                              <button
                                key={s}
                                onClick={() => handleSendMessage(s)}
                                className="text-xs text-left text-primary/80 hover:text-primary smooth-transition"
                              >
                                → {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Copy button */}
                      {message.role === 'assistant' && !message.isError && (
                        <button
                          onClick={() => handleCopyMessage(message.id, message.content)}
                          className="mt-3 text-xs opacity-50 hover:opacity-100 flex items-center gap-1 smooth-transition"
                        >
                          {copiedId === message.id ? (
                            <>
                              <Check className="w-3 h-3" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copy
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* AI typing indicator */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="glass border border-white/10 rounded-xl p-4">
                    <div className="flex gap-2 items-center">
                      <Leaf className="w-3 h-3 text-primary animate-pulse" />
                      <div className="flex gap-1.5">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="w-2 h-2 rounded-full bg-primary"
                            animate={{ y: [0, -6, 0] }}
                            transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-foreground/40">Gemini is thinking…</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <motion.div
          className="glass p-4 rounded-xl border border-white/10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me about your carbon footprint…"
              className="flex-1 bg-transparent text-foreground placeholder-foreground/40 outline-none text-sm"
              disabled={isLoading}
              maxLength={2000}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!input.trim() || isLoading}
              className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 smooth-transition"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          {input.length > 1800 && (
            <p className="text-xs text-foreground/40 mt-1 text-right">{input.length}/2000</p>
          )}
        </motion.div>
      </div>
    </AppLayout>
  )
}
