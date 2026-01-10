import { createClient } from '@supabase/supabase-js'
import { priceFetcher } from '@/lib/prices/fetcher'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface ClusterAction {
  id: string
  cluster_id: string
  ticker: string
  direction: 'buy' | 'sell' | 'mixed'
  action_date: string
  avg_entry_price: number | null
}

interface PerformanceRecord {
  cluster_action_id: string
  current_price: number
  price_change_pct: number
  days_since_action: number
}

export class ClusterPerformanceTracker {
  private supabase

  constructor() {
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured')
    }
    this.supabase = createClient(supabaseUrl, supabaseServiceKey)
  }

  async updateAllClusterPerformance() {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 90)

    const { data: actions, error } = await this.supabase
      .from('cluster_actions')
      .select('id, cluster_id, ticker, direction, action_date, avg_entry_price')
      .gte('action_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('action_date', { ascending: false })

    if (error) {
      console.error('Failed to fetch cluster actions:', error)
      return
    }

    const tickerGroups = new Map<string, ClusterAction[]>()
    for (const action of actions || []) {
      const existing = tickerGroups.get(action.ticker) || []
      existing.push(action)
      tickerGroups.set(action.ticker, existing)
    }

    for (const [ticker, tickerActions] of tickerGroups) {
      try {
        const currentPrice = await priceFetcher.getCurrentPrice(ticker)
        if (!currentPrice) continue

        for (const action of tickerActions) {
          await this.recordPerformance(action, currentPrice.price)
        }

        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        console.error(`Failed to update performance for ${ticker}:`, error)
      }
    }

    await this.updateClusterAggregateStats()
  }

  private async recordPerformance(action: ClusterAction, currentPrice: number) {
    const actionDate = new Date(action.action_date)
    const today = new Date()
    const daysSinceAction = Math.floor(
      (today.getTime() - actionDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (!action.avg_entry_price || action.avg_entry_price === 0) {
      return
    }

    let priceChangePct = ((currentPrice - action.avg_entry_price) / action.avg_entry_price) * 100

    if (action.direction === 'sell') {
      priceChangePct = -priceChangePct
    }

    const record: PerformanceRecord = {
      cluster_action_id: action.id,
      current_price: currentPrice,
      price_change_pct: priceChangePct,
      days_since_action: daysSinceAction,
    }

    await this.supabase
      .from('cluster_performance')
      .upsert(record, {
        onConflict: 'cluster_action_id,days_since_action',
      })
  }

  private async updateClusterAggregateStats() {
    const { data: clusters } = await this.supabase
      .from('cluster_definitions')
      .select('id')
      .eq('is_active', true)

    for (const cluster of clusters || []) {
      try {
        await this.updateSingleClusterStats(cluster.id)
      } catch (error) {
        console.error(`Failed to update stats for cluster ${cluster.id}:`, error)
      }
    }
  }

  private async updateSingleClusterStats(clusterId: string) {
    const { data: actions } = await this.supabase
      .from('cluster_actions')
      .select('id, action_date')
      .eq('cluster_id', clusterId)

    if (!actions || actions.length === 0) return

    const actionIds = actions.map(a => a.id)

    const { data: performance30d } = await this.supabase
      .from('cluster_performance')
      .select('price_change_pct')
      .in('cluster_action_id', actionIds)
      .gte('days_since_action', 25)
      .lte('days_since_action', 35)

    const { data: performance90d } = await this.supabase
      .from('cluster_performance')
      .select('price_change_pct')
      .in('cluster_action_id', actionIds)
      .gte('days_since_action', 85)
      .lte('days_since_action', 95)

    const avg30d = this.calculateAverage(performance30d?.map(p => p.price_change_pct) || [])
    const avg90d = this.calculateAverage(performance90d?.map(p => p.price_change_pct) || [])

    const { data: allPerformance } = await this.supabase
      .from('cluster_performance')
      .select('price_change_pct')
      .in('cluster_action_id', actionIds)
      .gte('days_since_action', 7)

    const winCount = (allPerformance || []).filter(p => p.price_change_pct > 0).length
    const totalCount = (allPerformance || []).length
    const winRate = totalCount > 0 ? winCount / totalCount : null

    await this.supabase
      .from('cluster_definitions')
      .update({
        avg_return_30d: avg30d,
        avg_return_90d: avg90d,
        win_rate: winRate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', clusterId)
  }

  private calculateAverage(values: number[]): number | null {
    if (values.length === 0) return null
    return values.reduce((sum, v) => sum + v, 0) / values.length
  }

  async getClusterPerformanceSummary(clusterId: string): Promise<{
    avgReturn30d: number | null
    avgReturn90d: number | null
    winRate: number | null
    totalActions: number
    recentPerformance: Array<{
      ticker: string
      direction: string
      actionDate: string
      currentReturn: number | null
    }>
  }> {
    const { data: cluster } = await this.supabase
      .from('cluster_definitions')
      .select('avg_return_30d, avg_return_90d, win_rate')
      .eq('id', clusterId)
      .single()

    const { data: actions } = await this.supabase
      .from('cluster_actions')
      .select('id, ticker, direction, action_date')
      .eq('cluster_id', clusterId)
      .order('action_date', { ascending: false })
      .limit(5)

    const recentPerformance = await Promise.all(
      (actions || []).map(async (action) => {
        const { data: perf } = await this.supabase
          .from('cluster_performance')
          .select('price_change_pct')
          .eq('cluster_action_id', action.id)
          .order('days_since_action', { ascending: false })
          .limit(1)
          .single()

        return {
          ticker: action.ticker,
          direction: action.direction,
          actionDate: action.action_date,
          currentReturn: perf?.price_change_pct || null,
        }
      })
    )

    const { count } = await this.supabase
      .from('cluster_actions')
      .select('id', { count: 'exact', head: true })
      .eq('cluster_id', clusterId)

    return {
      avgReturn30d: cluster?.avg_return_30d || null,
      avgReturn90d: cluster?.avg_return_90d || null,
      winRate: cluster?.win_rate || null,
      totalActions: count || 0,
      recentPerformance,
    }
  }
}

export const performanceTracker = new ClusterPerformanceTracker()
