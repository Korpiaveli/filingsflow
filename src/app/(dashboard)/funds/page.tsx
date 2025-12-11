import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { format } from 'date-fns'
import { cn } from '@/lib/utils/cn'
import { UntrackButton } from '@/components/funds/untrack-button'
import type { Tables } from '@/types/database'

type Holding = Tables<'holdings_13f'>
type TrackedFund = Tables<'tracked_funds'>

export const dynamic = 'force-dynamic'

interface SearchParams {
  view?: 'holdings' | 'tracked'
  ticker?: string
  page?: string
}

export default async function FundsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const view = params.view || 'holdings'
  const ticker = params.ticker?.toUpperCase()
  const page = parseInt(params.page || '1', 10)
  const pageSize = 25

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (view === 'tracked' && user) {
    return <TrackedFundsView userId={user.id} />
  }

  let query = supabase
    .from('holdings_13f')
    .select('*')
    .order('value_usd', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (ticker) {
    query = query.eq('ticker', ticker)
  }

  const { data, error } = await query

  const holdings = (data || []) as Holding[]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Institutional Holdings</h1>
          <p className="text-gray-600 mt-1">
            13F filings from hedge funds and institutional investors
          </p>
        </div>
      </div>

      <FundsTabs currentView={view} />

      <FundsFilters currentTicker={ticker} />

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Error loading holdings. Please try again.
        </div>
      ) : holdings.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center">
          <p className="text-gray-500">No 13F holdings found.</p>
          <p className="text-sm text-gray-400 mt-2">
            13F data is updated quarterly. Check back after the next filing deadline.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fund
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Security
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Shares
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Value
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Report Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {holdings.map((holding) => (
                <HoldingRow key={holding.id} holding={holding} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        currentPage={page}
        hasMore={holdings.length === pageSize}
        ticker={ticker}
      />
    </div>
  )
}

async function TrackedFundsView({ userId }: { userId: string }) {
  const supabase = await createClient()

  const { data: trackedFunds } = await supabase
    .from('tracked_funds')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  const funds = (trackedFunds || []) as TrackedFund[]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tracked Funds</h1>
          <p className="text-gray-600 mt-1">
            Funds you&apos;re following for 13F updates
          </p>
        </div>
      </div>

      <FundsTabs currentView="tracked" />

      {funds.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center">
          <p className="text-gray-500">You&apos;re not tracking any funds yet.</p>
          <p className="text-sm text-gray-400 mt-2">
            Browse the Holdings tab to find funds to track.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fund Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  CIK
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Added
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {funds.map((fund) => (
                <tr key={fund.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{fund.fund_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">{fund.cik}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {format(new Date(fund.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <UntrackButton fundId={fund.id} fundName={fund.fund_name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function FundsTabs({ currentView }: { currentView: string }) {
  const tabs = [
    { value: 'holdings', label: 'All Holdings' },
    { value: 'tracked', label: 'Tracked Funds' },
  ]

  return (
    <div className="border-b mb-6">
      <nav className="flex gap-4">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={`/funds?view=${tab.value}`}
            className={cn(
              'py-2 px-1 border-b-2 text-sm font-medium',
              currentView === tab.value
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}

function FundsFilters({ currentTicker }: { currentTicker?: string }) {
  return (
    <div className="bg-white rounded-lg border p-4 mb-6">
      <form className="flex gap-4">
        <div className="flex-1 max-w-xs">
          <label htmlFor="ticker" className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Ticker
          </label>
          <input
            type="text"
            id="ticker"
            name="ticker"
            defaultValue={currentTicker || ''}
            placeholder="AAPL"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-sm uppercase"
          />
        </div>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
          >
            Filter
          </button>
          {currentTicker && (
            <Link
              href="/funds"
              className="px-4 py-2 border rounded-md text-sm text-gray-600 hover:bg-gray-50"
            >
              Clear
            </Link>
          )}
        </div>
      </form>
    </div>
  )
}

function HoldingRow({ holding }: { holding: Holding }) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-4">
        <div className="font-medium text-gray-900">{holding.fund_name || 'Unknown Fund'}</div>
        <div className="text-xs text-gray-500 font-mono">CIK: {holding.fund_cik}</div>
      </td>
      <td className="px-4 py-4">
        {holding.ticker ? (
          <Link
            href={`/filings?ticker=${holding.ticker}`}
            className="font-bold text-primary hover:underline"
          >
            {holding.ticker}
          </Link>
        ) : (
          <span className="text-gray-400">-</span>
        )}
        <div className="text-xs text-gray-500 truncate max-w-[200px]">
          {holding.issuer_name}
        </div>
        {holding.put_call && (
          <span
            className={cn(
              'text-xs px-1.5 py-0.5 rounded mt-1 inline-block',
              holding.put_call === 'CALL' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            )}
          >
            {holding.put_call}
          </span>
        )}
      </td>
      <td className="px-4 py-4 text-right text-sm font-medium">
        {holding.shares.toLocaleString()}
      </td>
      <td className="px-4 py-4 text-right text-sm font-bold text-green-600">
        ${holding.value_usd.toLocaleString()}
      </td>
      <td className="px-4 py-4 text-sm text-gray-500">
        {format(new Date(holding.report_date), 'MMM d, yyyy')}
      </td>
    </tr>
  )
}

function Pagination({
  currentPage,
  hasMore,
  ticker,
}: {
  currentPage: number
  hasMore: boolean
  ticker?: string
}) {
  const buildUrl = (page: number) => {
    const params = new URLSearchParams()
    if (ticker) params.set('ticker', ticker)
    params.set('page', String(page))
    return `/funds?${params.toString()}`
  }

  return (
    <div className="mt-6 flex items-center justify-between">
      <div className="text-sm text-gray-500">Page {currentPage}</div>
      <div className="flex gap-2">
        {currentPage > 1 && (
          <Link
            href={buildUrl(currentPage - 1)}
            className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
          >
            Previous
          </Link>
        )}
        {hasMore && (
          <Link
            href={buildUrl(currentPage + 1)}
            className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
          >
            Next
          </Link>
        )}
      </div>
    </div>
  )
}
