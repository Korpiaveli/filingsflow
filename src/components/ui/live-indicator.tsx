'use client'

import { cn } from '@/lib/utils/cn'
import { formatDistanceToNow } from 'date-fns'

type StatusType = 'live' | 'delayed' | 'stale' | 'offline'

interface LiveIndicatorProps {
  status: StatusType
  lastUpdate?: Date | string | null
  showLabel?: boolean
  className?: string
}

const statusConfig: Record<StatusType, { color: string; label: string; pulse: boolean }> = {
  live: {
    color: 'bg-emerald-500',
    label: 'Live',
    pulse: true,
  },
  delayed: {
    color: 'bg-slate-400',
    label: 'Delayed',
    pulse: false,
  },
  stale: {
    color: 'bg-amber-500',
    label: 'Stale',
    pulse: false,
  },
  offline: {
    color: 'bg-red-500',
    label: 'Offline',
    pulse: false,
  },
}

export function LiveIndicator({
  status,
  lastUpdate,
  showLabel = true,
  className,
}: LiveIndicatorProps) {
  const config = statusConfig[status]
  const lastUpdateDate = lastUpdate
    ? typeof lastUpdate === 'string'
      ? new Date(lastUpdate)
      : lastUpdate
    : null

  const timeAgo = lastUpdateDate
    ? formatDistanceToNow(lastUpdateDate, { addSuffix: true })
    : null

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="relative flex h-2.5 w-2.5">
        {config.pulse && (
          <span
            className={cn(
              'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
              config.color
            )}
          />
        )}
        <span
          className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', config.color)}
        />
      </span>
      {showLabel && (
        <span className="text-xs text-muted-foreground">
          {config.label}
          {timeAgo && <span className="ml-1 opacity-70">· {timeAgo}</span>}
        </span>
      )}
    </div>
  )
}

interface SectionHeaderProps {
  title: string
  lastUpdate?: Date | string | null
  isRealtime?: boolean
  action?: React.ReactNode
  className?: string
}

export function SectionHeader({
  title,
  lastUpdate,
  isRealtime = true,
  action,
  className,
}: SectionHeaderProps) {
  const status: StatusType = !lastUpdate
    ? 'offline'
    : isRealtime
      ? 'live'
      : 'delayed'

  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <LiveIndicator status={status} lastUpdate={lastUpdate} showLabel={true} />
      </div>
      {action}
    </div>
  )
}
