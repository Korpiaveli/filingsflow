import { createClient } from '@/lib/supabase/server'
import { ActivityRow, ActivityRowSkeleton } from '@/components/ui/activity-row'
import Link from 'next/link'
import type { SignalType } from '@/components/ui/signal-badge'
import { formatInsiderRelationship, type InsiderDisplayContext } from '@/lib/utils/format-insider'

interface ActivityFeedProps {
  userId: string
  limit?: number
}

interface ActivityItem {
  id: string
  type: 'insider' | '13f' | 'congress'
  ticker: string
  companyName: string
  headline: string
  subtext: string
  value: number
  direction: 'buy' | 'sell' | 'neutral'
  timestamp: Date
  signals: Array<{ type: SignalType; label?: string }>
}

async function getRecentActivity(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  limit: number
): Promise<ActivityItem[]> {
  const { data: transactions } = await supabase
    .from('insider_transactions')
    .select(`
      id,
      ticker,
      company_name,
      company_cik,
      insider_name,
      insider_title,
      insider_cik,
      transaction_type,
      total_value,
      transaction_date,
      is_officer,
      is_director,
      is_ten_percent_owner
    `)
    .order('transaction_date', { ascending: false })
    .limit(limit)

  if (!transactions) return []

  return transactions.map((txn) => {
    const isBuy = ['P', 'A', 'M'].includes(txn.transaction_type || '')
    const isSell = ['S', 'D', 'F'].includes(txn.transaction_type || '')
    const action = isBuy ? 'bought' : isSell ? 'sold' : 'transacted'

    const insiderContext: InsiderDisplayContext = {
      insiderName: txn.insider_name || 'Unknown',
      insiderTitle: txn.insider_title || null,
      insiderCik: txn.insider_cik || '',
      companyCik: txn.company_cik || '',
      companyName: txn.company_name || txn.ticker || 'Unknown',
      ticker: txn.ticker || 'N/A',
      isOfficer: txn.is_officer || false,
      isDirector: txn.is_director || false,
      isTenPercentOwner: txn.is_ten_percent_owner || false,
    }

    const formatted = formatInsiderRelationship(insiderContext)

    const signals: Array<{ type: SignalType; label?: string }> = []
    if (txn.is_officer && txn.insider_title?.toLowerCase().includes('ceo')) {
      signals.push({ type: 'c-suite' })
    }
    if ((txn.total_value || 0) > 1_000_000) {
      signals.push({ type: 'unusual-size', label: '$1M+' })
    }

    return {
      id: txn.id,
      type: 'insider' as const,
      ticker: txn.ticker || 'N/A',
      companyName: txn.company_name || '',
      headline: `${formatted.shortAttribution} ${action} $${formatValue(txn.total_value || 0)}`,
      subtext: formatted.headline,
      value: txn.total_value || 0,
      direction: isBuy ? 'buy' : isSell ? 'sell' : 'neutral',
      timestamp: new Date(txn.transaction_date || new Date()),
      signals,
    }
  })
}

function formatValue(value: number): string {
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + 'B'
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M'
  if (value >= 1_000) return (value / 1_000).toFixed(0) + 'K'
  return value.toLocaleString()
}

export async function ActivityFeed({ userId: _userId, limit = 10 }: ActivityFeedProps) {
  const supabase = await createClient()
  const activities = await getRecentActivity(supabase, limit)

  return (
    <div className="bg-card border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Today&apos;s Notable Activity</h2>
        <Link href="/activity" className="text-sm text-primary hover:underline">
          View All →
        </Link>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No activity recorded today.</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Check back during market hours for real-time updates.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <ActivityRow
              key={activity.id}
              type={activity.type}
              ticker={activity.ticker}
              companyName={activity.companyName}
              headline={activity.headline}
              subtext={activity.subtext}
              value={activity.value}
              direction={activity.direction}
              timestamp={activity.timestamp}
              signals={activity.signals}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function ActivityFeedSkeleton() {
  return (
    <div className="bg-card border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 w-48 bg-muted rounded animate-pulse" />
        <div className="h-4 w-20 bg-muted rounded animate-pulse" />
      </div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <ActivityRowSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
