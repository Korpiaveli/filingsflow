import { fetchTopSignal, formatSignalValue } from '@/lib/signals/top-signal'
import { SignalBadge } from '@/components/ui/signal-badge'
import { TickerChip } from '@/components/ui/ticker-chip'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ArrowRight, TrendingUp } from 'lucide-react'

interface HeroSignalProps {
  userId?: string
}

export async function HeroSignal({ userId }: HeroSignalProps) {
  const signal = await fetchTopSignal(userId)

  if (!signal) {
    return (
      <div className="bg-gradient-to-br from-primary/5 via-background to-background border-2 border-primary/20 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Top Signal</h2>
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground">No significant activity in the last 48 hours.</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Check back during market hours.</p>
        </div>
      </div>
    )
  }

  const relativeTime = formatDistanceToNow(signal.transactionDate, { addSuffix: true })

  return (
    <div className="bg-gradient-to-br from-primary/5 via-background to-background border-2 border-primary/20 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Top Signal</h2>
        <span className="ml-auto text-xs text-muted-foreground">{relativeTime}</span>
      </div>

      <div className="mb-4">
        <TickerChip
          ticker={signal.ticker}
          companyName={signal.companyName}
          variant={signal.direction}
          size="lg"
          href={`/activity?ticker=${signal.ticker}`}
        />
      </div>

      <h3 className="text-2xl font-bold text-foreground mb-2 leading-tight">{signal.headline}</h3>

      <div className="inline-block bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/20 rounded-lg px-4 py-2 mb-4">
        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">{signal.context}</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {signal.isCluster && <SignalBadge type="cluster" />}
        {signal.isFirstInMonths && signal.monthsSinceLast && (
          <SignalBadge type="first-buy" label={`First in ${signal.monthsSinceLast}mo`} />
        )}
        {signal.value > 1_000_000 && (
          <SignalBadge type="unusual-size" label="$1M+" />
        )}
        {signal.signalType === 'c-suite' && (
          <SignalBadge type="c-suite" />
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div>
          <p className="text-sm text-muted-foreground">
            {signal.insiderName}
            {signal.insiderTitle && <span className="text-xs"> ({signal.insiderTitle})</span>}
          </p>
          <p className={`text-lg font-bold ${
            signal.direction === 'buy' ? 'text-[hsl(var(--signal-buy))]' : 'text-[hsl(var(--signal-sell))]'
          }`}>
            {signal.direction === 'buy' ? '▲' : '▼'} {formatSignalValue(signal.value)}
          </p>
        </div>
        <Link
          href={`/activity?ticker=${signal.ticker}`}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          View Details
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
