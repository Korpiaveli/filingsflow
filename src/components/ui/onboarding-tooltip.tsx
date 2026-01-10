'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const STORAGE_KEY = 'filingsflow_onboarding'

interface OnboardingState {
  [key: string]: boolean
}

function getOnboardingState(): OnboardingState {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function setOnboardingSeen(id: string) {
  if (typeof window === 'undefined') return
  const state = getOnboardingState()
  state[id] = true
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function hasSeenOnboarding(id: string): boolean {
  return getOnboardingState()[id] === true
}

interface OnboardingTooltipProps {
  id: string
  title: string
  description: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
  children: React.ReactNode
  delay?: number
  showOnce?: boolean
  forceShow?: boolean
}

export function OnboardingTooltip({
  id,
  title,
  description,
  position = 'bottom',
  action,
  children,
  delay = 500,
  showOnce = true,
  forceShow = false,
}: OnboardingTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setHasMounted(true)
    const timer = setTimeout(() => {
      if (forceShow || !hasSeenOnboarding(id)) {
        setIsVisible(true)
      }
    }, delay)
    return () => clearTimeout(timer)
  }, [id, delay, forceShow])

  const handleDismiss = () => {
    setIsVisible(false)
    if (showOnce) {
      setOnboardingSeen(id)
    }
  }

  const handleAction = () => {
    if (action?.onClick) action.onClick()
    handleDismiss()
  }

  const positionClasses = {
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2',
  }

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-primary border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-primary border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-primary border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-primary border-y-transparent border-l-transparent',
  }

  if (!hasMounted) {
    return <>{children}</>
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: position === 'top' ? 5 : position === 'bottom' ? -5 : 0 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={cn(
              'absolute z-50 w-72 bg-primary text-primary-foreground rounded-xl shadow-xl p-4',
              positionClasses[position]
            )}
          >
            <div className={cn('absolute w-0 h-0 border-8', arrowClasses[position])} />

            <button
              onClick={handleDismiss}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-primary-foreground/10 transition-colors"
              aria-label="Close tooltip"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-foreground/20 flex items-center justify-center shrink-0">
                <Lightbulb className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm mb-1">{title}</h4>
                <p className="text-xs text-primary-foreground/80 leading-relaxed">{description}</p>
              </div>
            </div>

            {action && (
              <div className="mt-3 flex justify-end">
                {action.href ? (
                  <a
                    href={action.href}
                    onClick={handleDismiss}
                    className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
                  >
                    {action.label}
                    <ChevronRight className="w-3 h-3" />
                  </a>
                ) : (
                  <button
                    onClick={handleAction}
                    className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
                  >
                    {action.label}
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface FeatureSpotlightProps {
  id: string
  title: string
  description: string
  step?: number
  totalSteps?: number
  onNext?: () => void
  onSkip?: () => void
  children: React.ReactNode
}

export function FeatureSpotlight({
  id,
  title,
  description,
  step,
  totalSteps,
  onNext,
  onSkip,
  children,
}: FeatureSpotlightProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!hasSeenOnboarding(id)) {
      setIsVisible(true)
    }
  }, [id])

  const handleNext = () => {
    setIsVisible(false)
    setOnboardingSeen(id)
    onNext?.()
  }

  const handleSkip = () => {
    setIsVisible(false)
    setOnboardingSeen(id)
    onSkip?.()
  }

  return (
    <div className="relative">
      {children}
      <AnimatePresence>
        {isVisible && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={handleSkip}
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 ring-4 ring-primary ring-offset-2 ring-offset-background rounded-xl pointer-events-none"
            />
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full left-1/2 -translate-x-1/2 mt-4 z-50 w-80 bg-card border rounded-xl shadow-xl p-4"
            >
              {step && totalSteps && (
                <div className="flex items-center gap-1.5 mb-2">
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        i + 1 === step ? 'bg-primary' : 'bg-muted'
                      )}
                    />
                  ))}
                </div>
              )}

              <h4 className="font-semibold text-foreground text-sm mb-1">{title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">{description}</p>

              <div className="flex items-center justify-between">
                <button
                  onClick={handleSkip}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Skip tour
                </button>
                <button
                  onClick={handleNext}
                  className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90"
                >
                  {step === totalSteps ? 'Done' : 'Next'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

interface FeatureUnlockProps {
  feature: string
  title: string
  description: string
  isUnlocked: boolean
  onDismiss: () => void
}

export function FeatureUnlock({
  feature,
  title,
  description,
  isUnlocked,
  onDismiss,
}: FeatureUnlockProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (isUnlocked && !hasSeenOnboarding(`unlock_${feature}`)) {
      setShow(true)
      setOnboardingSeen(`unlock_${feature}`)
    }
  }, [isUnlocked, feature])

  if (!show) return null

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm bg-gradient-to-r from-amber-500/10 to-primary/10 border border-amber-500/20 rounded-xl shadow-xl overflow-hidden"
        >
          <div className="p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
              <span className="text-xl">🎉</span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground text-sm">{title}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
            <button
              onClick={() => {
                setShow(false)
                onDismiss()
              }}
              className="p-1 rounded hover:bg-muted transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function resetOnboarding() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY)
  }
}
