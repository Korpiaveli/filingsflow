import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import { cn } from '@/lib/utils/cn'
import { getTransactionDescription, isBuyTransaction, isSellTransaction } from '@/lib/sec/parsers/form4'
import { DISCLAIMER_SHORT } from '@/lib/utils/disclaimer'
import type { Tables } from '@/types/database'

type Filing = Tables<'filings'> & {
  insider_transactions: Tables<'insider_transactions'>[]
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function FilingDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('filings')
    .select(
      `
      *,
      insider_transactions (*)
    `
    )
    .eq('id', id)
    .single()

  if (error || !data) {
    notFound()
  }

  const filing = data as Filing
  const transactions = filing.insider_transactions || []

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/filings"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Back to filings
        </Link>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              {filing.ticker && (
                <span className="text-3xl font-bold">{filing.ticker}</span>
              )}
              <span
                className={cn(
                  'text-sm px-3 py-1 rounded font-medium',
                  filing.form_type === '4'
                    ? 'bg-blue-100 text-blue-700'
                    : filing.form_type === '3'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                )}
              >
                Form {filing.form_type}
              </span>
            </div>
            <h1 className="text-xl font-semibold mt-2">
              {filing.company_name || 'Unknown Company'}
            </h1>
            {filing.filer_name && (
              <p className="text-gray-600 mt-1">Filed by: {filing.filer_name}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">
              Filed {formatDistanceToNow(new Date(filing.filed_at), { addSuffix: true })}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {format(new Date(filing.filed_at), 'MMM d, yyyy h:mm a')}
            </p>
          </div>
        </div>

        {filing.ai_summary && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <h3 className="text-sm font-medium text-blue-800 mb-2">AI Summary</h3>
            <p className="text-blue-900">{filing.ai_summary}</p>
            <p className="text-xs text-blue-600 mt-2">{DISCLAIMER_SHORT}</p>
          </div>
        )}

        {transactions.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-4">Transactions</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Insider
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shares
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((txn) => {
                    const isBuy = isBuyTransaction(txn.transaction_type)
                    const isSell = isSellTransaction(txn.transaction_type)

                    return (
                      <tr key={txn.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {txn.insider_name}
                          </div>
                          {txn.insider_title && (
                            <div className="text-xs text-gray-500">
                              {txn.insider_title}
                            </div>
                          )}
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
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
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
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {txn.transaction_date
                            ? format(new Date(txn.transaction_date), 'MMM d, yyyy')
                            : '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-medium">
                          {txn.shares
                            ? new Intl.NumberFormat('en-US').format(txn.shares)
                            : '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                          {txn.price_per_share
                            ? `$${txn.price_per_share.toFixed(2)}`
                            : '-'}
                        </td>
                        <td
                          className={cn(
                            'px-4 py-4 whitespace-nowrap text-sm text-right font-bold',
                            isBuy
                              ? 'text-green-600'
                              : isSell
                                ? 'text-red-600'
                                : 'text-gray-900'
                          )}
                        >
                          {txn.total_value
                            ? `$${new Intl.NumberFormat('en-US').format(txn.total_value)}`
                            : '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 pt-6 border-t">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Filing Details</h3>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500">Accession Number</dt>
              <dd className="font-mono text-gray-900">{filing.accession_number}</dd>
            </div>
            <div>
              <dt className="text-gray-500">CIK</dt>
              <dd className="font-mono text-gray-900">{filing.cik}</dd>
            </div>
            {filing.file_url && (
              <div className="col-span-2">
                <dt className="text-gray-500">SEC Filing</dt>
                <dd>
                  <a
                    href={filing.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    View on SEC.gov &rarr;
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  )
}
