import { Suspense } from 'react'
import { TickerSearch } from '@/components/discover/ticker-search'
import { TrendingTickers, TrendingTickersSkeleton } from '@/components/discover/trending-tickers'
import { AnimatedDiscover } from '@/components/discover/animated-discover'
import Link from 'next/link'
import { TrendingUp, Search, Target, FileText, Compass } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface SearchParams {
  tab?: string
}

type Tab = 'trending' | 'search' | 'clusters' | 'filings'

function parseTab(value?: string): Tab {
  if (value === 'search' || value === 'clusters' || value === 'filings') return value
  return 'trending'
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const currentTab = parseTab(params.tab)

  return (
    <AnimatedDiscover
      tabKey={currentTab}
      header={
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Compass className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Discover</h1>
            <p className="text-lg text-muted-foreground">Find new investment opportunities beyond your watchlist</p>
          </div>
        </div>
      }
      tabs={
        <div className="bg-card border rounded-2xl p-2 shadow-sm">
          <nav className="flex gap-2">
            <TabButton href="/discover" active={currentTab === 'trending'} icon={<TrendingUp className="w-4 h-4" />}>
              Trending
            </TabButton>
            <TabButton href="/discover?tab=search" active={currentTab === 'search'} icon={<Search className="w-4 h-4" />}>
              Search
            </TabButton>
            <TabButton href="/discover?tab=clusters" active={currentTab === 'clusters'} icon={<Target className="w-4 h-4" />}>
              Clusters
            </TabButton>
            <TabButton href="/discover?tab=filings" active={currentTab === 'filings'} icon={<FileText className="w-4 h-4" />}>
              Filings
            </TabButton>
          </nav>
        </div>
      }
      content={
        <>
          {currentTab === 'trending' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-foreground mb-2">Most Active This Week</h2>
                <p className="text-muted-foreground">Tickers with the highest insider activity in the past 7 days</p>
              </div>
              <Suspense fallback={<TrendingTickersSkeleton />}>
                <TrendingTickers />
              </Suspense>
            </div>
          )}

          {currentTab === 'search' && (
            <div className="flex flex-col items-center py-16">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-full p-6 mb-6">
                <Search className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-3">Search Any Ticker</h2>
              <p className="text-muted-foreground mb-8 text-center max-w-md leading-relaxed">
                Enter a ticker symbol to view all insider transactions, 13F holdings, and congressional trades
              </p>
              <TickerSearch />
            </div>
          )}

          {currentTab === 'clusters' && (
            <div>
              <div className="bg-gradient-to-br from-amber-500/10 via-primary/5 to-background border-2 border-amber-500/20 rounded-2xl p-8 mb-8 shadow-sm">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-14 h-14 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Target className="w-7 h-7 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">Cluster Detection</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      Identify unusual patterns where multiple insiders trade the same stock within a short time window—a
                      potentially significant signal worth investigating
                    </p>
                  </div>
                </div>
                <Link
                  href="/clusters"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                >
                  Open Cluster Scanner →
                </Link>
              </div>

              <div className="bg-muted/30 rounded-xl p-8 text-center border border-dashed">
                <div className="text-4xl mb-4">⚡</div>
                <p className="text-foreground font-medium mb-2">Advanced Cluster Detection</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Customize cluster parameters and get real-time alerts with a Pro or Premium subscription
                </p>
                <Link
                  href="/settings"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Upgrade to Pro →
                </Link>
              </div>
            </div>
          )}

          {currentTab === 'filings' && (
            <div>
              <div className="bg-card border rounded-2xl p-8 mb-6 shadow-sm">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="w-7 h-7 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-foreground mb-2">SEC Filings Browser</h2>
                    <p className="text-muted-foreground leading-relaxed mb-6">
                      Browse all Form 3, 4, 5, and 13F filings with AI-powered summaries. Filter by form type or search by ticker
                    </p>
                    <Link
                      href="/filings"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                    >
                      Open Filings Browser →
                    </Link>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FilingTypeCard
                  type="Form 4"
                  description="Changes in beneficial ownership by insiders"
                  count="Most common filings"
                  color="blue"
                />
                <FilingTypeCard
                  type="Form 3"
                  description="Initial statement of beneficial ownership"
                  count="New insider registrations"
                  color="green"
                />
                <FilingTypeCard
                  type="13F-HR"
                  description="Institutional holdings reports"
                  count="Filed quarterly"
                  color="purple"
                />
              </div>
            </div>
          )}
        </>
      }
    />
  )
}

function TabButton({
  href,
  active,
  children,
  icon,
}: {
  href: string
  active: boolean
  children: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
      }`}
    >
      {icon}
      {children}
    </Link>
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
