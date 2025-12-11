'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'

interface InsiderCluster {
  ticker: string
  companyName: string
  insiderCount: number
  totalValue: number
  transactionType: 'buy' | 'sell' | 'mixed'
  transactions: Array<{
    insiderName: string
    insiderTitle: string
    shares: number
    value: number
    date: string
  }>
  startDate: string
  endDate: string
}

interface ClusterResponse {
  clusters: InsiderCluster[]
  meta: {
    days: number
    minInsiders: number
    minValue: number
    totalClusters: number
  }
  error?: string
}

export default function ClustersPage() {
  const [data, setData] = useState<ClusterResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState(7)
  const [minInsiders, setMinInsiders] = useState(3)
  const [minValue, setMinValue] = useState(100000)

  const fetchClusters = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        days: days.toString(),
        minInsiders: minInsiders.toString(),
        minValue: minValue.toString(),
      })

      const response = await fetch(`/api/clusters?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch clusters')
      }

      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClusters()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cluster Detection</h1>
        <p className="text-gray-600 mt-1">
          Detect unusual patterns of multiple insiders trading the same stock
        </p>
      </div>

      <div className="bg-white rounded-lg border p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time Window
            </label>
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-sm"
            >
              <option value={3}>3 days</option>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Insiders
            </label>
            <select
              value={minInsiders}
              onChange={(e) => setMinInsiders(parseInt(e.target.value))}
              className="rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-sm"
            >
              <option value={2}>2+</option>
              <option value={3}>3+</option>
              <option value={4}>4+</option>
              <option value={5}>5+</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Value
            </label>
            <select
              value={minValue}
              onChange={(e) => setMinValue(parseInt(e.target.value))}
              className="rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-sm"
            >
              <option value={50000}>$50K+</option>
              <option value={100000}>$100K+</option>
              <option value={500000}>$500K+</option>
              <option value={1000000}>$1M+</option>
            </select>
          </div>

          <button
            onClick={fetchClusters}
            disabled={loading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
          {error.includes('Pro subscription') && (
            <Link
              href="/settings"
              className="text-red-600 underline text-sm mt-2 inline-block"
            >
              Upgrade to Pro
            </Link>
          )}
        </div>
      )}

      {loading && !data && (
        <div className="bg-white rounded-lg border p-8 text-center">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      )}

      {data && data.clusters.length === 0 && (
        <div className="bg-white rounded-lg border p-8 text-center">
          <p className="text-gray-500">No clusters detected with current filters.</p>
          <p className="text-sm text-gray-400 mt-2">
            Try adjusting the time window or lowering the minimum thresholds.
          </p>
        </div>
      )}

      {data && data.clusters.length > 0 && (
        <div className="space-y-4">
          {data.clusters.map((cluster) => (
            <ClusterCard key={cluster.ticker} cluster={cluster} />
          ))}
        </div>
      )}

      {data && (
        <div className="mt-4 text-sm text-gray-500 text-center">
          Found {data.meta.totalClusters} cluster{data.meta.totalClusters !== 1 ? 's' : ''} (showing top 20)
        </div>
      )}
    </div>
  )
}

function ClusterCard({ cluster }: { cluster: InsiderCluster }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div
        className="p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/filings?ticker=${cluster.ticker}`}
              className="text-lg font-bold text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {cluster.ticker}
            </Link>
            <span
              className={cn(
                'px-2 py-1 rounded text-xs font-medium',
                cluster.transactionType === 'buy'
                  ? 'bg-green-100 text-green-700'
                  : cluster.transactionType === 'sell'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-700'
              )}
            >
              {cluster.transactionType.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-gray-500">Insiders:</span>{' '}
              <span className="font-medium">{cluster.insiderCount}</span>
            </div>
            <div>
              <span className="text-gray-500">Value:</span>{' '}
              <span className="font-bold text-green-600">
                ${cluster.totalValue.toLocaleString()}
              </span>
            </div>
            <div className="text-gray-400">
              {cluster.startDate} → {cluster.endDate}
            </div>
            <svg
              className={cn(
                'w-5 h-5 text-gray-400 transition-transform',
                expanded && 'rotate-180'
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>

        <div className="mt-1 text-sm text-gray-500 truncate">
          {cluster.companyName}
        </div>
      </div>

      {expanded && (
        <div className="border-t px-4 py-3 bg-gray-50">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="pb-2 font-medium">Insider</th>
                <th className="pb-2 font-medium">Title</th>
                <th className="pb-2 font-medium text-right">Shares</th>
                <th className="pb-2 font-medium text-right">Value</th>
                <th className="pb-2 font-medium text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {cluster.transactions.map((txn, i) => (
                <tr key={i} className="border-t border-gray-200">
                  <td className="py-2 font-medium">{txn.insiderName}</td>
                  <td className="py-2 text-gray-500">{txn.insiderTitle || '-'}</td>
                  <td
                    className={cn(
                      'py-2 text-right font-medium',
                      txn.shares > 0 ? 'text-green-600' : 'text-red-600'
                    )}
                  >
                    {txn.shares > 0 ? '+' : ''}
                    {txn.shares.toLocaleString()}
                  </td>
                  <td className="py-2 text-right">${txn.value.toLocaleString()}</td>
                  <td className="py-2 text-right text-gray-500">{txn.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
