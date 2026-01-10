import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Building2, ArrowRight, TrendingUp, TrendingDown, Plus, Minus } from 'lucide-react'

interface FundMovement {
  fundName: string
  ticker: string
  direction: 'increased' | 'decreased' | 'new' | 'exited'
  sharesChange: number
  valueChange: number
}

async function getRecentInstitutionalMoves(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never
): Promise<FundMovement[]> {
  const { data: latestReport } = await supabase
    .from('holdings_13f')
    .select('report_date')
    .order('report_date', { ascending: false })
    .limit(1)
    .single()

  if (!latestReport) return []

  const { data: holdings } = await supabase
    .from('holdings_13f')
    .select('fund_name, ticker, shares, value_usd')
    .eq('report_date', latestReport.report_date)
    .order('value_usd', { ascending: false })
    .limit(5)

  if (!holdings) return []

  return holdings.map(h => ({
    fundName: h.fund_name || 'Unknown Fund',
    ticker: h.ticker || 'N/A',
    direction: 'increased' as const,
    sharesChange: h.shares || 0,
    valueChange: h.value_usd || 0,
  }))
}

function formatValue(value: number): string {
  if (value >= 1_000_000_000) return '$' + (value / 1_000_000_000).toFixed(1) + 'B'
  if (value >= 1_000_000) return '$' + (value / 1_000_000).toFixed(0) + 'M'
  if (value >= 1_000) return '$' + (value / 1_000).toFixed(0) + 'K'
  return '$' + value.toLocaleString()
}

const DirectionIcon = ({ direction }: { direction: FundMovement['direction'] }) => {
  const iconClass = "w-3.5 h-3.5"
  switch (direction) {
    case 'increased':
      return <TrendingUp className={`${iconClass} text-[hsl(var(--signal-buy))]`} />
    case 'decreased':
      return <TrendingDown className={`${iconClass} text-[hsl(var(--signal-sell))]`} />
    case 'new':
      return <Plus className={`${iconClass} text-teal-600 dark:text-teal-400`} />
    case 'exited':
      return <Minus className={`${iconClass} text-gray-500`} />
  }
}

const directionLabels: Record<FundMovement['direction'], string> = {
  increased: 'Added',
  decreased: 'Reduced',
  new: 'New position',
  exited: 'Exited',
}

const directionBgColors: Record<FundMovement['direction'], string> = {
  increased: 'bg-[hsl(var(--signal-buy))]/10',
  decreased: 'bg-[hsl(var(--signal-sell))]/10',
  new: 'bg-teal-500/10',
  exited: 'bg-gray-500/10',
}

export async function InstitutionalCard() {
  const supabase = await createClient()
  const movements = await getRecentInstitutionalMoves(supabase)

  const totalValue = movements.reduce((sum, m) => sum + m.valueChange, 0)

  return (
    <div className="bg-gradient-to-br from-emerald-500/5 via-background to-background border-2 border-emerald-500/20 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-lg font-bold text-foreground">13F Movements</h2>
        </div>
        {movements.length > 0 && (
          <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
            {formatValue(totalValue)}
          </span>
        )}
      </div>

      {movements.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
            <Building2 className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">No recent 13F filings</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Quarterly filings typically come 45 days after quarter end
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            Latest quarterly positions from major funds
          </p>

          <div className="space-y-2">
            {movements.map((move, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono font-bold text-sm text-primary">
                      {move.ticker}
                    </span>
                    <span className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md font-medium ${directionBgColors[move.direction]}`}>
                      <DirectionIcon direction={move.direction} />
                      {directionLabels[move.direction]}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {move.fundName}
                  </p>
                </div>
                <span className="text-sm font-bold text-foreground">
                  {formatValue(move.valueChange)}
                </span>
              </div>
            ))}
          </div>

          <Link
            href="/activity?source=13f"
            className="flex items-center justify-center gap-2 mt-4 py-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-semibold hover:bg-emerald-500/20 transition-colors"
          >
            View all 13F activity
            <ArrowRight className="w-4 h-4" />
          </Link>
        </>
      )}
    </div>
  )
}
