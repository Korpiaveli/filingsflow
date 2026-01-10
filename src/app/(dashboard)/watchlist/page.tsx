import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { AddTickerForm } from '@/components/watchlist/add-ticker-form'
import { TickerInsights, TickerInsightsSkeleton } from '@/components/watchlist/ticker-insights'
import type { Tables } from '@/types/database'
import Link from 'next/link'
import { Plus, TrendingUp, TrendingDown } from 'lucide-react'

type Watchlist = Tables<'watchlists'>

export const dynamic = 'force-dynamic'

export default async function WatchlistPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from('users')
    .select('subscription_tier')
    .eq('id', user.id)
    .single()

  const tier = profile?.subscription_tier || 'free'
  const maxTickers = tier === 'free' ? 5 : tier === 'pro' ? 25 : 100

  const { data: watchlist, error } = await supabase
    .from('watchlists')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const items = (watchlist || []) as Watchlist[]

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Your Watchlist</h1>
          <p className="text-lg text-muted-foreground">
            Track your favorite tickers and get instant alerts when insiders trade
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground mb-1">Tracking</div>
          <div className="text-2xl font-bold text-foreground">
            {items.length} <span className="text-base text-muted-foreground font-normal">/ {maxTickers}</span>
          </div>
          {tier === 'free' && items.length >= maxTickers && (
            <Link
              href="/settings"
              className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors mt-2 inline-block"
            >
              Upgrade for more
            </Link>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-br from-primary/5 via-background to-background border-2 border-primary/20 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Plus className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Add Ticker</h2>
            <p className="text-sm text-muted-foreground">Start tracking a new company</p>
          </div>
        </div>
        <AddTickerForm
          currentCount={items.length}
          maxCount={maxTickers}
          tier={tier}
        />
      </div>

      {error ? (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive">
          Error loading watchlist. Please try again.
        </div>
      ) : items.length === 0 ? (
        <div className="bg-card border rounded-2xl p-16 text-center">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Your watchlist is empty
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Add tickers to track insider activity, institutional holdings, and congressional trades
          </p>
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {['AAPL', 'NVDA', 'TSLA', 'GOOGL'].map((ticker) => (
              <button
                key={ticker}
                className="px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-full text-sm font-medium transition-colors"
              >
                {ticker}
              </button>
            ))}
          </div>
          <Link
            href="/discover"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Browse Trending Tickers
          </Link>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">
              Your Tickers ({items.length})
            </h2>
            <Link
              href="/activity?watchlist=true"
              className="text-sm text-primary hover:underline font-medium"
            >
              View all activity →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((item) => (
              <Suspense key={item.id} fallback={<TickerInsightsSkeleton />}>
                <TickerInsightsWrapper
                  ticker={item.ticker}
                  companyName={item.company_name || undefined}
                  itemId={item.id}
                  alertsEnabled={(item as any).alerts_enabled ?? false}
                />
              </Suspense>
            ))}
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="pt-8 border-t">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            Quick Actions
          </h3>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/activity?watchlist=true&direction=buys"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[hsl(var(--signal-buy))]/10 text-[hsl(var(--signal-buy))] rounded-lg text-sm font-semibold hover:bg-[hsl(var(--signal-buy))]/20 transition-colors"
            >
              <TrendingUp className="w-4 h-4" />
              Watchlist Buys
            </Link>
            <Link
              href="/activity?watchlist=true&direction=sells"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[hsl(var(--signal-sell))]/10 text-[hsl(var(--signal-sell))] rounded-lg text-sm font-semibold hover:bg-[hsl(var(--signal-sell))]/20 transition-colors"
            >
              <TrendingDown className="w-4 h-4" />
              Watchlist Sells
            </Link>
            <Link
              href="/discover"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary/10 text-primary rounded-lg text-sm font-semibold hover:bg-primary/20 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Discover More
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

async function TickerInsightsWrapper({
  ticker,
  companyName,
  itemId,
  alertsEnabled,
}: {
  ticker: string
  companyName?: string
  itemId: string
  alertsEnabled: boolean
}) {
  return (
    <div className="relative group">
      <TickerInsights
        ticker={ticker}
        companyName={companyName}
        watchlistId={itemId}
        alertsEnabled={alertsEnabled}
      />
      <RemoveButton itemId={itemId} ticker={ticker} />
    </div>
  )
}

function RemoveButton({ itemId, ticker }: { itemId: string; ticker: string }) {
  return (
    <form action={`/api/watchlist/${itemId}`} method="POST">
      <input type="hidden" name="_method" value="DELETE" />
      <button
        type="submit"
        className="absolute top-2 right-2 p-1.5 rounded-lg bg-card/80 backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
        title={`Remove ${ticker} from watchlist`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </form>
  )
}
