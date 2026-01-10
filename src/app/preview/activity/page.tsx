'use client'

import { useState } from 'react'
import { ActivityRow } from '@/components/ui/activity-row'
import { sampleActivityFeed } from '@/lib/sample-data'
import type { SignalType } from '@/components/ui/signal-badge'

type SourceFilter = 'all' | 'insider' | 'congress' | '13f'
type DirectionFilter = 'all' | 'buys' | 'sells'

const moreActivityData = [
  ...sampleActivityFeed,
  {
    id: '6',
    type: 'insider' as const,
    ticker: 'NFLX',
    companyName: 'Netflix, Inc.',
    headline: 'Director bought $320K',
    subtext: 'Reed Hastings',
    value: 320000,
    direction: 'buy' as const,
    timestamp: new Date('2024-01-04'),
    signals: [],
  },
  {
    id: '7',
    type: 'congress' as const,
    ticker: 'MSFT',
    companyName: 'Microsoft Corporation',
    headline: 'Dan Crenshaw Purchase',
    subtext: 'Rep. • $15K - $50K',
    value: 32500,
    direction: 'buy' as const,
    timestamp: new Date('2024-01-04'),
    signals: [{ type: 'congress' as SignalType }],
  },
  {
    id: '8',
    type: 'insider' as const,
    ticker: 'CRM',
    companyName: 'Salesforce, Inc.',
    headline: 'CEO sold $5.2M',
    subtext: 'Marc Benioff',
    value: 5200000,
    direction: 'sell' as const,
    timestamp: new Date('2024-01-03'),
    signals: [{ type: 'c-suite' as SignalType }],
  },
  {
    id: '9',
    type: '13f' as const,
    ticker: 'AMZN',
    companyName: 'Amazon.com, Inc.',
    headline: 'Vanguard holds $45B',
    subtext: '312M shares',
    value: 45000000000,
    direction: 'neutral' as const,
    timestamp: new Date('2024-01-03'),
    signals: [{ type: 'institutional' as SignalType }],
  },
  {
    id: '10',
    type: 'insider' as const,
    ticker: 'V',
    companyName: 'Visa Inc.',
    headline: 'CFO bought $890K',
    subtext: 'Chris Suh',
    value: 890000,
    direction: 'buy' as const,
    timestamp: new Date('2024-01-02'),
    signals: [{ type: 'c-suite' as SignalType }],
  },
]

export default function PreviewActivityPage() {
  const [source, setSource] = useState<SourceFilter>('all')
  const [direction, setDirection] = useState<DirectionFilter>('all')

  const filteredData = moreActivityData.filter((item) => {
    if (source !== 'all' && item.type !== source) return false
    if (direction === 'buys' && item.direction !== 'buy') return false
    if (direction === 'sells' && item.direction !== 'sell') return false
    return true
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Activity Feed</h1>
        <p className="text-muted-foreground mt-1">
          All insider, congressional, and institutional activity
        </p>
      </div>

      {/* Filters */}
      <div className="bg-card border rounded-xl p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">
              Source
            </label>
            <div className="flex gap-2">
              {(['all', 'insider', 'congress', '13f'] as SourceFilter[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSource(s)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    source === s
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {s === 'all' ? 'All' : s === 'insider' ? 'Insider' : s === 'congress' ? 'Congress' : '13F'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">
              Direction
            </label>
            <div className="flex gap-2">
              {(['all', 'buys', 'sells'] as DirectionFilter[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDirection(d)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    direction === d
                      ? d === 'buys'
                        ? 'bg-[hsl(var(--signal-buy))] text-white'
                        : d === 'sells'
                        ? 'bg-[hsl(var(--signal-sell))] text-white'
                        : 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {d === 'all' ? 'All' : d === 'buys' ? '▲ Buys' : '▼ Sells'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="bg-card border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            Showing {filteredData.length} results
          </p>
        </div>

        {filteredData.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📊</div>
            <p className="text-muted-foreground">No activity matches your filters.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredData.map((item) => (
              <ActivityRow
                key={item.id}
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
        )}
      </div>
    </div>
  )
}
