import Link from 'next/link'
import { SignalBadge } from '@/components/ui/signal-badge'
import { ActivityRow } from '@/components/ui/activity-row'
import {
  sampleTopSignal,
  sampleWatchlistItems,
  sampleActivityFeed,
  sampleCongressTrades,
  sample13FMovements,
} from '@/lib/sample-data'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatValue(value: number): string {
  if (value >= 1_000_000_000) return '$' + (value / 1_000_000_000).toFixed(1) + 'B'
  if (value >= 1_000_000) return '$' + (value / 1_000_000).toFixed(1) + 'M'
  if (value >= 1_000) return '$' + (value / 1_000).toFixed(0) + 'K'
  return '$' + value.toLocaleString()
}

export default function PreviewDashboardPage() {
  const greeting = getGreeting()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          {greeting}, Demo User
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s what matters today.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Hero Signal */}
        <div className="lg:col-span-2">
          <PreviewHeroSignal />
        </div>

        {/* Watchlist Pulse */}
        <div>
          <PreviewWatchlistPulse />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <div className="lg:col-span-2">
          <PreviewActivityFeed />
        </div>

        {/* Side Cards */}
        <div className="space-y-6">
          <PreviewCongressCard />
          <PreviewInstitutionalCard />
        </div>
      </div>
    </div>
  )
}

function PreviewHeroSignal() {
  const signal = sampleTopSignal
  const direction = signal.direction as 'buy' | 'sell'
  const directionColor =
    direction === 'buy'
      ? 'text-[hsl(var(--signal-buy))]'
      : 'text-[hsl(var(--signal-sell))]'

  return (
    <div className="bg-card border rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🔥</span>
        <h2 className="text-lg font-semibold text-foreground">Top Signal</h2>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl font-bold text-primary">{signal.ticker}</span>
            <span className={`text-2xl ${directionColor}`}>
              {direction === 'buy' ? '▲' : '▼'}
            </span>
          </div>
          <p className="text-muted-foreground mb-3">{signal.companyName}</p>

          <div className="flex flex-wrap gap-2 mb-4">
            {signal.signals.map((s, i) => (
              <SignalBadge key={i} type={s.type} label={s.label} />
            ))}
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-lg font-semibold text-foreground">{signal.headline}</p>
            <p className="text-sm text-muted-foreground mt-1">{signal.context}</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-3xl font-bold text-foreground">{formatValue(signal.value)}</p>
          <p className="text-sm text-muted-foreground">{signal.insiderName}</p>
        </div>
      </div>

      <Link
        href="/preview/activity"
        className="block text-center mt-4 text-sm text-primary hover:underline"
      >
        View all activity →
      </Link>
    </div>
  )
}

function PreviewWatchlistPulse() {
  const items = sampleWatchlistItems

  return (
    <div className="bg-card border rounded-xl p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">👀</span>
          <h2 className="text-lg font-semibold text-foreground">Your Watchlist</h2>
        </div>
        <Link href="/preview/watchlist" className="text-xs text-primary hover:underline">
          View all
        </Link>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const activityLevel =
            item.insiderBuys30d + item.insiderSells30d >= 5
              ? 'high'
              : item.insiderBuys30d + item.insiderSells30d >= 2
              ? 'medium'
              : 'low'

          const activityColors = {
            high: 'bg-[hsl(var(--signal-buy))]/20 text-[hsl(var(--signal-buy))]',
            medium: 'bg-[hsl(var(--amber))]/20 text-[hsl(var(--amber))]',
            low: 'bg-muted text-muted-foreground',
          }

          return (
            <div
              key={item.ticker}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-primary">{item.ticker}</span>
                  {item.hasCluster && (
                    <span className="text-xs">🔥</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {item.insiderBuys30d} buys • {item.insiderSells30d} sells
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${activityColors[activityLevel]}`}>
                {activityLevel}
              </span>
            </div>
          )
        })}
      </div>

      <Link
        href="/preview/watchlist"
        className="block w-full text-center mt-4 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
      >
        + Add ticker
      </Link>
    </div>
  )
}

function PreviewActivityFeed() {
  const activities = sampleActivityFeed

  return (
    <div className="bg-card border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Today&apos;s Notable Activity</h2>
        <Link href="/preview/activity" className="text-sm text-primary hover:underline">
          View all →
        </Link>
      </div>

      <div className="space-y-3">
        {activities.slice(0, 5).map((activity) => (
          <ActivityRow
            key={activity.id}
            type={activity.type}
            ticker={activity.ticker}
            companyName={activity.companyName}
            headline={activity.headline}
            subtext={activity.subtext}
            value={activity.value}
            direction={activity.direction}
            timestamp={activity.timestamp}
            signals={activity.signals}
          />
        ))}
      </div>
    </div>
  )
}

function PreviewCongressCard() {
  const trades = sampleCongressTrades

  return (
    <div className="bg-card border rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🏛️</span>
        <h2 className="text-lg font-semibold text-foreground">Congress Trades</h2>
      </div>

      <div className="mb-4">
        <span className="text-2xl font-bold text-foreground">{trades.length}</span>
        <span className="text-sm text-muted-foreground ml-2">disclosures this week</span>
      </div>

      <div className="space-y-3">
        {trades.map((trade, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">
                  {trade.chamber === 'senate' ? 'SEN' : 'REP'}
                </span>
                <span className="font-medium text-sm truncate">{trade.memberName}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {trade.transactionType} {trade.ticker} • {trade.amountRange}
              </p>
            </div>
          </div>
        ))}
      </div>

      <Link
        href="/preview/activity?source=congress"
        className="block text-center mt-4 text-sm text-primary hover:underline"
      >
        View all congressional trades →
      </Link>
    </div>
  )
}

function PreviewInstitutionalCard() {
  const movements = sample13FMovements

  const directionIcons = {
    increased: '▲',
    decreased: '▼',
    new: '✚',
    exited: '✕',
  }

  const directionColors = {
    increased: 'text-[hsl(var(--signal-buy))]',
    decreased: 'text-[hsl(var(--signal-sell))]',
    new: 'text-teal-600 dark:text-teal-400',
    exited: 'text-gray-500',
  }

  return (
    <div className="bg-card border rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🏦</span>
        <h2 className="text-lg font-semibold text-foreground">13F Movements</h2>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Latest quarterly positions from major funds
      </p>

      <div className="space-y-3">
        {movements.map((move, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-primary">
                  {move.ticker}
                </span>
                <span className={`text-xs ${directionColors[move.direction]}`}>
                  {directionIcons[move.direction]}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {move.fundName}
              </p>
            </div>
            <span className="text-sm font-medium text-foreground">
              {formatValue(Math.abs(move.valueChange))}
            </span>
          </div>
        ))}
      </div>

      <Link
        href="/preview/activity?source=13f"
        className="block text-center mt-4 text-sm text-primary hover:underline"
      >
        View all 13F activity →
      </Link>
    </div>
  )
}
