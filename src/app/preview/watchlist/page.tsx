'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SignalBadge } from '@/components/ui/signal-badge'
import { sampleWatchlistItems } from '@/lib/sample-data'
import { format } from 'date-fns'

function formatValue(value: number): string {
  const abs = Math.abs(value)
  const sign = value >= 0 ? '+' : '-'
  if (abs >= 1_000_000_000) return sign + '$' + (abs / 1_000_000_000).toFixed(1) + 'B'
  if (abs >= 1_000_000) return sign + '$' + (abs / 1_000_000).toFixed(1) + 'M'
  if (abs >= 1_000) return sign + '$' + (abs / 1_000).toFixed(0) + 'K'
  return sign + '$' + abs.toLocaleString()
}

export default function PreviewWatchlistPage() {
  const [newTicker, setNewTicker] = useState('')
  const items = sampleWatchlistItems

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Watchlist</h1>
          <p className="text-muted-foreground mt-1">
            Track tickers and get alerts when insiders trade
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {items.length} / 25 tickers
          </span>
        </div>
      </div>

      <div className="bg-card border rounded-xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">➕</span>
          <h2 className="text-lg font-semibold text-foreground">Add Ticker</h2>
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            value={newTicker}
            onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
            placeholder="Enter ticker symbol (e.g., AAPL)"
            className="flex-1 px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
            Add
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Your Tickers</h2>
          <Link
            href="/preview/activity?watchlist=true"
            className="text-sm text-primary hover:underline"
          >
            View all activity →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const totalActivity = item.insiderBuys30d + item.insiderSells30d
            const activityLevel =
              totalActivity >= 5 ? 'high' : totalActivity >= 2 ? 'medium' : totalActivity > 0 ? 'low' : 'none'

            const activityColors = {
              high: 'bg-[hsl(var(--signal-buy))]/20 text-[hsl(var(--signal-buy))]',
              medium: 'bg-[hsl(var(--amber))]/20 text-[hsl(var(--amber))]',
              low: 'bg-muted text-muted-foreground',
              none: 'bg-muted/50 text-muted-foreground/50',
            }

            return (
              <div
                key={item.ticker}
                className="bg-card border rounded-xl p-4 hover:border-primary/50 transition-colors relative group"
              >
                <button
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-card/80 backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                  title={`Remove ${item.ticker}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="flex items-start justify-between mb-3">
                  <div>
                    <Link
                      href={`/preview/activity?ticker=${item.ticker}`}
                      className="text-lg font-bold text-primary hover:underline"
                    >
                      {item.ticker}
                    </Link>
                    <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                      {item.companyName}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${activityColors[activityLevel]}`}
                  >
                    {activityLevel === 'none' ? 'Quiet' : `${totalActivity} trades`}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Buys</p>
                    <p className="text-lg font-bold text-[hsl(var(--signal-buy))]">
                      {item.insiderBuys30d}
                    </p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Sells</p>
                    <p className="text-lg font-bold text-[hsl(var(--signal-sell))]">
                      {item.insiderSells30d}
                    </p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Net Flow</p>
                    <p
                      className={`text-sm font-bold ${
                        item.netFlow30d > 0
                          ? 'text-[hsl(var(--signal-buy))]'
                          : item.netFlow30d < 0
                          ? 'text-[hsl(var(--signal-sell))]'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {formatValue(item.netFlow30d)}
                    </p>
                  </div>
                </div>

                {(item.hasCluster || item.hasCongressTrade || item.has13FActivity) && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {item.hasCluster && <SignalBadge type="cluster" />}
                    {item.hasCongressTrade && <SignalBadge type="congress" />}
                    {item.has13FActivity && <SignalBadge type="institutional" />}
                  </div>
                )}

                {item.lastInsiderDate && item.lastInsiderName && (
                  <div className="text-xs text-muted-foreground border-t pt-3">
                    <span className="font-medium text-foreground">{item.lastInsiderName}</span>{' '}
                    {item.lastInsiderAction} • {format(item.lastInsiderDate, 'MMM d')}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-8 pt-6 border-t">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-muted-foreground">Quick Actions</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/preview/activity?watchlist=true&direction=buys"
            className="px-4 py-2 bg-[hsl(var(--signal-buy))]/10 text-[hsl(var(--signal-buy))] rounded-lg text-sm font-medium hover:bg-[hsl(var(--signal-buy))]/20 transition-colors"
          >
            Watchlist Buys
          </Link>
          <Link
            href="/preview/activity?watchlist=true&direction=sells"
            className="px-4 py-2 bg-[hsl(var(--signal-sell))]/10 text-[hsl(var(--signal-sell))] rounded-lg text-sm font-medium hover:bg-[hsl(var(--signal-sell))]/20 transition-colors"
          >
            Watchlist Sells
          </Link>
          <Link
            href="/preview/activity?source=congress"
            className="px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-lg text-sm font-medium hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
          >
            Congressional Trades
          </Link>
          <Link
            href="/preview/discover"
            className="px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors"
          >
            Discover More Tickers
          </Link>
        </div>
      </div>
    </div>
  )
}
