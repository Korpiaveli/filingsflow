import { createClient } from '@/lib/supabase/server'
import { FilingCard } from '@/components/filings/filing-card'
import { Suspense } from 'react'
import type { Tables } from '@/types/database'

type Filing = Tables<'filings'> & {
  insider_transactions: Tables<'insider_transactions'>[]
}

export const dynamic = 'force-dynamic'

interface SearchParams {
  formType?: string
  ticker?: string
  page?: string
}

export default async function FilingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const formType = params.formType
  const ticker = params.ticker?.toUpperCase()
  const page = parseInt(params.page || '1', 10)
  const pageSize = 20

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SEC Filings</h1>
          <p className="text-gray-600 mt-1">
            Real-time insider transactions and institutional holdings
          </p>
        </div>
      </div>

      <FilingFilters currentFormType={formType} currentTicker={ticker} />

      <Suspense fallback={<FilingsLoading />}>
        <FilingsList
          formType={formType}
          ticker={ticker}
          page={page}
          pageSize={pageSize}
        />
      </Suspense>
    </div>
  )
}

function FilingFilters({
  currentFormType,
  currentTicker,
}: {
  currentFormType?: string
  currentTicker?: string
}) {
  const formTypes = [
    { value: '', label: 'All Forms' },
    { value: '4', label: 'Form 4' },
    { value: '3', label: 'Form 3' },
    { value: '5', label: 'Form 5' },
  ]

  return (
    <div className="bg-white rounded-lg border p-4 mb-6">
      <div className="flex flex-wrap gap-4">
        <div>
          <label htmlFor="formType" className="block text-sm font-medium text-gray-700 mb-1">
            Form Type
          </label>
          <form>
            <select
              id="formType"
              name="formType"
              defaultValue={currentFormType || ''}
              className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-sm"
              onChange={(e) => {
                const url = new URL(window.location.href)
                if (e.target.value) {
                  url.searchParams.set('formType', e.target.value)
                } else {
                  url.searchParams.delete('formType')
                }
                url.searchParams.delete('page')
                window.location.href = url.toString()
              }}
            >
              {formTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </form>
        </div>

        <div>
          <label htmlFor="ticker" className="block text-sm font-medium text-gray-700 mb-1">
            Ticker
          </label>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              const ticker = formData.get('ticker')?.toString().toUpperCase()
              const url = new URL(window.location.href)
              if (ticker) {
                url.searchParams.set('ticker', ticker)
              } else {
                url.searchParams.delete('ticker')
              }
              url.searchParams.delete('page')
              window.location.href = url.toString()
            }}
          >
            <input
              type="text"
              id="ticker"
              name="ticker"
              defaultValue={currentTicker || ''}
              placeholder="AAPL"
              className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-sm uppercase"
            />
          </form>
        </div>

        {(currentFormType || currentTicker) && (
          <div className="flex items-end">
            <a
              href="/filings"
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Clear filters
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

async function FilingsList({
  formType,
  ticker,
  page,
  pageSize,
}: {
  formType?: string
  ticker?: string
  page: number
  pageSize: number
}) {
  const supabase = await createClient()

  let query = supabase
    .from('filings')
    .select(
      `
      *,
      insider_transactions (
        id,
        transaction_type,
        transaction_date,
        shares,
        price_per_share,
        total_value,
        insider_name,
        insider_title,
        is_officer,
        is_director
      )
    `
    )
    .order('filed_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (formType) {
    query = query.eq('form_type', formType)
  }

  if (ticker) {
    query = query.eq('ticker', ticker)
  }

  const { data, error } = await query

  const filings = data as Filing[] | null

  if (error) {
    console.error('Error fetching filings:', error)
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Error loading filings. Please try again.
      </div>
    )
  }

  if (!filings || filings.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center">
        <p className="text-gray-500">No filings found.</p>
        {(formType || ticker) && (
          <p className="text-sm text-gray-400 mt-2">
            Try adjusting your filters or check back later for new filings.
          </p>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="space-y-3">
        {filings.map((filing) => (
          <FilingCard key={filing.id} filing={filing} />
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Showing {(page - 1) * pageSize + 1} - {(page - 1) * pageSize + filings.length}
        </div>
        <div className="flex gap-2">
          {page > 1 && (
            <a
              href={`?${new URLSearchParams({
                ...(formType && { formType }),
                ...(ticker && { ticker }),
                page: String(page - 1),
              })}`}
              className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
            >
              Previous
            </a>
          )}
          {filings.length === pageSize && (
            <a
              href={`?${new URLSearchParams({
                ...(formType && { formType }),
                ...(ticker && { ticker }),
                page: String(page + 1),
              })}`}
              className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
            >
              Next
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function FilingsLoading() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-lg border p-4 animate-pulse"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="h-6 w-16 bg-gray-200 rounded" />
                <div className="h-5 w-20 bg-gray-200 rounded" />
              </div>
              <div className="h-4 w-48 bg-gray-200 rounded mt-2" />
              <div className="h-4 w-64 bg-gray-200 rounded mt-2" />
            </div>
            <div className="text-right">
              <div className="h-6 w-24 bg-gray-200 rounded" />
              <div className="h-3 w-16 bg-gray-200 rounded mt-2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
