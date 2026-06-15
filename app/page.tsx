'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Leaf,
  Zap,
  BarChart3,
  Brain,
  Users,
  TrendingDown,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

export default function Home() {
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null)

  const features = [
    {
      id: 'ai-copilot',
      name: 'AI Copilot',
      description: 'Get personalized guidance on reducing your carbon footprint',
      icon: Brain,
    },
    {
      id: 'budget',
      name: 'Carbon Budget',
      description: 'Track your monthly emissions against personalized targets',
      icon: BarChart3,
    },
    {
      id: 'insights',
      name: 'Smart Insights',
      description: 'Discover high-impact actions tailored to your lifestyle',
      icon: Zap,
    },
    {
      id: 'simulator',
      name: 'Scenario Simulator',
      description: 'Explore how different choices impact your footprint',
      icon: TrendingDown,
    },
  ]

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Sustainability Advocate',
      quote: 'CarbonWise made it easy to understand my impact and take action.',
      impact: 'Reduced emissions by 35% in 3 months',
    },
    {
      name: 'Marcus Johnson',
      role: 'Tech Professional',
      quote: 'The AI insights are game-changing. No guesswork anymore.',
      impact: 'Cut travel emissions by 40%',
    },
    {
      name: 'Aisha Patel',
      role: 'Environmental Officer',
      quote: 'We recommend this to all our employees. Highly effective.',
      impact: 'Team reduced footprint by 25%',
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="fixed top-0 w-full bg-background/50 backdrop-blur-md border-b border-white/10 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Leaf className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold">CarbonWise AI</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/onboarding"
              className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 smooth-transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <motion.section
        className="pt-32 pb-20 px-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <motion.h1
            className="text-6xl md:text-7xl font-bold mb-6 leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Reduce Your Carbon Footprint{' '}
            <span className="text-primary">Without Guesswork</span>
          </motion.h1>

          <motion.p
            className="text-xl text-foreground/70 mb-8 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Your AI Sustainability Copilot for everyday decisions. Track, predict,
            and reduce your environmental impact with intelligent guidance.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Link href="/onboarding">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg h-auto">
                Start Your Journey
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" className="px-8 py-6 text-lg h-auto">
                Explore Dashboard
              </Button>
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* Features Section */}
      <motion.section
        className="py-20 px-6 bg-gradient-to-b from-card/20 to-background"
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
      >
        <div className="max-w-6xl mx-auto">
          <motion.h2
            className="text-4xl font-bold text-center mb-16"
            variants={item}
          >
            Powerful Features for Every Step
          </motion.h2>

          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={feature.id}
                  className="glass p-8 rounded-xl border border-white/10 smooth-transition cursor-pointer"
                  variants={item}
                  onHoverStart={() => setHoveredFeature(feature.id)}
                  onHoverEnd={() => setHoveredFeature(null)}
                  whileHover={{ y: -5 }}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-primary/20">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">
                        {feature.name}
                      </h3>
                      <p className="text-foreground/70">{feature.description}</p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </motion.section>

      {/* Testimonials Section */}
      <motion.section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            className="text-4xl font-bold text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Trusted by Thousands
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                className="glass p-8 rounded-xl border border-white/10"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="flex items-center gap-2 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-yellow-400">
                      ★
                    </span>
                  ))}
                </div>
                <p className="text-foreground/80 mb-4">{testimonial.quote}</p>
                <div className="border-t border-white/10 pt-4">
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-sm text-foreground/60">{testimonial.role}</p>
                  <p className="text-sm text-primary mt-2">
                    {testimonial.impact}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section
        className="py-20 px-6 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Make a Difference?
          </h2>
          <p className="text-xl text-foreground/70 mb-8">
            Join thousands of users reducing their carbon footprint with AI
            guidance.
          </p>
          <Link href="/onboarding">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg h-auto">
              Start Now
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </motion.section>

      {/* ── Professional Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-white/10 bg-card/20 backdrop-blur-sm">
        {/* Main footer body */}
        <div className="max-w-6xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">

          {/* Brand + mission */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🌿</span>
              <span className="text-lg font-bold tracking-tight">CarbonWise AI</span>
            </div>
            <p className="text-sm text-foreground/50 leading-relaxed">
              AI-powered sustainability intelligence to help you understand,
              track, and reduce your personal carbon footprint.
            </p>
            <div className="flex items-center gap-2 text-xs text-foreground/40">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse inline-block" />
              Powered by Gemini 2.5 Flash
            </div>
          </div>

          {/* Product */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground/40">
              Product
            </h3>
            <ul className="space-y-2 text-sm text-foreground/60">
              {[
                { label: 'Dashboard',         href: '/dashboard'  },
                { label: 'AI Copilot',        href: '/copilot'    },
                { label: 'Scenario Simulator',href: '/simulator'  },
                { label: 'AI Insights',       href: '/insights'   },
                { label: 'Document Analyser', href: '/documents'  },
                { label: 'Challenges',        href: '/challenges' },
              ].map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="hover:text-primary smooth-transition">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Data Sources */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground/40">
              Data Sources
            </h3>
            <ul className="space-y-2 text-sm text-foreground/60">
              {[
                'DEFRA 2023 Emission Factors',
                'IEA 2023 Grid Intensity',
                'ICAO 2023 Aviation',
                'Oxford University Diet Study',
                'IPCC AR6 2022',
              ].map((src) => (
                <li key={src} className="flex items-start gap-1.5">
                  <span className="text-primary mt-0.5">·</span>
                  <span>{src}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal + Tech */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground/40">
              Legal
            </h3>
            <ul className="space-y-2 text-sm text-foreground/60">
              {[
                { label: 'Privacy Policy', href: '#' },
                { label: 'Terms of Service', href: '#' },
                { label: 'Cookie Policy', href: '#' },
                { label: 'Responsible AI', href: '#' },
              ].map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="hover:text-primary smooth-transition">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5">
          <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-foreground/40">
            <p>© 2026 CarbonWise AI. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <span>Built with Next.js · FastAPI · Gemini 2.5 Flash</span>
              <span className="hidden sm:block text-white/10">|</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                Carbon-neutral hosting
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
