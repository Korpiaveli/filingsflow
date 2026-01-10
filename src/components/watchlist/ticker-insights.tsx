import { createClient } from '@/lib/supabase/server'
import { SignalBadge } from '@/components/ui/signal-badge'
import { Sparkline, MiniBarChart } from '@/components/ui/sparkline'
import { LiveIndicator } from '@/components/ui/live-indicator'
import Link from 'next/link'
import { format, subDays, differenceInDays } from 'date-fns'
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import { AlertConfigSimple } from './alert-config'

interface TickerInsightsProps {
  ticker: string
  companyName?: string
  watchlistId?: string
  alertsEnabled?: boolean
}

interface TickerStats {
  insiderBuys30d: number
  insiderSells30d: number
  netFlow30d: number
  lastInsiderDate?: Date
  lastInsiderAction?: string
  lastInsiderName?: string
  hasCongressTrade: boolean
  has13FActivity: boolean
  hasCluster: boolean
  weeklyActivity: number[]
  activityTrend: 'up' | 'down' | 'stable'
}

async function getTickerStats(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ticker: string
): Promise<TickerStats> {
  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd')

  const [insiderData, congressData, holdingsData] = await Promise.all([
    supabase
      .from('insider_transactions')
      .select('transaction_type, total_value, transaction_date, insider_name')
      .eq('ticker', ticker)
      .gte('transaction_date', thirtyDaysAgo)
      .order('transaction_date', { ascending: false }),

    supabase
      .from('congressional_transactions')
      .select('id')
      .eq('ticker', ticker)
      .gte('disclosure_date', thirtyDaysAgo)
      .limit(1),

    supabase
      .from('holdings_13f')
      .select('id')
      .eq('ticker', ticker)
      .gte('report_date', thirtyDaysAgo)
      .limit(1),
  ])

  const insiders = insiderData.data || []

  let buys = 0
  let sells = 0
  let buyValue = 0
  let sellValue = 0

  for (const txn of insiders) {
    const isBuy = ['P', 'A', 'M'].includes(txn.transaction_type || '')
    const isSell = ['S', 'D', 'F'].includes(txn.transaction_type || '')

    if (isBuy) {
      buys++
      buyValue += txn.total_value || 0
    } else if (isSell) {
      sells++
      sellValue += txn.total_value || 0
    }
  }

  const lastInsider = insiders[0]
  const lastIsBuy = lastInsider && ['P', 'A', 'M'].includes(lastInsider.transaction_type || '')

  const uniqueInsiders = new Set(insiders.map((t) => t.insider_name)).size
  const hasCluster = uniqueInsiders >= 3 && insiders.length >= 3

  const weeklyActivity = [0, 0, 0, 0] as [number, number, number, number]
  const now = new Date()
  for (const txn of insiders) {
    if (txn.transaction_date) {
      const daysAgo = differenceInDays(now, new Date(txn.transaction_date))
      const weekIndex = Math.min(Math.max(Math.floor(daysAgo / 7), 0), 3) as 0 | 1 | 2 | 3
      const activityIndex = (3 - weekIndex) as 0 | 1 | 2 | 3
      weeklyActivity[activityIndex] = weeklyActivity[activityIndex] + Math.abs(txn.total_value || 0)
    }
  }

  const recentWeeks = weeklyActivity.slice(-2)
  const olderWeeks = weeklyActivity.slice(0, 2)
  const recentAvg = recentWeeks.reduce((a, b) => a + b, 0) / 2
  const olderAvg = olderWeeks.reduce((a, b) => a + b, 0) / 2
  const activityTrend: 'up' | 'down' | 'stable' =
    recentAvg > olderAvg * 1.2 ? 'up' : recentAvg < olderAvg * 0.8 ? 'down' : 'stable'

  return {
    insiderBuys30d: buys,
    insiderSells30d: sells,
    netFlow30d: buyValue - sellValue,
    lastInsiderDate: lastInsider?.transaction_date ? new Date(lastInsider.transaction_date) : undefined,
    lastInsiderAction: lastInsider ? (lastIsBuy ? 'bought' : 'sold') : undefined,
    lastInsiderName: lastInsider?.insider_name || undefined,
    hasCongressTrade: (congressData.data?.length || 0) > 0,
    has13FActivity: (holdingsData.data?.length || 0) > 0,
    hasCluster,
    weeklyActivity,
    activityTrend,
  }
}

function formatValue(value: number): string {
  const abs = Math.abs(value)
  const sign = value >= 0 ? '+' : '-'
  if (abs >= 1_000_000_000) return sign + '$' + (abs / 1_000_000_000).toFixed(1) + 'B'
  if (abs >= 1_000_000) return sign + '$' + (abs / 1_000_000).toFixed(1) + 'M'
  if (abs >= 1_000) return sign + '$' + (abs / 1_000).toFixed(0) + 'K'
  return sign + '$' + abs.toLocaleString()
}

export async function TickerInsights({ ticker, companyName, watchlistId, alertsEnabled = false }: TickerInsightsProps) {
  const supabase = await createClient()
  const stats = await getTickerStats(supabase, ticker)

  const totalActivity = stats.insiderBuys30d + stats.insiderSells30d
  const activityLevel =
    totalActivity >= 5 ? 'high' : totalActivity >= 2 ? 'medium' : totalActivity > 0 ? 'low' : 'none'

  const activityConfig = {
    high: {
      color: 'bg-[hsl(var(--signal-buy))]/15 text-[hsl(var(--signal-buy))]',
      label: 'High Activity',
      icon: TrendingUp,
    },
    medium: {
      color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
      label: 'Moderate',
      icon: AlertCircle,
    },
    low: {
      color: 'bg-muted text-muted-foreground',
      label: 'Low Activity',
      icon: null,
    },
    none: {
      color: 'bg-muted/50 text-muted-foreground/50',
      label: 'Quiet',
      icon: null,
    },
  }

  const config = activityConfig[activityLevel]
  const ActivityIcon = config.icon

  const freshness = stats.lastInsiderDate
    ? differenceInDays(new Date(), stats.lastInsiderDate) < 1
      ? 'live'
      : differenceInDays(new Date(), stats.lastInsiderDate) < 7
        ? 'delayed'
        : 'stale'
    : 'stale'

  const hasSparklineData = stats.weeklyActivity.some(v => v > 0)

  return (
    <div className="bg-card border rounded-xl p-5 hover:shadow-lg hover:border-primary/30 transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/activity?ticker=${ticker}`}
              className="text-2xl font-bold text-primary hover:text-primary/80 transition-colors"
            >
              {ticker}
            </Link>
            {stats.hasCluster && <span className="text-sm">🔥</span>}
            {stats.activityTrend === 'up' && (
              <span className="text-xs text-[hsl(var(--signal-buy))]">▲</span>
            )}
            {stats.activityTrend === 'down' && (
              <span className="text-xs text-[hsl(var(--signal-sell))]">▼</span>
            )}
          </div>
          {companyName && (
            <p className="text-sm text-muted-foreground line-clamp-1">{companyName}</p>
          )}
        </div>
        {hasSparklineData && (
          <div className="flex-shrink-0 ml-3">
            <Sparkline
              data={stats.weeklyActivity}
              width={64}
              height={28}
              color={stats.netFlow30d >= 0 ? 'buy' : 'sell'}
              showDots
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span
          className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold ${config.color}`}
        >
          {ActivityIcon && <ActivityIcon className="w-3 h-3" />}
          {config.label}
        </span>
        <LiveIndicator status={freshness} showLabel={false} />
      </div>

      <div className="flex items-center gap-3 mb-4">
        <MiniBarChart
          buyValue={stats.insiderBuys30d}
          sellValue={stats.insiderSells30d}
          width={80}
          height={8}
        />
        <span className="text-xs text-muted-foreground">
          {stats.insiderBuys30d}B / {stats.insiderSells30d}S
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-3 rounded-lg bg-gradient-to-br from-muted/80 to-muted/40">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp className="w-3 h-3 text-[hsl(var(--signal-buy))]" />
            <p className="text-xs text-muted-foreground">Buys</p>
          </div>
          <p className="text-lg font-bold text-[hsl(var(--signal-buy))]">{stats.insiderBuys30d}</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-gradient-to-br from-muted/80 to-muted/40">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingDown className="w-3 h-3 text-[hsl(var(--signal-sell))]" />
            <p className="text-xs text-muted-foreground">Sells</p>
          </div>
          <p className="text-lg font-bold text-[hsl(var(--signal-sell))]">{stats.insiderSells30d}</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-gradient-to-br from-muted/80 to-muted/40">
          <p className="text-xs text-muted-foreground mb-1">Net</p>
          <p
            className={`text-sm font-bold ${
              stats.netFlow30d > 0
                ? 'text-[hsl(var(--signal-buy))]'
                : stats.netFlow30d < 0
                ? 'text-[hsl(var(--signal-sell))]'
                : 'text-muted-foreground'
            }`}
          >
            {formatValue(stats.netFlow30d)}
          </p>
        </div>
      </div>

      {(stats.hasCluster || stats.hasCongressTrade || stats.has13FActivity) && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {stats.hasCluster && <SignalBadge type="cluster" />}
          {stats.hasCongressTrade && <SignalBadge type="congress" />}
          {stats.has13FActivity && <SignalBadge type="institutional" />}
        </div>
      )}

      {stats.lastInsiderDate && stats.lastInsiderName && (
        <div className="text-xs text-muted-foreground border-t pt-3 mb-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground">{stats.lastInsiderName}</span>
            <span>{format(stats.lastInsiderDate, 'MMM d')}</span>
          </div>
          <p className="mt-1">
            {stats.lastInsiderAction === 'bought' ? (
              <span className="text-[hsl(var(--signal-buy))]">▲ Bought shares</span>
            ) : (
              <span className="text-[hsl(var(--signal-sell))]">▼ Sold shares</span>
            )}
          </p>
        </div>
      )}

      {!stats.lastInsiderDate && (
        <div className="text-xs text-muted-foreground/70 border-t pt-3 mb-3 text-center">
          No insider activity in 30 days
        </div>
      )}

      {watchlistId && (
        <AlertConfigSimple watchlistId={watchlistId} ticker={ticker} initialEnabled={alertsEnabled} />
      )}
    </div>
  )
}

export function TickerInsightsSkeleton() {
  return (
    <div className="bg-card border rounded-xl p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="h-6 w-16 bg-muted rounded" />
          <div className="h-4 w-32 bg-muted rounded mt-1" />
        </div>
        <div className="h-6 w-20 bg-muted rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="text-center p-2 rounded-lg bg-muted/50">
            <div className="h-3 w-8 bg-muted rounded mx-auto mb-1" />
            <div className="h-6 w-6 bg-muted rounded mx-auto" />
          </div>
        ))}
      </div>
      <div className="h-4 w-full bg-muted rounded" />
    </div>
  )
}
