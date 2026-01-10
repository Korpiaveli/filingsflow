import { createClient } from '@/lib/supabase/server'
import { WatchButton } from './watch-button'
import Link from 'next/link'
import { format, subDays } from 'date-fns'
import { TrendingUp, TrendingDown, Flame, ArrowRight } from 'lucide-react'

interface TrendingTicker {
  ticker: string
  companyName: string
  transactionCount: number
  netFlow: number
  hasCluster: boolean
  topInsider: string | null
}

async function getTrendingTickers(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<TrendingTicker[]> {
  const sevenDaysAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd')

  const { data: recentTxns } = await supabase
    .from('insider_transactions')
    .select('ticker, company_name, transaction_type, total_value, insider_name')
    .gte('transaction_date', sevenDaysAgo)
    .not('ticker', 'is', null)

  if (!recentTxns || recentTxns.length === 0) return []

  const tickerMap = new Map<string, {
    companyName: string
    count: number
    netFlow: number
    insiders: Set<string>
    topValue: number
    topInsider: string | null
  }>()

  for (const txn of recentTxns) {
    const ticker = txn.ticker || ''
    if (!tickerMap.has(ticker)) {
      tickerMap.set(ticker, {
        companyName: txn.company_name || ticker,
        count: 0,
        netFlow: 0,
        insiders: new Set(),
        topValue: 0,
        topInsider: null,
      })
    }

    const entry = tickerMap.get(ticker)!
    entry.count++

    const isBuy = ['P', 'A', 'M'].includes(txn.transaction_type || '')
    const value = txn.total_value || 0
    entry.netFlow += isBuy ? value : -value

    if (txn.insider_name) {
      entry.insiders.add(txn.insider_name)
    }

    if (value > entry.topValue) {
      entry.topValue = value
      entry.topInsider = txn.insider_name || null
    }
  }

  const trending = Array.from(tickerMap.entries())
    .map(([ticker, data]) => ({
      ticker,
      companyName: data.companyName,
      transactionCount: data.count,
      netFlow: data.netFlow,
      hasCluster: data.insiders.size >= 3,
      topInsider: data.topInsider,
    }))
    .sort((a, b) => b.transactionCount - a.transactionCount)
    .slice(0, 10)

  return trending
}

function formatValue(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M'
  if (abs >= 1_000) return (value / 1_000).toFixed(0) + 'K'
  return value.toLocaleString()
}

export async function TrendingTickers() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const tickers = await getTrendingTickers(supabase)

  let watchedTickers: Set<string> = new Set()
  if (user) {
    const { data: watchlist } = await supabase
      .from('watchlists')
      .select('ticker')
      .eq('user_id', user.id)

    if (watchlist) {
      watchedTickers = new Set(watchlist.map(w => w.ticker))
    }
  }

  if (tickers.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
          <TrendingUp className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-lg font-medium text-foreground mb-1">No trending activity this week</p>
        <p className="text-sm text-muted-foreground">Check back soon for new insider activity</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {tickers.map((item, index) => {
        const isWatched = watchedTickers.has(item.ticker)
        const flowColor = item.netFlow > 0
          ? 'text-[hsl(var(--signal-buy))]'
          : item.netFlow < 0
          ? 'text-[hsl(var(--signal-sell))]'
          : 'text-muted-foreground'
        const FlowIcon = item.netFlow >= 0 ? TrendingUp : TrendingDown

        return (
          <div
            key={item.ticker}
            className="group bg-card border-2 border-border/50 hover:border-primary/30 rounded-2xl p-5 transition-all hover:shadow-md"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                  index === 0
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                    : index < 3
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  #{index + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-bold text-primary">
                      {item.ticker}
                    </span>
                    {item.hasCluster && (
                      <span className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold">
                        <Flame className="w-3 h-3" />
                        Cluster
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {item.companyName}
                  </p>
                </div>
              </div>
              <WatchButton ticker={item.ticker} isWatched={isWatched} variant="compact" />
            </div>

            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-1.5">
                <FlowIcon className={`w-4 h-4 ${flowColor}`} />
                <span className={`text-lg font-bold ${flowColor}`}>
                  {item.netFlow >= 0 ? '+' : '-'}${formatValue(Math.abs(item.netFlow))}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span className="text-sm font-medium">{item.transactionCount}</span>
                <span className="text-xs">transactions</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border/50">
              {item.topInsider ? (
                <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                  Top trader: <span className="font-medium text-foreground">{item.topInsider}</span>
                </p>
              ) : (
                <span />
              )}
              <Link
                href={`/activity?ticker=${item.ticker}`}
                className="flex items-center gap-1 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity"
              >
                View activity
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function TrendingTickersSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-card border-2 border-border/50 rounded-2xl p-5 animate-pulse">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted rounded-xl" />
              <div>
                <div className="h-6 w-20 bg-muted rounded mb-1" />
                <div className="h-4 w-32 bg-muted rounded" />
              </div>
            </div>
            <div className="w-8 h-8 bg-muted rounded-lg" />
          </div>
          <div className="flex items-center gap-4 mb-3">
            <div className="h-6 w-24 bg-muted rounded" />
            <div className="h-4 w-20 bg-muted rounded" />
          </div>
          <div className="pt-3 border-t border-border/50">
            <div className="h-3 w-36 bg-muted rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}
