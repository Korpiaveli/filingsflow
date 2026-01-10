import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { SmartFilters, type SourceFilter, type DirectionFilter, type ValueFilter } from '@/components/activity/smart-filters'
import { UnifiedFeed, UnifiedFeedSkeleton } from '@/components/activity/unified-feed'
import { AnimatedActivity } from '@/components/activity/animated-activity'
import Link from 'next/link'
import { Activity, ChevronLeft, ChevronRight, X } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface SearchParams {
  source?: string
  direction?: string
  minValue?: string
  watchlist?: string
  ticker?: string
  page?: string
}

function parseSource(value?: string): SourceFilter {
  if (value === 'insider' || value === '13f' || value === 'congress') return value
  return 'all'
}

function parseDirection(value?: string): DirectionFilter {
  if (value === 'buys' || value === 'sells') return value
  return 'all'
}

function parseMinValue(value?: string): ValueFilter {
  const num = parseInt(value || '0', 10)
  if (num === 10000 || num === 100000 || num === 1000000) return num
  return 0
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const source = parseSource(params.source)
  const direction = parseDirection(params.direction)
  const minValue = parseMinValue(params.minValue)
  const watchlistOnly = params.watchlist === '1'
  const ticker = params.ticker?.toUpperCase()
  const page = parseInt(params.page || '1', 10)
  const pageSize = 20

  return (
    <AnimatedActivity
      header={
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-1">Activity Feed</h1>
              <p className="text-lg text-muted-foreground">
                {ticker ? (
                  <span className="flex items-center gap-2">
                    Showing activity for{' '}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 rounded-lg">
                      <span className="font-mono font-bold text-primary">{ticker}</span>
                      <Link href="/activity" className="text-primary hover:text-primary/80">
                        <X className="w-4 h-4" />
                      </Link>
                    </span>
                  </span>
                ) : (
                  'Real-time insider, institutional, and congressional activity'
                )}
              </p>
            </div>
          </div>
        </div>
      }
      filters={
        <Suspense fallback={<FiltersSkeleton />}>
          <SmartFilters
            currentSource={source}
            currentDirection={direction}
            currentMinValue={minValue}
            watchlistOnly={watchlistOnly}
          />
        </Suspense>
      }
      feed={
        <Suspense fallback={<UnifiedFeedSkeleton count={pageSize} />}>
          <UnifiedFeed
            source={source}
            direction={direction}
            minValue={minValue}
            watchlistOnly={watchlistOnly}
            userId={user.id}
            ticker={ticker}
            page={page}
            pageSize={pageSize}
          />
        </Suspense>
      }
      pagination={
        <Pagination
          currentPage={page}
          hasMore={true}
          params={params}
        />
      }
    />
  )
}

function FiltersSkeleton() {
  return (
    <div className="bg-card border-2 border-border/50 rounded-2xl p-5 mb-6 animate-pulse">
      <div className="flex flex-wrap gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2.5">
            <div className="h-3 w-16 bg-muted rounded" />
            <div className="flex gap-1.5">
              {[...Array(i === 0 ? 4 : 3)].map((_, j) => (
                <div key={j} className="h-10 w-24 bg-muted rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Pagination({
  currentPage,
  hasMore,
  params,
}: {
  currentPage: number
  hasMore: boolean
  params: SearchParams
}) {
  const buildUrl = (page: number) => {
    const searchParams = new URLSearchParams()
    if (params.source) searchParams.set('source', params.source)
    if (params.direction) searchParams.set('direction', params.direction)
    if (params.minValue) searchParams.set('minValue', params.minValue)
    if (params.watchlist) searchParams.set('watchlist', params.watchlist)
    if (params.ticker) searchParams.set('ticker', params.ticker)
    searchParams.set('page', String(page))
    return `/activity?${searchParams.toString()}`
  }

  return (
    <div className="mt-8 flex items-center justify-between bg-card border-2 border-border/50 rounded-xl p-4">
      <div className="text-sm text-muted-foreground font-medium">
        Page <span className="text-foreground font-bold">{currentPage}</span>
      </div>
      <div className="flex gap-2">
        {currentPage > 1 && (
          <Link
            href={buildUrl(currentPage - 1)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-2 border-border/50 rounded-xl hover:bg-muted hover:border-border transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Link>
        )}
        {hasMore && (
          <Link
            href={buildUrl(currentPage + 1)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>
    </div>
  )
}
