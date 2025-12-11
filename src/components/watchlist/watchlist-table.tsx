'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import type { Tables } from '@/types/database'

type Watchlist = Tables<'watchlists'>

interface WatchlistTableProps {
  items: Watchlist[]
}

export function WatchlistTable({ items }: WatchlistTableProps) {
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ticker
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Company
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Alerts
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Added
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {items.map((item) => (
            <WatchlistRow key={item.id} item={item} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function WatchlistRow({ item }: { item: Watchlist }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm(`Remove ${item.ticker} from your watchlist?`)) return

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/watchlist/${item.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        router.refresh()
      }
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <Link
          href={`/filings?ticker=${item.ticker}`}
          className="text-lg font-bold text-primary hover:underline"
        >
          {item.ticker}
        </Link>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
        {item.company_name || '-'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center">
        <div className="flex justify-center gap-2">
          {item.alert_on_insider && (
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
              Insider
            </span>
          )}
          {item.alert_on_13f && (
            <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
              13F
            </span>
          )}
          {item.alert_on_8k && (
            <span className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded">
              8-K
            </span>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {format(new Date(item.created_at), 'MMM d, yyyy')}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
        >
          {isDeleting ? 'Removing...' : 'Remove'}
        </button>
      </td>
    </tr>
  )
}
