import { fetchTopSignal, formatSignalValue } from '@/lib/signals/top-signal'
import { SignalBadge } from '@/components/ui/signal-badge'
import { TickerChip } from '@/components/ui/ticker-chip'
import { LiveIndicator } from '@/components/ui/live-indicator'
import { Sparkline } from '@/components/ui/sparkline'
import Link from 'next/link'
import { differenceInHours } from 'date-fns'
import { ArrowRight, TrendingUp, Zap, AlertTriangle } from 'lucide-react'

interface HeroSignalProps {
  userId?: string
}

function getSignalStrength(signal: { value: number; isCluster?: boolean; signalType?: string }): 'strong' | 'moderate' | 'weak' {
  if (signal.isCluster || signal.value > 5_000_000) return 'strong'
  if (signal.signalType === 'c-suite' || signal.value > 1_000_000) return 'moderate'
  return 'weak'
}

function getDataFreshness(date: Date): 'live' | 'delayed' | 'stale' {
  const hours = differenceInHours(new Date(), date)
  if (hours < 1) return 'live'
  if (hours < 24) return 'delayed'
  return 'stale'
}

export async function HeroSignal({ userId }: HeroSignalProps) {
  const signal = await fetchTopSignal(userId)

  if (!signal) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-muted/50 via-background to-background border-2 border-dashed border-border rounded-2xl p-8">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Top Signal</h2>
            <LiveIndicator status="stale" showLabel={true} />
          </div>
        </div>
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
            <AlertTriangle className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <p className="text-muted-foreground font-medium">No significant activity detected</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Check back during market hours for real-time signals</p>
        </div>
      </div>
    )
  }

  const strength = getSignalStrength(signal)
  const freshness = getDataFreshness(signal.transactionDate)

  const strengthStyles = {
    strong: 'from-amber-500/20 via-primary/10 to-background border-amber-500/40',
    moderate: 'from-primary/15 via-primary/5 to-background border-primary/30',
    weak: 'from-primary/10 via-background to-background border-primary/20',
  }

  const mockSparklineData = [signal.value * 0.7, signal.value * 0.8, signal.value * 0.6, signal.value * 0.9, signal.value * 0.85, signal.value]

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${strengthStyles[strength]} border-2 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group`}>
      <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/20 transition-colors" />

      {strength === 'strong' && (
        <div className="absolute top-4 right-4">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-full border border-amber-500/30">
            <Zap className="w-3 h-3" />
            HOT SIGNAL
          </span>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
          <TrendingUp className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Top Signal</h2>
          <LiveIndicator status={freshness} lastUpdate={signal.transactionDate} showLabel={true} />
        </div>
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

      <div className="flex items-center justify-between pt-4 border-t border-border/50">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              {signal.insiderName}
              {signal.insiderTitle && <span className="text-xs"> ({signal.insiderTitle})</span>}
            </p>
            <p className={`text-xl font-bold ${
              signal.direction === 'buy' ? 'text-[hsl(var(--signal-buy))]' : 'text-[hsl(var(--signal-sell))]'
            }`}>
              {signal.direction === 'buy' ? '▲' : '▼'} {formatSignalValue(signal.value)}
            </p>
          </div>
          <div className="hidden sm:block">
            <Sparkline
              data={mockSparklineData}
              width={100}
              height={32}
              color={signal.direction === 'buy' ? 'buy' : 'sell'}
              showDots={true}
            />
          </div>
        </div>
        <Link
          href={`/activity?ticker=${signal.ticker}`}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md"
        >
          View Details
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
