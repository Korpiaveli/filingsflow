'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SignalBadge } from '@/components/ui/signal-badge'
import { sampleTrendingTickers } from '@/lib/sample-data'

type Tab = 'trending' | 'search' | 'clusters' | 'filings'

function formatValue(value: number): string {
  const abs = Math.abs(value)
  const sign = value >= 0 ? '+' : '-'
  if (abs >= 1_000_000_000) return sign + '$' + (abs / 1_000_000_000).toFixed(1) + 'B'
  if (abs >= 1_000_000) return sign + '$' + (abs / 1_000_000).toFixed(1) + 'M'
  if (abs >= 1_000) return sign + '$' + (abs / 1_000).toFixed(0) + 'K'
  return sign + '$' + abs.toLocaleString()
}

export default function PreviewDiscoverPage() {
  const [currentTab, setCurrentTab] = useState<Tab>('trending')
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Discover</h1>
        <p className="text-muted-foreground mt-1">
          Find new opportunities beyond your watchlist
        </p>
      </div>

      <div className="border-b mb-6">
        <nav className="flex gap-6">
          <TabButton active={currentTab === 'trending'} onClick={() => setCurrentTab('trending')}>
            🔥 Trending
          </TabButton>
          <TabButton active={currentTab === 'search'} onClick={() => setCurrentTab('search')}>
            🔍 Search
          </TabButton>
          <TabButton active={currentTab === 'clusters'} onClick={() => setCurrentTab('clusters')}>
            🎯 Clusters
          </TabButton>
          <TabButton active={currentTab === 'filings'} onClick={() => setCurrentTab('filings')}>
            📄 All Filings
          </TabButton>
        </nav>
      </div>

      {currentTab === 'trending' && (
        <div>
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Most Active This Week
            </h2>
            <p className="text-sm text-muted-foreground">
              Tickers with the highest insider activity in the past 7 days
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sampleTrendingTickers.map((ticker) => (
              <div
                key={ticker.ticker}
                className="bg-card border rounded-xl p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-primary">{ticker.ticker}</span>
                      {ticker.hasCluster && <SignalBadge type="cluster" />}
                    </div>
                    <p className="text-sm text-muted-foreground truncate max-w-[180px]">
                      {ticker.companyName}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                    {ticker.transactionCount} trades
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Insiders</p>
                    <p className="text-lg font-bold text-foreground">{ticker.uniqueInsiders}</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Net Flow</p>
                    <p
                      className={`text-sm font-bold ${
                        ticker.netFlow > 0
                          ? 'text-[hsl(var(--signal-buy))]'
                          : ticker.netFlow < 0
                          ? 'text-[hsl(var(--signal-sell))]'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {formatValue(ticker.netFlow)}
                    </p>
                  </div>
                </div>

                {ticker.topInsiderName && (
                  <div className="text-xs text-muted-foreground border-t pt-3">
                    Top insider: <span className="font-medium text-foreground">{ticker.topInsiderName}</span>
                    {ticker.topInsiderTitle && ` (${ticker.topInsiderTitle})`}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {currentTab === 'search' && (
        <div className="flex flex-col items-center py-12">
          <div className="text-4xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Search Any Ticker
          </h2>
          <p className="text-muted-foreground mb-6 text-center max-w-md">
            Enter a ticker symbol to view all insider transactions, 13F holdings, and congressional trades
          </p>
          <div className="w-full max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
              placeholder="Enter ticker (e.g., AAPL)"
              className="w-full px-4 py-3 text-lg border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {searchQuery && (
              <div className="mt-4 p-4 bg-card border rounded-xl">
                <p className="text-sm text-muted-foreground">
                  Searching for <span className="font-bold text-primary">{searchQuery}</span>...
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  In the live app, this would show results from the database.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {currentTab === 'clusters' && (
        <div>
          <div className="bg-card border rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">🎯</span>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Cluster Detection</h2>
                <p className="text-sm text-muted-foreground">
                  Detect unusual patterns of multiple insiders trading the same stock
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Clusters occur when 3+ insiders trade within a short time window — a potential signal worth investigating.
            </p>

            <div className="bg-muted/50 rounded-lg p-4 mb-4">
              <h3 className="font-medium text-foreground mb-2">Active Clusters This Week</h3>
              <div className="space-y-2">
                {sampleTrendingTickers
                  .filter((t) => t.hasCluster)
                  .map((ticker) => (
                    <div
                      key={ticker.ticker}
                      className="flex items-center justify-between p-2 bg-card rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary">{ticker.ticker}</span>
                        <SignalBadge type="cluster" label={`${ticker.uniqueInsiders} insiders`} />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {ticker.transactionCount} transactions
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <div className="bg-muted/50 rounded-xl p-6 text-center">
            <p className="text-muted-foreground">
              Pro feature: Advanced cluster detection with custom parameters requires a Pro or Premium subscription
            </p>
            <Link href="/preview" className="text-sm text-primary hover:underline mt-2 inline-block">
              View subscription options →
            </Link>
          </div>
        </div>
      )}

      {currentTab === 'filings' && (
        <div>
          <div className="bg-card border rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">📄</span>
              <div>
                <h2 className="text-lg font-semibold text-foreground">SEC Filings Browser</h2>
                <p className="text-sm text-muted-foreground">
                  Browse all Form 3, 4, 5, and 13F filings
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Access the raw SEC filings with AI-powered summaries. Filter by form type or search by ticker.
            </p>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              Open Filings Browser →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FilingTypeCard
              type="Form 4"
              description="Changes in beneficial ownership"
              count="Most common"
              color="blue"
            />
            <FilingTypeCard
              type="Form 3"
              description="Initial statement of ownership"
              count="New insiders"
              color="green"
            />
            <FilingTypeCard
              type="13F-HR"
              description="Institutional holdings"
              count="Quarterly"
              color="purple"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`pb-3 text-sm font-medium transition-colors ${
        active
          ? 'text-primary border-b-2 border-primary'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  )
}

function FilingTypeCard({
  type,
  description,
  count,
  color,
}: {
  type: string
  description: string
  count: string
  color: 'blue' | 'green' | 'purple'
}) {
  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  }

  return (
    <div className="bg-card border rounded-xl p-4">
      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${colorClasses[color]}`}>
        {type}
      </span>
      <p className="mt-2 text-sm text-foreground font-medium">{description}</p>
      <p className="text-xs text-muted-foreground mt-1">{count}</p>
    </div>
  )
}
