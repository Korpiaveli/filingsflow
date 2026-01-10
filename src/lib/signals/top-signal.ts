import { createClient } from '@/lib/supabase/server'
import { formatSignalValue, type SignalType } from './significance'

export interface TopSignal {
  ticker: string
  companyName: string
  signalType: SignalType
  headline: string
  context: string
  value: number
  direction: 'buy' | 'sell'
  insiderName: string
  insiderTitle: string | null
  transactionDate: Date
  filingId: string
  significanceScore: number
  isCluster: boolean
  clusterCount: number
  isFirstInMonths: boolean
  monthsSinceLast: number | null
}

export interface WatchlistPulseItem {
  ticker: string
  companyName: string | null
  insiderBuys30d: number
  insiderSells30d: number
  netFlow30d: number
  lastInsiderDate: Date | null
  lastInsiderName: string | null
  lastInsiderAction: 'bought' | 'sold' | null
  hasCluster: boolean
  hasCongressTrade: boolean
  has13fActivity: boolean
  activityLevel: 'high' | 'medium' | 'low' | 'none'
}

export interface TrendingTicker {
  ticker: string
  companyName: string | null
  transactionCount: number
  uniqueInsiders: number
  totalBuyValue: number
  totalSellValue: number
  netFlow: number
  hasCluster: boolean
  topInsiderName: string | null
  topInsiderTitle: string | null
}

export async function fetchTopSignal(userId?: string): Promise<TopSignal | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_top_signal', {
    p_user_id: userId,
  })

  if (error || !data || data.length === 0) {
    return null
  }

  const row = data[0]!
  return {
    ticker: row.ticker,
    companyName: row.company_name || 'Unknown',
    signalType: row.signal_type as SignalType,
    headline: row.headline,
    context: row.context,
    value: Number(row.value) || 0,
    direction: row.direction as 'buy' | 'sell',
    insiderName: row.insider_name,
    insiderTitle: row.insider_title,
    transactionDate: new Date(row.transaction_date),
    filingId: row.filing_id,
    significanceScore: row.significance_score,
    isCluster: row.is_cluster,
    clusterCount: row.cluster_count,
    isFirstInMonths: row.is_first_in_months,
    monthsSinceLast: row.months_since_last,
  }
}

export async function fetchWatchlistPulse(userId: string): Promise<WatchlistPulseItem[]> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_watchlist_pulse', {
    p_user_id: userId,
  })

  if (error || !data) {
    return []
  }

  return data.map((row: Record<string, unknown>) => ({
    ticker: row.ticker as string,
    companyName: row.company_name as string | null,
    insiderBuys30d: row.insider_buys_30d as number,
    insiderSells30d: row.insider_sells_30d as number,
    netFlow30d: Number(row.net_flow_30d) || 0,
    lastInsiderDate: row.last_insider_date ? new Date(row.last_insider_date as string) : null,
    lastInsiderName: row.last_insider_name as string | null,
    lastInsiderAction: row.last_insider_action as 'bought' | 'sold' | null,
    hasCluster: row.has_cluster as boolean,
    hasCongressTrade: row.has_congress_trade as boolean,
    has13fActivity: row.has_13f_activity as boolean,
    activityLevel: row.activity_level as 'high' | 'medium' | 'low' | 'none',
  }))
}

export async function fetchTrendingTickers(limit = 10): Promise<TrendingTicker[]> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_trending_tickers', {
    p_limit: limit,
  })

  if (error || !data) {
    return []
  }

  return data.map((row: Record<string, unknown>) => ({
    ticker: row.ticker as string,
    companyName: row.company_name as string | null,
    transactionCount: row.transaction_count as number,
    uniqueInsiders: row.unique_insiders as number,
    totalBuyValue: Number(row.total_buy_value) || 0,
    totalSellValue: Number(row.total_sell_value) || 0,
    netFlow: Number(row.net_flow) || 0,
    hasCluster: row.has_cluster as boolean,
    topInsiderName: row.top_insider_name as string | null,
    topInsiderTitle: row.top_insider_title as string | null,
  }))
}

export { formatSignalValue }
