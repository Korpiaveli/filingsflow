import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { subDays, format } from 'date-fns'
import { Landmark, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react'

interface CongressTrade {
  memberName: string
  ticker: string
  transactionType: string
  amountRange: string
  disclosureDate: string
  chamber: 'house' | 'senate'
}

async function getRecentCongressTrades(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never
): Promise<{ trades: CongressTrade[]; totalThisWeek: number }> {
  const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd')

  const { data: trades, count } = await supabase
    .from('congressional_transactions')
    .select('member_name, ticker, transaction_type, amount_range, disclosure_date, chamber', { count: 'exact' })
    .gte('disclosure_date', weekAgo)
    .not('ticker', 'is', null)
    .order('disclosure_date', { ascending: false })
    .limit(3)

  if (!trades) return { trades: [], totalThisWeek: 0 }

  return {
    trades: trades.map(t => ({
      memberName: t.member_name,
      ticker: t.ticker || '',
      transactionType: t.transaction_type,
      amountRange: t.amount_range,
      disclosureDate: t.disclosure_date,
      chamber: t.chamber as 'house' | 'senate',
    })),
    totalThisWeek: count || 0,
  }
}

export async function CongressCard() {
  const supabase = await createClient()
  const { trades, totalThisWeek } = await getRecentCongressTrades(supabase)

  const buys = trades.filter(t => t.transactionType.toLowerCase().includes('purchase')).length
  const sells = trades.filter(t => t.transactionType.toLowerCase().includes('sale')).length

  return (
    <div className="bg-gradient-to-br from-indigo-500/5 via-background to-background border-2 border-indigo-500/20 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <Landmark className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Congress Trades</h2>
        </div>
        {totalThisWeek > 0 && (
          <span className="text-xs px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold">
            {totalThisWeek} this week
          </span>
        )}
      </div>

      {trades.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
            <Landmark className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">No congressional trades this week</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Check back for new disclosures</p>
        </div>
      ) : (
        <>
          <div className="flex gap-3 mb-4">
            <div className="flex-1 bg-[hsl(var(--signal-buy))]/10 rounded-lg p-2 text-center">
              <div className="flex items-center justify-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-[hsl(var(--signal-buy))]" />
                <span className="text-lg font-bold text-[hsl(var(--signal-buy))]">{buys}</span>
              </div>
              <span className="text-xs text-muted-foreground">Buys</span>
            </div>
            <div className="flex-1 bg-[hsl(var(--signal-sell))]/10 rounded-lg p-2 text-center">
              <div className="flex items-center justify-center gap-1">
                <TrendingDown className="w-3.5 h-3.5 text-[hsl(var(--signal-sell))]" />
                <span className="text-lg font-bold text-[hsl(var(--signal-sell))]">{sells}</span>
              </div>
              <span className="text-xs text-muted-foreground">Sells</span>
            </div>
          </div>

          <div className="space-y-2">
            {trades.map((trade, i) => {
              const isBuy = trade.transactionType.toLowerCase().includes('purchase')
              return (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded-md font-semibold ${
                        trade.chamber === 'senate'
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      }`}>
                        {trade.chamber === 'senate' ? 'SEN' : 'REP'}
                      </span>
                      <span className="font-semibold text-sm truncate">{trade.memberName}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-medium ${isBuy ? 'text-[hsl(var(--signal-buy))]' : 'text-[hsl(var(--signal-sell))]'}`}>
                        {isBuy ? '▲' : '▼'}
                      </span>
                      <span className="font-mono text-xs font-bold text-primary">{trade.ticker}</span>
                      <span className="text-xs text-muted-foreground">• {trade.amountRange}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <Link
            href="/activity?source=congress"
            className="flex items-center justify-center gap-2 mt-4 py-2.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-sm font-semibold hover:bg-indigo-500/20 transition-colors"
          >
            View all trades
            <ArrowRight className="w-4 h-4" />
          </Link>
        </>
      )}
    </div>
  )
}
