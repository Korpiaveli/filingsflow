'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Star, Activity, TrendingUp, Bell, ArrowRight, CheckCircle } from 'lucide-react'

interface OnboardingModalProps {
  isNewUser: boolean
  userName: string
}

const steps = [
  {
    id: 'welcome',
    icon: TrendingUp,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    title: 'Welcome to FilingsFlow',
    description: 'Your edge in the market starts here. We track insider transactions, institutional holdings, and congressional trades so you never miss a signal.',
  },
  {
    id: 'watchlist',
    icon: Star,
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-600 dark:text-amber-400',
    title: 'Build Your Watchlist',
    description: 'Add tickers you care about to get personalized signals. We\'ll highlight activity that matters to you.',
    action: {
      label: 'Add your first ticker',
      href: '/discover?tab=search',
    },
  },
  {
    id: 'activity',
    icon: Activity,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-600 dark:text-blue-400',
    title: 'Track Activity',
    description: 'See real-time insider buys and sells, 13F holdings changes, and congressional trades all in one unified feed.',
  },
  {
    id: 'signals',
    icon: Bell,
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    title: 'Get Smart Signals',
    description: 'We detect clusters (multiple insiders trading together), unusual transaction sizes, and first-time buys. Look for these badges to spot opportunities.',
    badges: ['Cluster', 'First Buy', '$1M+', 'C-Suite'],
  },
]

export function OnboardingModal({ isNewUser, userName }: OnboardingModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(true)

  useEffect(() => {
    const seen = localStorage.getItem('filingsflow_onboarding_seen')
    if (!seen && isNewUser) {
      setHasSeenOnboarding(false)
      setIsOpen(true)
    }
  }, [isNewUser])

  const handleClose = () => {
    setIsOpen(false)
    localStorage.setItem('filingsflow_onboarding_seen', 'true')
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleClose()
    }
  }

  const handleSkip = () => {
    handleClose()
  }

  if (hasSeenOnboarding) return null

  const step = steps[currentStep]!
  const Icon = step.icon
  const isLastStep = currentStep === steps.length - 1

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && handleSkip()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-card border-2 border-border rounded-2xl shadow-2xl overflow-hidden"
          >
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className={`w-16 h-16 rounded-2xl ${step.iconBg} flex items-center justify-center mb-6`}>
                    <Icon className={`w-8 h-8 ${step.iconColor}`} />
                  </div>

                  {currentStep === 0 && (
                    <p className="text-sm text-muted-foreground mb-2">Hi {userName}!</p>
                  )}

                  <h2 className="text-2xl font-bold text-foreground mb-3">{step.title}</h2>
                  <p className="text-muted-foreground leading-relaxed mb-6">{step.description}</p>

                  {step.badges && (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {step.badges.map((badge) => (
                        <span
                          key={badge}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full text-sm font-medium"
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-primary" />
                          {badge}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex gap-1.5">
                  {steps.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentStep(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentStep
                          ? 'bg-primary w-6'
                          : index < currentStep
                            ? 'bg-primary/50'
                            : 'bg-muted-foreground/30'
                      }`}
                    />
                  ))}
                </div>

                <div className="flex gap-3">
                  {!isLastStep && (
                    <button
                      onClick={handleSkip}
                      className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Skip
                    </button>
                  )}
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
                  >
                    {isLastStep ? 'Get Started' : 'Next'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
