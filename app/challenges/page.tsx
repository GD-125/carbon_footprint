'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { AppLayout } from '@/components/app-layout'
import { useAppStore } from '@/lib/store'
import { Trophy, Zap, Users } from 'lucide-react'

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

export default function ChallengesPage() {
  const { challenges, updateChallenge } = useAppStore()
  const [selectedChallenge, setSelectedChallenge] = useState<string | null>(null)

  const completedCount = challenges.filter((c) => c.completed).length

  const handleProgressUpdate = (id: string, increment: number) => {
    const challenge = challenges.find((c) => c.id === id)
    if (!challenge) return

    const newProgress = Math.min(
      challenge.target,
      challenge.progress + increment
    )
    const completed = newProgress >= challenge.target

    updateChallenge(id, {
      progress: newProgress,
      completed,
    })
  }

  const leaderboardData = [
    { rank: 1, name: 'Alex Chen', score: 2450, badges: 8 },
    { rank: 2, name: 'Jordan Smith', score: 2320, badges: 7 },
    { rank: 3, name: 'Sam Taylor', score: 2180, badges: 6 },
    { rank: 4, name: 'Casey Johnson', score: 2050, badges: 5 },
    { rank: 5, name: 'Morgan Lee', score: 1920, badges: 4 },
  ]

  return (
    <AppLayout>
      <motion.div
        className="space-y-8"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Header */}
        <motion.div variants={item}>
          <h1 className="text-4xl font-bold mb-2">Community Challenges</h1>
          <p className="text-foreground/60">
            Join challenges and compete with others to reduce your carbon footprint
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          variants={container}
          className="grid md:grid-cols-3 gap-6"
        >
          <motion.div
            variants={item}
            className="glass p-6 rounded-xl border border-white/10"
          >
            <div className="flex items-center gap-3 mb-4">
              <Trophy className="w-6 h-6 text-accent" />
              <h3 className="font-semibold">Completed Challenges</h3>
            </div>
            <p className="text-3xl font-bold mb-2">{completedCount}</p>
            <p className="text-sm text-foreground/60">
              Out of {challenges.length} total
            </p>
          </motion.div>

          <motion.div
            variants={item}
            className="glass p-6 rounded-xl border border-white/10"
          >
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-6 h-6 text-primary" />
              <h3 className="font-semibold">Points Earned</h3>
            </div>
            <p className="text-3xl font-bold mb-2">2,150</p>
            <p className="text-sm text-foreground/60">Towards your rank</p>
          </motion.div>

          <motion.div
            variants={item}
            className="glass p-6 rounded-xl border border-white/10"
          >
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-accent" />
              <h3 className="font-semibold">Your Rank</h3>
            </div>
            <p className="text-3xl font-bold mb-2">#47</p>
            <p className="text-sm text-foreground/60">Out of 5,234 users</p>
          </motion.div>
        </motion.div>

        {/* Active Challenges */}
        <motion.div variants={item}>
          <h2 className="text-2xl font-bold mb-4">Active Challenges</h2>
          <div className="space-y-4">
            {challenges.map((challenge, index) => {
              const progressPercent = (challenge.progress / challenge.target) * 100
              const isExpanded = selectedChallenge === challenge.id

              return (
                <motion.div
                  key={challenge.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() =>
                    setSelectedChallenge(
                      isExpanded ? null : challenge.id
                    )
                  }
                  className={`glass p-6 rounded-xl border smooth-transition cursor-pointer ${
                    challenge.completed
                      ? 'border-primary/30 bg-primary/10'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-bold">
                          {challenge.name}
                        </h3>
                        {challenge.completed && (
                          <span className="text-lg">{challenge.badge}</span>
                        )}
                      </div>
                      <p className="text-foreground/60">
                        {challenge.description}
                      </p>
                    </div>
                    {challenge.completed && (
                      <div className="text-right ml-4">
                        <p className="text-sm font-semibold text-primary">
                          Completed
                        </p>
                        <p className="text-lg">✓</p>
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-foreground/60">
                        Progress
                      </span>
                      <span className="text-sm font-semibold">
                        {challenge.progress} / {challenge.target}
                      </span>
                    </div>
                    <div className="w-full bg-card rounded-full h-3 overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-primary to-accent"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                      />
                    </div>
                  </div>

                  {/* Expandable Details */}
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="pt-4 border-t border-white/10"
                    >
                      <p className="text-sm text-foreground/70 mb-4">
                        {challenge.progress}/{challenge.target} days completed
                      </p>

                      {!challenge.completed && (
                        <div className="space-y-3">
                          <p className="text-sm font-semibold">Add progress:</p>
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleProgressUpdate(challenge.id, 1)
                              }}
                              className="flex-1 px-3 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 smooth-transition font-medium"
                            >
                              +1 day
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleProgressUpdate(challenge.id, 5)
                              }}
                              className="flex-1 px-3 py-2 rounded-lg bg-accent/20 text-accent hover:bg-accent/30 smooth-transition font-medium"
                            >
                              +5 days
                            </button>
                          </div>
                        </div>
                      )}

                      {challenge.completed && (
                        <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                          <p className="font-semibold text-primary flex items-center gap-2">
                            <span>🎉</span> Challenge Complete!
                          </p>
                          <p className="text-sm text-foreground/70 mt-2">
                            You&apos;ve earned 500 points and a badge!
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Leaderboard */}
        <motion.div variants={item}>
          <h2 className="text-2xl font-bold mb-4">Global Leaderboard</h2>
          <div className="glass rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-card/50">
                  <th className="text-left p-4 text-foreground/60 font-semibold">
                    Rank
                  </th>
                  <th className="text-left p-4 text-foreground/60 font-semibold">
                    User
                  </th>
                  <th className="text-left p-4 text-foreground/60 font-semibold">
                    Points
                  </th>
                  <th className="text-left p-4 text-foreground/60 font-semibold">
                    Badges
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaderboardData.map((user, index) => (
                  <motion.tr
                    key={user.rank}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-white/10 hover:bg-card/30 smooth-transition"
                  >
                    <td className="p-4 font-semibold">
                      {user.rank === 1 && '🥇'}
                      {user.rank === 2 && '🥈'}
                      {user.rank === 3 && '🥉'}
                      {user.rank > 3 && user.rank}
                    </td>
                    <td className="p-4 font-medium">{user.name}</td>
                    <td className="p-4 text-primary font-semibold">
                      {user.score.toLocaleString()}
                    </td>
                    <td className="p-4">
                      {[...Array(user.badges)].map((_, i) => (
                        <span key={i} className="text-lg mr-1">
                          ⭐
                        </span>
                      ))}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Tips */}
        <motion.div
          variants={item}
          className="glass p-6 rounded-xl border border-white/10"
        >
          <h3 className="text-lg font-bold mb-4">💡 Challenge Tips</h3>
          <ul className="space-y-3 text-sm text-foreground/70">
            <li className="flex gap-3">
              <span>✓</span>
              <span>
                Complete challenges progressively - consistency beats rushing
              </span>
            </li>
            <li className="flex gap-3">
              <span>✓</span>
              <span>Share your progress with friends for extra motivation</span>
            </li>
            <li className="flex gap-3">
              <span>✓</span>
              <span>
                Each completed challenge earns badges and points for rankings
              </span>
            </li>
            <li className="flex gap-3">
              <span>✓</span>
              <span>
                New challenges unlock as you progress through the app
              </span>
            </li>
          </ul>
        </motion.div>
      </motion.div>
    </AppLayout>
  )
}
