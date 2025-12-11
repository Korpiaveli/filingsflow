'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils/cn'
import { getTransactionDescription, isBuyTransaction, isSellTransaction } from '@/lib/sec/parsers/form4'

interface InsiderTransaction {
  id: string
  transaction_type: string
  transaction_date: string | null
  shares: number | null
  price_per_share: number | null
  total_value: number | null
  insider_name: string
  insider_title: string | null
  is_officer: boolean
  is_director: boolean
}

interface Filing {
  id: string
  accession_number: string
  form_type: string
  filed_at: string
  ticker: string | null
  company_name: string | null
  filer_name: string | null
  ai_summary: string | null
  insider_transactions?: InsiderTransaction[]
}

interface FilingCardProps {
  filing: Filing
}

export function FilingCard({ filing }: FilingCardProps) {
  const transactions = filing.insider_transactions || []
  const primaryTransaction = transactions[0]

  const isBuy = primaryTransaction && isBuyTransaction(primaryTransaction.transaction_type)
  const isSell = primaryTransaction && isSellTransaction(primaryTransaction.transaction_type)

  const totalValue = transactions.reduce((sum, t) => sum + (t.total_value || 0), 0)

  return (
    <Link href={`/filings/${filing.id}`}>
      <div className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {filing.ticker && (
                <span className="font-bold text-lg">{filing.ticker}</span>
              )}
              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded font-medium',
                  filing.form_type === '4'
                    ? 'bg-blue-100 text-blue-700'
                    : filing.form_type === '3'
                      ? 'bg-green-100 text-green-700'
                      : filing.form_type === '5'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-700'
                )}
              >
                Form {filing.form_type}
              </span>
              {primaryTransaction && (
                <span
                  className={cn(
                    'text-xs px-2 py-0.5 rounded font-medium',
                    isBuy
                      ? 'bg-green-100 text-green-700'
                      : isSell
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                  )}
                >
                  {isBuy ? 'Buy' : isSell ? 'Sell' : primaryTransaction.transaction_type}
                </span>
              )}
            </div>

            <p className="text-sm text-gray-600 mt-1 truncate">
              {filing.company_name || 'Unknown Company'}
            </p>

            {primaryTransaction && (
              <div className="mt-2">
                <p className="text-sm font-medium text-gray-900">
                  {primaryTransaction.insider_name}
                  {primaryTransaction.insider_title && (
                    <span className="text-gray-500 font-normal">
                      {' '}
                      &middot; {primaryTransaction.insider_title}
                    </span>
                  )}
                </p>
                <p className="text-sm text-gray-600">
                  {getTransactionDescription(primaryTransaction.transaction_type)}
                  {primaryTransaction.shares && (
                    <>
                      {' '}
                      &middot; {formatNumber(primaryTransaction.shares)} shares
                    </>
                  )}
                  {primaryTransaction.price_per_share && (
                    <>
                      {' '}
                      @ ${primaryTransaction.price_per_share.toFixed(2)}
                    </>
                  )}
                </p>
              </div>
            )}

            {filing.ai_summary && (
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                {filing.ai_summary}
              </p>
            )}
          </div>

          <div className="text-right ml-4 flex-shrink-0">
            {totalValue > 0 && (
              <p
                className={cn(
                  'text-lg font-bold',
                  isBuy ? 'text-green-600' : isSell ? 'text-red-600' : 'text-gray-900'
                )}
              >
                ${formatLargeNumber(totalValue)}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              {formatDistanceToNow(new Date(filing.filed_at), { addSuffix: true })}
            </p>
          </div>
        </div>
      </div>
    </Link>
  )
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}

function formatLargeNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1)}B`
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`
  }
  return formatNumber(num)
}
