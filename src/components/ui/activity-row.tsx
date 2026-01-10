import { cn } from '@/lib/utils/cn'
import { TickerChip } from './ticker-chip'
import { SignalBadge, type SignalType } from './signal-badge'
import { formatDistanceToNow } from 'date-fns'

export type ActivityType = 'insider' | '13f' | 'congress'
export type TransactionDirection = 'buy' | 'sell' | 'neutral'

interface ActivityRowProps {
  type: ActivityType
  ticker: string
  companyName?: string
  headline: string
  subtext?: string
  value?: number
  direction: TransactionDirection
  timestamp: Date
  signals?: Array<{ type: SignalType; label?: string }>
  onClick?: () => void
  className?: string
}

const typeIcons: Record<ActivityType, string> = {
  insider: '👤',
  '13f': '🏦',
  congress: '🏛️',
}

const typeLabels: Record<ActivityType, string> = {
  insider: 'Insider',
  '13f': '13F',
  congress: 'Congress',
}

export function ActivityRow({
  type,
  ticker,
  companyName,
  headline,
  subtext,
  value,
  direction,
  timestamp,
  signals = [],
  onClick,
  className,
}: ActivityRowProps) {
  const relativeTime = formatDistanceToNow(timestamp, { addSuffix: true })

  return (
    <div
      className={cn(
        'flex items-start gap-4 p-4 bg-card border rounded-xl hover:bg-muted/50 hover:border-border/70 transition-all',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-muted to-muted/50 text-xl border border-border/50">
        {typeIcons[type]}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <TickerChip
            ticker={ticker}
            companyName={companyName}
            variant={direction === 'buy' ? 'buy' : direction === 'sell' ? 'sell' : 'neutral'}
            size="sm"
            href={`/activity?ticker=${ticker}`}
            showHover={false}
          />
          <span className="text-sm font-semibold text-foreground truncate">{headline}</span>
        </div>

        {subtext && (
          <p className="mt-1 text-xs text-muted-foreground truncate">{subtext}</p>
        )}

        {signals.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {signals.map((signal, i) => (
              <SignalBadge key={`${signal.type}-${i}`} type={signal.type} label={signal.label} />
            ))}
          </div>
        )}
      </div>

      <div className="flex-shrink-0 text-right">
        {value !== undefined && (
          <div
            className={cn(
              'text-sm font-bold mb-1',
              direction === 'buy' && 'text-[hsl(var(--signal-buy))]',
              direction === 'sell' && 'text-[hsl(var(--signal-sell))]',
              direction === 'neutral' && 'text-muted-foreground'
            )}
          >
            {direction === 'buy' ? '+' : direction === 'sell' ? '-' : ''}${formatValue(value)}
          </div>
        )}
        <div className="text-xs text-muted-foreground">{relativeTime}</div>
        <div className="text-xs text-muted-foreground/60 mt-0.5 font-medium">{typeLabels[type]}</div>
      </div>
    </div>
  )
}

function formatValue(value: number): string {
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + 'B'
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M'
  if (value >= 1_000) return (value / 1_000).toFixed(0) + 'K'
  return value.toLocaleString()
}

export function ActivityRowSkeleton() {
  return (
    <div className="flex items-start gap-4 p-4 bg-card border rounded-xl animate-pulse">
      <div className="w-10 h-10 rounded-full bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="flex gap-2">
          <div className="h-5 w-14 bg-muted rounded" />
          <div className="h-5 w-48 bg-muted rounded" />
        </div>
        <div className="h-3 w-32 bg-muted rounded" />
      </div>
      <div className="space-y-1">
        <div className="h-4 w-16 bg-muted rounded" />
        <div className="h-3 w-12 bg-muted rounded" />
      </div>
    </div>
  )
}
