'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'

interface CorrelatedCluster {
  id: string
  name: string
  description: string
  type: string
  correlationScore: number
  totalOccurrences: number
  avgReturn30d: number | null
  avgReturn90d: number | null
  winRate: number | null
  isActive: boolean
  lastActivityAt: string
  memberCount: number
}

interface ClusterDetail {
  cluster: {
    id: string
    name: string
    description: string
    type: string
    correlationScore: number
    totalOccurrences: number
    firstDetectedAt: string
    lastActivityAt: string
    isActive: boolean
  }
  members: Array<{
    id: string
    name: string
    cik: string
    type: string
    affiliation: string | null
    transactionCount: number
    totalValue: number
    lastActiveAt: string
  }>
  recentActions: Array<{
    id: string
    ticker: string
    companyName: string
    direction: string
    actionDate: string
    participantCount: number
    totalValue: number
    avgEntryPrice: number | null
    currentPerformance: {
      current_price: number
      price_change_pct: number
      days_since_action: number
    } | null
  }>
  performance: {
    avgReturn30d: number | null
    avgReturn90d: number | null
    winRate: number | null
    totalActions: number
  }
}

const CLUSTER_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  company_insider: { label: 'Company Insiders', icon: '👥' },
  cross_company_exec: { label: 'Cross-Company', icon: '🌐' },
  congressional: { label: 'Congressional', icon: '🏛️' },
  institutional: { label: 'Institutional', icon: '🏦' },
  mixed_influential: { label: 'Mixed', icon: '⭐' },
}

export function CorrelatedClustersList() {
  const [clusters, setClusters] = useState<CorrelatedCluster[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'correlation' | 'performance' | 'winRate' | 'activity'>('correlation')
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [selectedCluster, setSelectedCluster] = useState<ClusterDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const fetchClusters = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ sortBy, limit: '20' })
      if (typeFilter) params.set('type', typeFilter)

      const response = await fetch(`/api/correlated-clusters?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch clusters')
      }

      setClusters(result.clusters)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const fetchClusterDetail = async (id: string) => {
    setDetailLoading(true)
    try {
      const response = await fetch(`/api/correlated-clusters/${id}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch cluster details')
      }

      setSelectedCluster(result)
    } catch (err) {
      console.error('Failed to fetch cluster details:', err)
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => {
    fetchClusters()
  }, [sortBy, typeFilter])

  if (loading && clusters.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{error}</p>
        {error.includes('Pro subscription') && (
          <Link href="/settings" className="text-red-600 underline text-sm mt-2 inline-block">
            Upgrade to Pro
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-sm"
              >
                <option value="correlation">Correlation Score</option>
                <option value="performance">30-Day Return</option>
                <option value="winRate">Win Rate</option>
                <option value="activity">Activity</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={typeFilter || ''}
                onChange={(e) => setTypeFilter(e.target.value || null)}
                className="rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-sm"
              >
                <option value="">All Types</option>
                <option value="company_insider">Company Insiders</option>
                <option value="cross_company_exec">Cross-Company</option>
                <option value="congressional">Congressional</option>
                <option value="institutional">Institutional</option>
                <option value="mixed_influential">Mixed</option>
              </select>
            </div>
          </div>

          <div className="text-sm text-gray-500">
            {clusters.length} cluster{clusters.length !== 1 ? 's' : ''} found
          </div>
        </div>
      </div>

      {clusters.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center">
          <p className="text-gray-500">No correlated clusters found.</p>
          <p className="text-sm text-gray-400 mt-2">
            Correlated clusters are detected when the same group of traders repeatedly acts together.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {clusters.map((cluster) => (
            <ClusterCard
              key={cluster.id}
              cluster={cluster}
              onSelect={() => fetchClusterDetail(cluster.id)}
              isSelected={selectedCluster?.cluster.id === cluster.id}
            />
          ))}
        </div>
      )}

      {selectedCluster && (
        <ClusterDetailPanel
          detail={selectedCluster}
          loading={detailLoading}
          onClose={() => setSelectedCluster(null)}
        />
      )}
    </div>
  )
}

function ClusterCard({
  cluster,
  onSelect,
  isSelected,
}: {
  cluster: CorrelatedCluster
  onSelect: () => void
  isSelected: boolean
}) {
  const typeInfo = CLUSTER_TYPE_LABELS[cluster.type] || { label: cluster.type, icon: '📊' }

  return (
    <div
      onClick={onSelect}
      className={cn(
        'bg-white rounded-lg border p-4 cursor-pointer transition-all hover:shadow-md',
        isSelected && 'ring-2 ring-primary border-primary'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{typeInfo.icon}</span>
            <h3 className="font-semibold text-gray-900">{cluster.name}</h3>
          </div>
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{cluster.description}</p>
        </div>
        <span className="text-xs bg-gray-100 px-2 py-1 rounded">{typeInfo.label}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm">
        <div className="text-center p-2 bg-gray-50 rounded">
          <div className="text-gray-500 text-xs">Correlation</div>
          <div className="font-bold text-primary">
            {(cluster.correlationScore * 100).toFixed(0)}%
          </div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded">
          <div className="text-gray-500 text-xs">Win Rate</div>
          <div className={cn(
            'font-bold',
            cluster.winRate && cluster.winRate > 0.5 ? 'text-green-600' : 'text-gray-600'
          )}>
            {cluster.winRate ? `${(cluster.winRate * 100).toFixed(0)}%` : '-'}
          </div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded">
          <div className="text-gray-500 text-xs">30d Return</div>
          <div className={cn(
            'font-bold',
            cluster.avgReturn30d && cluster.avgReturn30d > 0 ? 'text-green-600' :
            cluster.avgReturn30d && cluster.avgReturn30d < 0 ? 'text-red-600' : 'text-gray-600'
          )}>
            {cluster.avgReturn30d ? `${cluster.avgReturn30d > 0 ? '+' : ''}${cluster.avgReturn30d.toFixed(1)}%` : '-'}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-gray-500">
        <span>{cluster.memberCount} members</span>
        <span>{cluster.totalOccurrences} actions</span>
        <span>Last: {new Date(cluster.lastActivityAt).toLocaleDateString()}</span>
      </div>
    </div>
  )
}

function ClusterDetailPanel({
  detail,
  loading,
  onClose,
}: {
  detail: ClusterDetail
  loading: boolean
  onClose: () => void
}) {
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    )
  }

  const typeInfo = CLUSTER_TYPE_LABELS[detail.cluster.type] || { label: detail.cluster.type, icon: '📊' }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{typeInfo.icon}</span>
            <h2 className="text-xl font-bold">{detail.cluster.name}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Correlation" value={`${(detail.cluster.correlationScore * 100).toFixed(0)}%`} />
            <StatCard
              label="30d Avg Return"
              value={detail.performance.avgReturn30d ? `${detail.performance.avgReturn30d.toFixed(1)}%` : '-'}
              positive={detail.performance.avgReturn30d ? detail.performance.avgReturn30d > 0 : undefined}
            />
            <StatCard
              label="Win Rate"
              value={detail.performance.winRate ? `${(detail.performance.winRate * 100).toFixed(0)}%` : '-'}
              positive={detail.performance.winRate ? detail.performance.winRate > 0.5 : undefined}
            />
            <StatCard label="Total Actions" value={detail.performance.totalActions.toString()} />
          </div>

          <div>
            <h3 className="font-semibold mb-2">Members ({detail.members.length})</h3>
            <div className="bg-gray-50 rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
              {detail.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{member.name}</span>
                    {member.affiliation && (
                      <span className="text-gray-500 ml-2">({member.affiliation})</span>
                    )}
                  </div>
                  <span className="text-gray-500">
                    {member.transactionCount} trades · ${(member.totalValue / 1000000).toFixed(1)}M
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Recent Actions</h3>
            <div className="space-y-2">
              {detail.recentActions.map((action) => (
                <div key={action.id} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <Link
                      href={`/filings?ticker=${action.ticker}`}
                      className="font-bold text-primary hover:underline"
                    >
                      {action.ticker}
                    </Link>
                    <span className="text-gray-500 text-sm ml-2">{action.companyName}</span>
                    <span
                      className={cn(
                        'ml-2 text-xs px-2 py-0.5 rounded',
                        action.direction === 'buy' ? 'bg-green-100 text-green-700' :
                        action.direction === 'sell' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      )}
                    >
                      {action.direction.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-gray-500">{new Date(action.actionDate).toLocaleDateString()}</div>
                    {action.currentPerformance && (
                      <div className={cn(
                        'font-medium',
                        action.currentPerformance.price_change_pct > 0 ? 'text-green-600' : 'text-red-600'
                      )}>
                        {action.currentPerformance.price_change_pct > 0 ? '+' : ''}
                        {action.currentPerformance.price_change_pct.toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  positive,
}: {
  label: string
  value: string
  positive?: boolean
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div
        className={cn(
          'text-lg font-bold',
          positive === true && 'text-green-600',
          positive === false && 'text-red-600',
          positive === undefined && 'text-gray-900'
        )}
      >
        {value}
      </div>
    </div>
  )
}
