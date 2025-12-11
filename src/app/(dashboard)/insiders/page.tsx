import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'
import { isBuyTransaction, isSellTransaction, getTransactionDescription } from '@/lib/sec/parsers/form4'
import type { Tables } from '@/types/database'

type Transaction = Tables<'insider_transactions'>

export const dynamic = 'force-dynamic'

interface SearchParams {
  type?: 'buys' | 'sells' | 'all'
  minValue?: string
  page?: string
}

export default async function InsidersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const type = params.type || 'all'
  const minValue = parseInt(params.minValue || '0', 10)
  const page = parseInt(params.page || '1', 10)
  const pageSize = 25

  const supabase = await createClient()

  let query = supabase
    .from('insider_transactions')
    .select('*')
    .order('transaction_date', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (minValue > 0) {
    query = query.gte('total_value', minValue)
  }

  if (type === 'buys') {
    query = query.in('transaction_type', ['P', 'A', 'M'])
  } else if (type === 'sells') {
    query = query.in('transaction_type', ['S', 'D', 'F'])
  }

  const { data, error } = await query

  const transactions = (data || []) as Transaction[]

  const totalBuys = transactions.filter(t => isBuyTransaction(t.transaction_type)).length
  const totalSells = transactions.filter(t => isSellTransaction(t.transaction_type)).length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Insider Activity</h1>
          <p className="text-gray-600 mt-1">
            Recent insider purchases and sales across all companies
          </p>
        </div>
      </div>

      <InsiderFilters currentType={type} currentMinValue={minValue} />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Transactions" value={transactions.length} />
        <StatCard label="Buys" value={totalBuys} className="text-green-600" />
        <StatCard label="Sells" value={totalSells} className="text-red-600" />
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Error loading insider activity. Please try again.
        </div>
      ) : transactions.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center">
          <p className="text-gray-500">No insider transactions found.</p>
          <p className="text-sm text-gray-400 mt-2">
            Try adjusting your filters or check back later.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Company
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Insider
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Shares
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Value
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactions.map((txn) => (
                <TransactionRow key={txn.id} transaction={txn} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        currentPage={page}
        hasMore={transactions.length === pageSize}
        type={type}
        minValue={minValue}
      />
    </div>
  )
}

function StatCard({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={cn('text-2xl font-bold', className)}>{value.toLocaleString()}</p>
    </div>
  )
}

function InsiderFilters({
  currentType,
  currentMinValue,
}: {
  currentType: string
  currentMinValue: number
}) {
  const types = [
    { value: 'all', label: 'All' },
    { value: 'buys', label: 'Buys Only' },
    { value: 'sells', label: 'Sells Only' },
  ]

  const minValues = [
    { value: 0, label: 'Any Value' },
    { value: 10000, label: '$10K+' },
    { value: 100000, label: '$100K+' },
    { value: 1000000, label: '$1M+' },
  ]

  return (
    <div className="bg-white rounded-lg border p-4 mb-6">
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Transaction Type
          </label>
          <div className="flex gap-2">
            {types.map((t) => (
              <Link
                key={t.value}
                href={`/insiders?type=${t.value}${currentMinValue > 0 ? `&minValue=${currentMinValue}` : ''}`}
                className={cn(
                  'px-3 py-1 text-sm rounded-md border',
                  currentType === t.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                )}
              >
                {t.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Minimum Value
          </label>
          <div className="flex gap-2">
            {minValues.map((v) => (
              <Link
                key={v.value}
                href={`/insiders?type=${currentType}${v.value > 0 ? `&minValue=${v.value}` : ''}`}
                className={cn(
                  'px-3 py-1 text-sm rounded-md border',
                  currentMinValue === v.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                )}
              >
                {v.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function TransactionRow({ transaction: txn }: { transaction: Transaction }) {
  const isBuy = isBuyTransaction(txn.transaction_type)
  const isSell = isSellTransaction(txn.transaction_type)

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-4">
        <Link
          href={`/filings?ticker=${txn.ticker}`}
          className="font-bold text-primary hover:underline"
        >
          {txn.ticker}
        </Link>
        <div className="text-xs text-gray-500 truncate max-w-[200px]">
          {txn.company_name}
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="text-sm font-medium">{txn.insider_name}</div>
        <div className="text-xs text-gray-500">{txn.insider_title || '-'}</div>
        <div className="flex gap-1 mt-1">
          {txn.is_officer && (
            <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">
              Officer
            </span>
          )}
          {txn.is_director && (
            <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
              Director
            </span>
          )}
          {txn.is_ten_percent_owner && (
            <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
              10%+
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-4">
        <span
          className={cn(
            'text-sm px-2 py-1 rounded font-medium',
            isBuy
              ? 'bg-green-100 text-green-700'
              : isSell
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-700'
          )}
        >
          {txn.transaction_type}
        </span>
        <div className="text-xs text-gray-500 mt-1">
          {getTransactionDescription(txn.transaction_type)}
        </div>
      </td>
      <td className="px-4 py-4 text-right text-sm font-medium">
        {txn.shares ? txn.shares.toLocaleString() : '-'}
      </td>
      <td
        className={cn(
          'px-4 py-4 text-right text-sm font-bold',
          isBuy ? 'text-green-600' : isSell ? 'text-red-600' : ''
        )}
      >
        {txn.total_value ? `$${txn.total_value.toLocaleString()}` : '-'}
      </td>
      <td className="px-4 py-4 text-sm text-gray-500">
        {txn.transaction_date
          ? format(new Date(txn.transaction_date), 'MMM d, yyyy')
          : '-'}
      </td>
    </tr>
  )
}

function Pagination({
  currentPage,
  hasMore,
  type,
  minValue,
}: {
  currentPage: number
  hasMore: boolean
  type: string
  minValue: number
}) {
  const buildUrl = (page: number) => {
    const params = new URLSearchParams()
    if (type !== 'all') params.set('type', type)
    if (minValue > 0) params.set('minValue', String(minValue))
    params.set('page', String(page))
    return `/insiders?${params.toString()}`
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
