import { fetchWatchlistPulse, type WatchlistPulseItem } from '@/lib/signals/top-signal'
import Link from 'next/link'
import { Plus, AlertCircle, Star } from 'lucide-react'

interface WatchlistPulseProps {
  userId: string
}

type ActivityLevel = 'high' | 'medium' | 'low' | 'none'

function formatCompact(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M'
  if (abs >= 1_000) return (value / 1_000).toFixed(0) + 'K'
  return value.toLocaleString()
}

function getActivityLevelStyles(level: ActivityLevel) {
  switch (level) {
    case 'high':
      return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
    case 'medium':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
    case 'low':
      return 'bg-muted text-muted-foreground'
    case 'none':
    default:
      return 'bg-muted/50 text-muted-foreground/70'
  }
}

function getActivityLevelLabel(level: ActivityLevel) {
  switch (level) {
    case 'high': return 'High'
    case 'medium': return 'Med'
    case 'low': return 'Low'
    case 'none': return 'Quiet'
  }
}

function buildLastSignalText(item: WatchlistPulseItem): string | null {
  if (item.lastInsiderName && item.lastInsiderAction) {
    const name = item.lastInsiderName.split(' ')[0] || 'Insider'
    return `${name} ${item.lastInsiderAction}`
  }
  return null
}

export async function WatchlistPulse({ userId }: WatchlistPulseProps) {
  const items = await fetchWatchlistPulse(userId)
  const displayItems = items.slice(0, 5)

  return (
    <div className="bg-card border rounded-2xl p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Star className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Your Watchlist</h2>
        </div>
        <Link href="/watchlist" className="text-sm text-primary hover:underline font-medium">
          View all
        </Link>
      </div>

      {displayItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-8">
          <div className="text-4xl mb-3">📊</div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Your Watchlist</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-xs">
            Track tickers you care about and get instant notifications on insider activity
          </p>
          <Link
            href="/discover"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Your First Ticker
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {displayItems.map((item) => {
            const hasAlert = item.hasCluster || item.activityLevel === 'high'
            const lastSignalText = buildLastSignalText(item)
            const totalActivity = item.insiderBuys30d + item.insiderSells30d

            return (
              <Link
                key={item.ticker}
                href={`/activity?ticker=${item.ticker}`}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {hasAlert && (
                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground group-hover:text-primary transition-colors">
                        {item.ticker}
                      </span>
                      {item.hasCluster && <span className="text-xs">🔥</span>}
                      {item.hasCongressTrade && <span className="text-xs">🏛️</span>}
                      {item.has13fActivity && <span className="text-xs">🏦</span>}
                    </div>
                    {item.companyName && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{item.companyName}</p>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {lastSignalText ? (
                    <p className={`text-sm font-medium ${
                      item.netFlow30d > 0
                        ? 'text-[hsl(var(--signal-buy))]'
                        : item.netFlow30d < 0
                          ? 'text-[hsl(var(--signal-sell))]'
                          : item.hasCluster
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-muted-foreground'
                    }`}>
                      {lastSignalText}
                    </p>
                  ) : totalActivity > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getActivityLevelStyles(item.activityLevel)}`}>
                        {getActivityLevelLabel(item.activityLevel)}
                      </span>
                    </div>
                  ) : (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getActivityLevelStyles('none')}`}>
                      Quiet
                    </span>
                  )}
                  {item.netFlow30d !== 0 && (
                    <p className={`text-xs ${
                      item.netFlow30d > 0 ? 'text-[hsl(var(--signal-buy))]' : 'text-[hsl(var(--signal-sell))]'
                    }`}>
                      {item.netFlow30d > 0 ? '+' : ''}{formatCompact(item.netFlow30d)}
                    </p>
                  )}
                </div>
              </Link>
            )
          })}

          <Link
            href="/discover"
            className="mt-4 flex items-center justify-center gap-2 py-2 text-sm text-primary hover:underline font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Ticker
          </Link>
        </div>
      )}
    </div>
  )
}
