'use client'

import { cn } from '@/lib/utils/cn'
import Link from 'next/link'
import { useState } from 'react'

interface TickerChipProps {
  ticker: string
  companyName?: string
  href?: string
  showHover?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'buy' | 'sell' | 'neutral'
  className?: string
  stats?: {
    lastActivity?: string
    netFlow?: number
    activityCount?: number
  }
}

const sizeClasses = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-1',
  lg: 'text-base px-3 py-1.5',
}

const variantClasses = {
  default: 'bg-primary/10 text-primary hover:bg-primary/20',
  buy: 'bg-[hsl(var(--signal-buy))]/10 text-[hsl(var(--signal-buy))]',
  sell: 'bg-[hsl(var(--signal-sell))]/10 text-[hsl(var(--signal-sell))]',
  neutral: 'bg-muted text-muted-foreground',
}

export function TickerChip({
  ticker,
  companyName,
  href,
  showHover = true,
  size = 'md',
  variant = 'default',
  className,
  stats,
}: TickerChipProps) {
  const [isHovered, setIsHovered] = useState(false)

  const chipContent = (
    <span
      className={cn(
        'inline-flex items-center font-mono font-bold rounded-md transition-colors',
        sizeClasses[size],
        variantClasses[variant],
        href && 'cursor-pointer',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {ticker}
    </span>
  )

  const hoverCard = showHover && stats && isHovered && (
    <div className="absolute z-50 mt-1 p-3 bg-popover border rounded-lg shadow-lg min-w-[200px] text-sm">
      <div className="font-bold text-foreground">{ticker}</div>
      {companyName && (
        <div className="text-xs text-muted-foreground truncate">{companyName}</div>
      )}
      <div className="mt-2 space-y-1 text-xs">
        {stats.lastActivity && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Last activity</span>
            <span>{stats.lastActivity}</span>
          </div>
        )}
        {stats.netFlow !== undefined && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">30d net flow</span>
            <span className={stats.netFlow >= 0 ? 'text-[hsl(var(--signal-buy))]' : 'text-[hsl(var(--signal-sell))]'}>
              {stats.netFlow >= 0 ? '+' : ''}${formatCompact(stats.netFlow)}
            </span>
          </div>
        )}
        {stats.activityCount !== undefined && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Transactions</span>
            <span>{stats.activityCount}</span>
          </div>
        )}
      </div>
    </div>
  )

  if (href) {
    return (
      <span className="relative inline-block">
        <Link href={href}>{chipContent}</Link>
        {hoverCard}
      </span>
    )
  }

  return (
    <span className="relative inline-block">
      {chipContent}
      {hoverCard}
    </span>
  )
}

function formatCompact(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + 'B'
  if (abs >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M'
  if (abs >= 1_000) return (value / 1_000).toFixed(1) + 'K'
  return value.toString()
}
