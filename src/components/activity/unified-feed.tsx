import { createClient } from '@/lib/supabase/server'
import { ActivityRow, ActivityRowSkeleton } from '@/components/ui/activity-row'
import type { SignalType } from '@/components/ui/signal-badge'
import type { SourceFilter, DirectionFilter, ValueFilter } from './smart-filters'
import Link from 'next/link'

interface UnifiedFeedProps {
  source: SourceFilter
  direction: DirectionFilter
  minValue: ValueFilter
  watchlistOnly: boolean
  userId: string
  ticker?: string
  page: number
  pageSize: number
}

interface FeedItem {
  id: string
  type: 'insider' | '13f' | 'congress'
  ticker: string
  companyName: string
  headline: string
  subtext: string
  value: number
  direction: 'buy' | 'sell' | 'neutral'
  timestamp: Date
  signals: Array<{ type: SignalType; label?: string }>
}

async function fetchInsiderTransactions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  options: {
    direction: DirectionFilter
    minValue: ValueFilter
    ticker?: string
    watchlistTickers?: string[]
    page: number
    pageSize: number
  }
): Promise<FeedItem[]> {
  let query = supabase
    .from('insider_transactions')
    .select(`
      id,
      ticker,
      company_name,
      insider_name,
      insider_title,
      transaction_type,
      total_value,
      transaction_date,
      is_officer,
      is_director
    `)
    .order('transaction_date', { ascending: false })
    .range((options.page - 1) * options.pageSize, options.page * options.pageSize - 1)

  if (options.minValue > 0) {
    query = query.gte('total_value', options.minValue)
  }

  if (options.direction === 'buys') {
    query = query.in('transaction_type', ['P', 'A', 'M'])
  } else if (options.direction === 'sells') {
    query = query.in('transaction_type', ['S', 'D', 'F'])
  }

  if (options.ticker) {
    query = query.eq('ticker', options.ticker.toUpperCase())
  } else if (options.watchlistTickers && options.watchlistTickers.length > 0) {
    query = query.in('ticker', options.watchlistTickers)
  }

  const { data } = await query

  if (!data) return []

  return data.map((txn) => {
    const isBuy = ['P', 'A', 'M'].includes(txn.transaction_type || '')
    const isSell = ['S', 'D', 'F'].includes(txn.transaction_type || '')
    const action = isBuy ? 'bought' : isSell ? 'sold' : 'transacted'
    const title = txn.insider_title || (txn.is_officer ? 'Officer' : txn.is_director ? 'Director' : 'Insider')

    const signals: Array<{ type: SignalType; label?: string }> = []
    if (txn.is_officer && txn.insider_title?.toLowerCase().includes('ceo')) {
      signals.push({ type: 'c-suite' })
    }
    if ((txn.total_value || 0) > 1_000_000) {
      signals.push({ type: 'unusual-size', label: '$1M+' })
    }

    return {
      id: txn.id,
      type: 'insider' as const,
      ticker: txn.ticker || 'N/A',
      companyName: txn.company_name || '',
      headline: `${title} ${action} $${formatValue(txn.total_value || 0)}`,
      subtext: txn.insider_name || 'Unknown insider',
      value: txn.total_value || 0,
      direction: isBuy ? 'buy' : isSell ? 'sell' : 'neutral',
      timestamp: new Date(txn.transaction_date || new Date()),
      signals,
    }
  })
}

async function fetchCongressionalTrades(
  supabase: Awaited<ReturnType<typeof createClient>>,
  options: {
    direction: DirectionFilter
    minValue: ValueFilter
    ticker?: string
    watchlistTickers?: string[]
    page: number
    pageSize: number
  }
): Promise<FeedItem[]> {
  let query = supabase
    .from('congressional_transactions')
    .select('*')
    .not('ticker', 'is', null)
    .order('disclosure_date', { ascending: false })
    .range((options.page - 1) * options.pageSize, options.page * options.pageSize - 1)

  if (options.direction === 'buys') {
    query = query.ilike('transaction_type', '%purchase%')
  } else if (options.direction === 'sells') {
    query = query.ilike('transaction_type', '%sale%')
  }

  if (options.minValue > 0) {
    query = query.gte('amount_low', options.minValue)
  }

  if (options.ticker) {
    query = query.eq('ticker', options.ticker.toUpperCase())
  } else if (options.watchlistTickers && options.watchlistTickers.length > 0) {
    query = query.in('ticker', options.watchlistTickers)
  }

  const { data } = await query

  if (!data) return []

  return data.map((trade) => {
    const isBuy = trade.transaction_type?.toLowerCase().includes('purchase')
    const isSell = trade.transaction_type?.toLowerCase().includes('sale')

    return {
      id: trade.id,
      type: 'congress' as const,
      ticker: trade.ticker || 'N/A',
      companyName: trade.asset_description || '',
      headline: `${trade.member_name} ${trade.transaction_type}`,
      subtext: `${trade.chamber === 'senate' ? 'Senator' : 'Rep.'} • ${trade.amount_range}`,
      value: trade.amount_low || 0,
      direction: isBuy ? 'buy' : isSell ? 'sell' : 'neutral',
      timestamp: new Date(trade.disclosure_date || new Date()),
      signals: [{ type: 'congress' as SignalType }],
    }
  })
}

async function fetch13FHoldings(
  supabase: Awaited<ReturnType<typeof createClient>>,
  options: {
    ticker?: string
    watchlistTickers?: string[]
    page: number
    pageSize: number
  }
): Promise<FeedItem[]> {
  let query = supabase
    .from('holdings_13f')
    .select('*')
    .order('report_date', { ascending: false })
    .range((options.page - 1) * options.pageSize, options.page * options.pageSize - 1)

  if (options.ticker) {
    query = query.eq('ticker', options.ticker.toUpperCase())
  } else if (options.watchlistTickers && options.watchlistTickers.length > 0) {
    query = query.in('ticker', options.watchlistTickers)
  }

  const { data } = await query

  if (!data) return []

  return data.map((holding) => ({
    id: holding.id,
    type: '13f' as const,
    ticker: holding.ticker || 'N/A',
    companyName: holding.issuer_name || '',
    headline: `${holding.fund_name} holds ${formatValue(holding.value_usd || 0)}`,
    subtext: `${holding.shares?.toLocaleString() || '?'} shares`,
    value: holding.value_usd || 0,
    direction: 'neutral' as const,
    timestamp: new Date(holding.report_date || new Date()),
    signals: [{ type: 'institutional' as SignalType }],
  }))
}

function formatValue(value: number): string {
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + 'B'
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M'
  if (value >= 1_000) return (value / 1_000).toFixed(0) + 'K'
  return value.toLocaleString()
}

export async function UnifiedFeed({
  source,
  direction,
  minValue,
  watchlistOnly,
  userId,
  ticker,
  page,
  pageSize,
}: UnifiedFeedProps) {
  const supabase = await createClient()

  let watchlistTickers: string[] | undefined
  if (watchlistOnly) {
    const { data: watchlist } = await supabase
      .from('watchlists')
      .select('ticker')
      .eq('user_id', userId)

    watchlistTickers = watchlist?.map((w) => w.ticker) || []
    if (watchlistTickers.length === 0) {
      return (
        <div className="bg-card border rounded-xl p-8 text-center">
          <p className="text-muted-foreground">Your watchlist is empty.</p>
          <Link href="/watchlist" className="text-sm text-primary hover:underline mt-2 inline-block">
            Add tickers to your watchlist →
          </Link>
        </div>
      )
    }
  }

  const fetchOptions = {
    direction,
    minValue,
    ticker,
    watchlistTickers,
    page,
    pageSize: Math.ceil(pageSize / (source === 'all' ? 3 : 1)),
  }

  let items: FeedItem[] = []

  if (source === 'all' || source === 'insider') {
    const insiderItems = await fetchInsiderTransactions(supabase, fetchOptions)
    items = [...items, ...insiderItems]
  }

  if (source === 'all' || source === 'congress') {
    const congressItems = await fetchCongressionalTrades(supabase, fetchOptions)
    items = [...items, ...congressItems]
  }

  if (source === 'all' || source === '13f') {
    const holdingsItems = await fetch13FHoldings(supabase, {
      ticker,
      watchlistTickers,
      page,
      pageSize: fetchOptions.pageSize,
    })
    items = [...items, ...holdingsItems]
  }

  items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  items = items.slice(0, pageSize)

  if (items.length === 0) {
    return (
      <div className="bg-card border rounded-xl p-8 text-center">
        <p className="text-muted-foreground">No activity found matching your filters.</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Try adjusting filters or check back during market hours.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <ActivityRow
          key={`${item.type}-${item.id}`}
          type={item.type}
          ticker={item.ticker}
          companyName={item.companyName}
          headline={item.headline}
          subtext={item.subtext}
          value={item.value}
          direction={item.direction}
          timestamp={item.timestamp}
          signals={item.signals}
        />
      ))}
    </div>
  )
}

export function UnifiedFeedSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <ActivityRowSkeleton key={i} />
      ))}
    </div>
  )
}
