'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, Star, Zap, Trophy, Flame } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface ConfettiPiece {
  id: number
  x: number
  y: number
  rotation: number
  color: string
  size: number
  delay: number
}

interface ConfettiProps {
  isActive: boolean
  colors?: string[]
  particleCount?: number
}

export function Confetti({
  isActive,
  colors = ['#a855f7', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444'],
  particleCount = 50,
}: ConfettiProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([])

  useEffect(() => {
    if (isActive) {
      const newPieces: ConfettiPiece[] = Array.from({ length: particleCount }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: -10,
        rotation: Math.random() * 360,
        color: colors[Math.floor(Math.random() * colors.length)] || '#a855f7',
        size: Math.random() * 8 + 4,
        delay: Math.random() * 0.3,
      }))
      setPieces(newPieces)
      setTimeout(() => setPieces([]), 3000)
    }
  }, [isActive, colors, particleCount])

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {pieces.map((piece) => (
          <motion.div
            key={piece.id}
            className="absolute"
            style={{
              left: `${piece.x}%`,
              width: piece.size,
              height: piece.size,
              backgroundColor: piece.color,
              borderRadius: Math.random() > 0.5 ? '50%' : '0%',
            }}
            initial={{ y: piece.y, rotate: 0, opacity: 1 }}
            animate={{
              y: '120vh',
              rotate: piece.rotation + 720,
              opacity: [1, 1, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 2.5 + Math.random(),
              delay: piece.delay,
              ease: 'easeIn',
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

interface CelebrationModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description: string
  icon?: 'sparkles' | 'star' | 'zap' | 'trophy' | 'flame'
  showConfetti?: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

const celebrationIcons = {
  sparkles: Sparkles,
  star: Star,
  zap: Zap,
  trophy: Trophy,
  flame: Flame,
}

export function CelebrationModal({
  isOpen,
  onClose,
  title,
  description,
  icon = 'sparkles',
  showConfetti = true,
  action,
}: CelebrationModalProps) {
  const Icon = celebrationIcons[icon]

  return (
    <>
      {showConfetti && <Confetti isActive={isOpen} />}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/50 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-sm bg-card border rounded-2xl shadow-xl overflow-hidden"
            >
              <button
                onClick={onClose}
                className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>

              <div className="p-6 text-center">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                  className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center"
                >
                  <Icon className="w-8 h-8 text-primary" />
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-xl font-bold text-foreground mb-2"
                >
                  {title}
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-muted-foreground text-sm mb-6"
                >
                  {description}
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="flex gap-3 justify-center"
                >
                  {action && (
                    <button
                      onClick={action.onClick}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                    >
                      {action.label}
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-muted text-muted-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors"
                  >
                    Close
                  </button>
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

interface SuccessToastProps {
  isVisible: boolean
  onHide: () => void
  message: string
  icon?: React.ReactNode
  duration?: number
}

export function SuccessToast({
  isVisible,
  onHide,
  message,
  icon,
  duration = 3000,
}: SuccessToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onHide, duration)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [isVisible, onHide, duration])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 py-3 bg-[hsl(var(--signal-buy))] text-white rounded-lg shadow-lg flex items-center gap-2"
        >
          {icon || <Sparkles className="w-4 h-4" />}
          <span className="font-medium text-sm">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface AchievementBadgeProps {
  isNew: boolean
  icon: React.ReactNode
  title: string
  description: string
  onDismiss: () => void
}

export function AchievementBadge({
  isNew,
  icon,
  title,
  description,
  onDismiss,
}: AchievementBadgeProps) {
  return (
    <AnimatePresence>
      {isNew && (
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-4 right-4 z-50 w-80 bg-card border rounded-xl shadow-xl overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent" />
          <div className="relative p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-amber-500 uppercase tracking-wide">
                  Achievement
                </span>
                <Star className="w-3 h-3 text-amber-500 fill-current" />
              </div>
              <h4 className="font-semibold text-foreground text-sm">{title}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
            <button
              onClick={onDismiss}
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

interface PulseRingProps {
  isActive: boolean
  className?: string
  color?: string
}

export function PulseRing({ isActive, className, color = 'bg-primary' }: PulseRingProps) {
  return (
    <AnimatePresence>
      {isActive && (
        <motion.span
          className={cn('absolute inset-0 rounded-full', color, className)}
          initial={{ scale: 1, opacity: 0.4 }}
          animate={{ scale: 2, opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.5 }}
        />
      )}
    </AnimatePresence>
  )
}
