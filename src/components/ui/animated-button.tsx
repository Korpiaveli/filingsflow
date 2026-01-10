'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Plus, Star, Heart, Bell, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface AnimatedAddButtonProps {
  isAdded: boolean
  isLoading?: boolean
  onClick: () => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'star' | 'heart' | 'bell'
}

const icons = {
  default: { idle: Plus, active: Check },
  star: { idle: Star, active: Star },
  heart: { idle: Heart, active: Heart },
  bell: { idle: Bell, active: Bell },
}

const sizes = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
}

const iconSizes = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
}

export function AnimatedAddButton({
  isAdded,
  isLoading = false,
  onClick,
  className,
  size = 'md',
  variant = 'default',
}: AnimatedAddButtonProps) {
  const IdleIcon = icons[variant].idle
  const ActiveIcon = icons[variant].active

  const handleClick = () => {
    if (!isLoading) {
      onClick()
      triggerHaptic()
    }
  }

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10)
    }
  }

  return (
    <motion.button
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        'relative flex items-center justify-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        sizes[size],
        isAdded
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted hover:bg-muted/80 text-muted-foreground',
        isLoading && 'cursor-not-allowed opacity-70',
        className
      )}
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      aria-label={isAdded ? 'Remove' : 'Add'}
    >
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, rotate: 0 }}
            animate={{ opacity: 1, rotate: 360 }}
            exit={{ opacity: 0 }}
            transition={{ rotate: { repeat: Infinity, duration: 1, ease: 'linear' } }}
          >
            <Loader2 className={iconSizes[size]} />
          </motion.div>
        ) : isAdded ? (
          <motion.div
            key="active"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          >
            <ActiveIcon className={cn(iconSizes[size], variant !== 'default' && 'fill-current')} />
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          >
            <IdleIcon className={iconSizes[size]} />
          </motion.div>
        )}
      </AnimatePresence>

      {isAdded && !isLoading && (
        <motion.div
          className="absolute inset-0 rounded-full bg-primary"
          initial={{ scale: 1.5, opacity: 0.5 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.4 }}
        />
      )}
    </motion.button>
  )
}

interface AnimatedSuccessButtonProps {
  onClick: () => Promise<void>
  children: React.ReactNode
  successMessage?: string
  className?: string
  disabled?: boolean
}

export function AnimatedSuccessButton({
  onClick,
  children,
  successMessage = 'Done!',
  className,
  disabled,
}: AnimatedSuccessButtonProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'success'>('idle')

  const handleClick = async () => {
    if (state !== 'idle' || disabled) return

    setState('loading')
    try {
      await onClick()
      setState('success')
      setTimeout(() => setState('idle'), 2000)
    } catch {
      setState('idle')
    }
  }

  return (
    <motion.button
      onClick={handleClick}
      disabled={disabled || state !== 'idle'}
      className={cn(
        'relative overflow-hidden px-4 py-2 rounded-lg font-medium transition-colors',
        state === 'success'
          ? 'bg-[hsl(var(--signal-buy))] text-white'
          : 'bg-primary text-primary-foreground hover:bg-primary/90',
        (disabled || state === 'loading') && 'opacity-70 cursor-not-allowed',
        className
      )}
      whileTap={state === 'idle' ? { scale: 0.97 } : undefined}
    >
      <AnimatePresence mode="wait">
        {state === 'loading' && (
          <motion.span
            key="loading"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading...
          </motion.span>
        )}
        {state === 'success' && (
          <motion.span
            key="success"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            {successMessage}
          </motion.span>
        )}
        {state === 'idle' && (
          <motion.span
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

interface ToggleButtonProps {
  isActive: boolean
  onClick: () => void
  activeLabel: string
  inactiveLabel: string
  activeIcon?: React.ReactNode
  inactiveIcon?: React.ReactNode
  className?: string
  disabled?: boolean
}

export function ToggleButton({
  isActive,
  onClick,
  activeLabel,
  inactiveLabel,
  activeIcon,
  inactiveIcon,
  className,
  disabled,
}: ToggleButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary/10 text-primary hover:bg-primary/20'
          : 'bg-muted text-muted-foreground hover:bg-muted/80',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      whileTap={!disabled ? { scale: 0.97 } : undefined}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={isActive ? 'active' : 'inactive'}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="flex items-center gap-2"
        >
          {isActive ? activeIcon : inactiveIcon}
          {isActive ? activeLabel : inactiveLabel}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  )
}
