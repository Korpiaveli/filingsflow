'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { SignalBadge } from '@/components/ui/signal-badge'
import type { SignalType } from '@/components/ui/signal-badge'
import { format } from 'date-fns'
import Link from 'next/link'

interface DetailPanelProps {
  isOpen: boolean
  onClose: () => void
  data: {
    type: 'insider' | '13f' | 'congress'
    ticker: string
    companyName: string
    headline: string
    subtext: string
    value: number
    direction: 'buy' | 'sell' | 'neutral'
    timestamp: Date
    signals: Array<{ type: SignalType; label?: string }>
    details?: {
      insiderName?: string
      insiderTitle?: string
      shares?: number
      pricePerShare?: number
      memberName?: string
      chamber?: string
      amountRange?: string
      fundName?: string
      reportDate?: string
      secLink?: string
    }
  } | null
}

function formatValue(value: number): string {
  if (value >= 1_000_000_000) return '$' + (value / 1_000_000_000).toFixed(1) + 'B'
  if (value >= 1_000_000) return '$' + (value / 1_000_000).toFixed(1) + 'M'
  if (value >= 1_000) return '$' + (value / 1_000).toFixed(0) + 'K'
  return '$' + value.toLocaleString()
}

const typeLabels = {
  insider: 'Insider Transaction',
  '13f': '13F Filing',
  congress: 'Congressional Trade',
}

const typeIcons = {
  insider: '👤',
  '13f': '🏦',
  congress: '🏛️',
}

export function DetailPanel({ isOpen, onClose, data }: DetailPanelProps) {
  if (!isOpen || !data) return null

  const directionColor =
    data.direction === 'buy'
      ? 'text-[hsl(var(--signal-buy))]'
      : data.direction === 'sell'
      ? 'text-[hsl(var(--signal-sell))]'
      : 'text-muted-foreground'

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-card border-l shadow-xl z-50 overflow-y-auto">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{typeIcons[data.type]}</span>
            <span className="text-sm font-medium text-muted-foreground">
              {typeLabels[data.type]}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                href={`/activity?ticker=${data.ticker}`}
                className="text-2xl font-bold text-primary hover:underline"
              >
                {data.ticker}
              </Link>
              <span className={`text-lg font-semibold ${directionColor}`}>
                {data.direction === 'buy' ? '▲' : data.direction === 'sell' ? '▼' : '●'}
              </span>
            </div>
            <p className="text-muted-foreground">{data.companyName}</p>
          </div>

          {data.signals.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.signals.map((signal, i) => (
                <SignalBadge key={i} type={signal.type} label={signal.label} />
              ))}
            </div>
          )}

          <div className="bg-muted/50 rounded-xl p-4">
            <p className="text-lg font-semibold text-foreground">{data.headline}</p>
            <p className="text-sm text-muted-foreground mt-1">{data.subtext}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card border rounded-lg p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Value
              </p>
              <p className="text-xl font-bold text-foreground">{formatValue(data.value)}</p>
            </div>
            <div className="bg-card border rounded-lg p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Date
              </p>
              <p className="text-xl font-bold text-foreground">
                {format(data.timestamp, 'MMM d')}
              </p>
            </div>
          </div>

          {data.type === 'insider' && data.details && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Transaction Details
              </h3>
              <div className="space-y-2">
                {data.details.insiderName && (
                  <DetailRow label="Insider" value={data.details.insiderName} />
                )}
                {data.details.insiderTitle && (
                  <DetailRow label="Title" value={data.details.insiderTitle} />
                )}
                {data.details.shares && (
                  <DetailRow label="Shares" value={data.details.shares.toLocaleString()} />
                )}
                {data.details.pricePerShare && (
                  <DetailRow
                    label="Price/Share"
                    value={`$${data.details.pricePerShare.toFixed(2)}`}
                  />
                )}
              </div>
            </div>
          )}

          {data.type === 'congress' && data.details && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Disclosure Details
              </h3>
              <div className="space-y-2">
                {data.details.memberName && (
                  <DetailRow label="Member" value={data.details.memberName} />
                )}
                {data.details.chamber && (
                  <DetailRow
                    label="Chamber"
                    value={data.details.chamber === 'senate' ? 'Senate' : 'House'}
                  />
                )}
                {data.details.amountRange && (
                  <DetailRow label="Amount Range" value={data.details.amountRange} />
                )}
              </div>
            </div>
          )}

          {data.type === '13f' && data.details && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Filing Details
              </h3>
              <div className="space-y-2">
                {data.details.fundName && (
                  <DetailRow label="Fund" value={data.details.fundName} />
                )}
                {data.details.reportDate && (
                  <DetailRow label="Report Date" value={data.details.reportDate} />
                )}
              </div>
            </div>
          )}

          <div className="pt-4 border-t space-y-3">
            <Link
              href={`/activity?ticker=${data.ticker}`}
              className="block w-full text-center px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              View All {data.ticker} Activity
            </Link>
            {data.details?.secLink && (
              <a
                href={data.details.secLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
              >
                View SEC Filing →
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}

export function useDetailPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<DetailPanelProps['data']>(null)

  const openPanel = (data: NonNullable<DetailPanelProps['data']>) => {
    setSelectedItem(data)
    setIsOpen(true)
  }

  const closePanel = () => {
    setIsOpen(false)
    setSelectedItem(null)
  }

  return {
    isOpen,
    selectedItem,
    openPanel,
    closePanel,
  }
}
