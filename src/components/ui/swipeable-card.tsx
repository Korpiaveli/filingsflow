'use client'

import { useState, useRef } from 'react'
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion'
import { cn } from '@/lib/utils/cn'
import { Trash2, Bell, BellOff } from 'lucide-react'

interface SwipeAction {
  icon: React.ReactNode
  label: string
  color: string
  bgColor: string
  onAction: () => void
}

interface SwipeableCardProps {
  children: React.ReactNode
  leftActions?: SwipeAction[]
  rightActions?: SwipeAction[]
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  className?: string
  disabled?: boolean
}

const SWIPE_THRESHOLD = 80
const ACTION_WIDTH = 80

export function SwipeableCard({
  children,
  leftActions = [],
  rightActions = [],
  onSwipeLeft,
  onSwipeRight,
  className,
  disabled = false,
}: SwipeableCardProps) {
  const [isRevealed, setIsRevealed] = useState<'left' | 'right' | null>(null)
  const constraintsRef = useRef<HTMLDivElement>(null)

  const x = useMotionValue(0)

  const leftBgOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1])
  const rightBgOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0])

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const offset = info.offset.x
    const velocity = info.velocity.x

    if (offset > SWIPE_THRESHOLD || velocity > 500) {
      if (leftActions.length > 0) {
        setIsRevealed('left')
      } else if (onSwipeRight) {
        onSwipeRight()
      }
    } else if (offset < -SWIPE_THRESHOLD || velocity < -500) {
      if (rightActions.length > 0) {
        setIsRevealed('right')
      } else if (onSwipeLeft) {
        onSwipeLeft()
      }
    } else {
      setIsRevealed(null)
    }
  }

  const closeActions = () => {
    setIsRevealed(null)
  }

  if (disabled) {
    return <div className={className}>{children}</div>
  }

  return (
    <div ref={constraintsRef} className="relative overflow-hidden rounded-xl">
      {leftActions.length > 0 && (
        <motion.div
          className="absolute inset-y-0 left-0 flex items-center"
          style={{ opacity: leftBgOpacity }}
        >
          {leftActions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                action.onAction()
                closeActions()
              }}
              className={cn(
                'h-full flex flex-col items-center justify-center gap-1 px-4',
                action.bgColor
              )}
              style={{ width: ACTION_WIDTH }}
            >
              <span className={action.color}>{action.icon}</span>
              <span className={cn('text-[10px] font-medium', action.color)}>
                {action.label}
              </span>
            </button>
          ))}
        </motion.div>
      )}

      {rightActions.length > 0 && (
        <motion.div
          className="absolute inset-y-0 right-0 flex items-center"
          style={{ opacity: rightBgOpacity }}
        >
          {rightActions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                action.onAction()
                closeActions()
              }}
              className={cn(
                'h-full flex flex-col items-center justify-center gap-1 px-4',
                action.bgColor
              )}
              style={{ width: ACTION_WIDTH }}
            >
              <span className={action.color}>{action.icon}</span>
              <span className={cn('text-[10px] font-medium', action.color)}>
                {action.label}
              </span>
            </button>
          ))}
        </motion.div>
      )}

      <motion.div
        drag="x"
        dragConstraints={{ left: -ACTION_WIDTH * rightActions.length, right: ACTION_WIDTH * leftActions.length }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={{
          x: isRevealed === 'left'
            ? ACTION_WIDTH * leftActions.length
            : isRevealed === 'right'
              ? -ACTION_WIDTH * rightActions.length
              : 0,
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{ x }}
        className={cn('relative bg-card touch-pan-y', className)}
      >
        {children}
      </motion.div>

      {isRevealed && (
        <button
          onClick={closeActions}
          className="absolute inset-0 z-10"
          aria-label="Close actions"
        />
      )}
    </div>
  )
}

interface WatchlistSwipeableProps {
  children: React.ReactNode
  ticker: string
  watchlistId: string
  alertsEnabled: boolean
  onDelete: () => void
  onToggleAlerts: () => void
  className?: string
}

export function WatchlistSwipeable({
  children,
  alertsEnabled,
  onDelete,
  onToggleAlerts,
  className,
}: WatchlistSwipeableProps) {
  const leftActions: SwipeAction[] = [
    {
      icon: alertsEnabled ? <BellOff className="w-5 h-5" /> : <Bell className="w-5 h-5" />,
      label: alertsEnabled ? 'Mute' : 'Alert',
      color: 'text-primary',
      bgColor: 'bg-primary/20',
      onAction: onToggleAlerts,
    },
  ]

  const rightActions: SwipeAction[] = [
    {
      icon: <Trash2 className="w-5 h-5" />,
      label: 'Remove',
      color: 'text-destructive',
      bgColor: 'bg-destructive/20',
      onAction: onDelete,
    },
  ]

  return (
    <SwipeableCard
      leftActions={leftActions}
      rightActions={rightActions}
      className={className}
    >
      {children}
    </SwipeableCard>
  )
}

interface PullToRefreshProps {
  children: React.ReactNode
  onRefresh: () => Promise<void>
  className?: string
}

export function PullToRefresh({ children, onRefresh, className }: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = () => {
    if (containerRef.current?.scrollTop === 0) {
      setPullDistance(0)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0 && !isRefreshing) {
      const touch = e.touches[0]
      if (!touch) return
      const startY = touch.clientY
      setPullDistance(Math.min(startY * 0.3, 80))
    }
  }

  const handleTouchEnd = async () => {
    if (pullDistance > 60 && !isRefreshing) {
      setIsRefreshing(true)
      await onRefresh()
      setIsRefreshing(false)
    }
    setPullDistance(0)
  }

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={cn('relative', className)}
    >
      <motion.div
        animate={{ y: pullDistance }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        {pullDistance > 0 && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full py-4">
            <motion.div
              animate={{ rotate: isRefreshing ? 360 : pullDistance * 3 }}
              transition={isRefreshing ? { repeat: Infinity, duration: 1, ease: 'linear' } : {}}
              className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full"
            />
          </div>
        )}
        {children}
      </motion.div>
    </div>
  )
}

export function MobileActionSheet({
  isOpen,
  onClose,
  title,
  actions,
}: {
  isOpen: boolean
  onClose: () => void
  title?: string
  actions: Array<{
    label: string
    icon?: React.ReactNode
    onClick: () => void
    destructive?: boolean
  }>
}) {
  if (!isOpen) return null

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 z-50"
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl shadow-xl safe-area-inset-bottom"
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-muted rounded-full" />
        </div>
        {title && (
          <div className="px-4 pb-2">
            <h3 className="text-sm font-semibold text-muted-foreground text-center">
              {title}
            </h3>
          </div>
        )}
        <div className="p-2 space-y-1">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                action.onClick()
                onClose()
              }}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-colors',
                'active:bg-muted/50 touch-manipulation',
                action.destructive
                  ? 'text-destructive'
                  : 'text-foreground hover:bg-muted'
              )}
            >
              {action.icon && <span className="flex-shrink-0">{action.icon}</span>}
              <span className="font-medium">{action.label}</span>
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full px-4 py-4 text-center font-semibold text-muted-foreground border-t active:bg-muted/50"
        >
          Cancel
        </button>
      </motion.div>
    </>
  )
}
