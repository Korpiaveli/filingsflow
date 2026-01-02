import { supabase } from './supabase'
import type { TransactionMetrics, ClusterInfo, EnhancedTransactionResult, QuarterlyActivity } from './types'

const CLUSTER_DAYS = 7
const PERCENTILE_DAYS = 30

export async function calculateTransactionMetrics(
  txn: EnhancedTransactionResult
): Promise<TransactionMetrics> {
  const [
    sizeMultiplier,
    percentileRank,
    daysSinceLastTrade,
    clusterInfo,
  ] = await Promise.all([
    calculateSizeMultiplier(txn.insiderCik, txn.totalValue),
    calculatePercentileRank(txn.totalValue, txn.transactionType),
    calculateDaysSinceLastTrade(txn.insiderCik, txn.id),
    getClusterInfo(txn.ticker, txn.transactionType),
  ])

  const ownershipChangePercent = calculateOwnershipChange(
    txn.shares ?? null,
    txn.sharesOwnedAfter ?? null
  )

  return {
    sizeMultiplier,
    percentileRank,
    daysSinceLastTrade,
    clusterInfo,
    ownershipChangePercent,
    is10b51Plan: txn.is10b51Plan ?? false,
    isOfficer: txn.isOfficer ?? false,
    isDirector: txn.isDirector ?? false,
    sharesOwnedAfter: txn.sharesOwnedAfter ?? null,
  }
}

async function calculateSizeMultiplier(
  insiderCik: string | undefined,
  totalValue: number | null
): Promise<number | null> {
  if (!insiderCik || !totalValue) return null

  const { data, error } = await supabase
    .from('insider_transactions')
    .select('total_value')
    .eq('insider_cik', insiderCik)
    .not('total_value', 'is', null)

  if (error || !data || data.length < 2) return null

  const values = data.map(d => Math.abs(d.total_value as number))
  const avg = values.reduce((a, b) => a + b, 0) / values.length

  if (avg === 0) return null
  return Math.abs(totalValue) / avg
}

async function calculatePercentileRank(
  totalValue: number | null,
  transactionType: string
): Promise<number | null> {
  if (!totalValue) return null

  const isBuy = ['P', 'A', 'M'].includes(transactionType)
  const types = isBuy ? ['P', 'A', 'M'] : ['S', 'D', 'F']

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - PERCENTILE_DAYS)

  const { data, error } = await supabase
    .from('insider_transactions')
    .select('total_value')
    .in('transaction_type', types)
    .gte('transaction_date', cutoffDate.toISOString().split('T')[0])
    .not('total_value', 'is', null)
    .order('total_value', { ascending: false })

  if (error || !data || data.length === 0) return null

  const values = data.map(d => Math.abs(d.total_value as number))
  const absValue = Math.abs(totalValue)
  const rank = values.filter(v => v > absValue).length
  return rank / values.length
}

async function calculateDaysSinceLastTrade(
  insiderCik: string | undefined,
  currentTxnId: string
): Promise<number | null> {
  if (!insiderCik) return null

  const { data, error } = await supabase
    .from('insider_transactions')
    .select('transaction_date')
    .eq('insider_cik', insiderCik)
    .neq('id', currentTxnId)
    .not('transaction_date', 'is', null)
    .order('transaction_date', { ascending: false })
    .limit(1)
    .single()

  if (error || !data?.transaction_date) return null

  const lastDate = new Date(data.transaction_date)
  const now = new Date()
  const diffMs = now.getTime() - lastDate.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

async function getClusterInfo(
  ticker: string,
  transactionType: string
): Promise<ClusterInfo | null> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - CLUSTER_DAYS)

  const isBuy = ['P', 'A', 'M'].includes(transactionType)
  const types = isBuy ? ['P', 'A', 'M'] : ['S', 'D', 'F']

  const { data, error } = await supabase
    .from('insider_transactions')
    .select('insider_cik, insider_name, insider_title, total_value')
    .eq('ticker', ticker)
    .in('transaction_type', types)
    .gte('transaction_date', cutoffDate.toISOString().split('T')[0])
    .not('total_value', 'is', null)

  if (error || !data || data.length === 0) return null

  const uniqueInsiders = new Map<string, { name: string; title: string | null; value: number }>()

  for (const txn of data) {
    const cik = txn.insider_cik as string
    const existing = uniqueInsiders.get(cik)
    const value = Math.abs(txn.total_value as number)

    if (existing) {
      existing.value += value
    } else {
      uniqueInsiders.set(cik, {
        name: txn.insider_name as string,
        title: txn.insider_title as string | null,
        value,
      })
    }
  }

  if (uniqueInsiders.size < 2) return null

  const participants = Array.from(uniqueInsiders.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

  const totalValue = participants.reduce((sum, p) => sum + p.value, 0)

  return {
    insiderCount: uniqueInsiders.size,
    totalValue,
    timeframeDays: CLUSTER_DAYS,
    participants,
  }
}

function calculateOwnershipChange(
  shares: number | null,
  sharesOwnedAfter: number | null
): number | null {
  if (!shares || !sharesOwnedAfter || sharesOwnedAfter === 0) return null

  const sharesBefore = sharesOwnedAfter - shares
  if (sharesBefore <= 0) return null

  return (shares / sharesBefore) * 100
}

export async function getQuarterlyActivity(ticker: string): Promise<QuarterlyActivity | null> {
  const { data: latest, error: latestError } = await supabase
    .from('holdings_13f')
    .select('report_date')
    .eq('ticker', ticker)
    .order('report_date', { ascending: false })
    .limit(1)
    .single()

  if (latestError || !latest) return null

  const currentQuarter = latest.report_date
  const prevQuarterDate = new Date(currentQuarter)
  prevQuarterDate.setMonth(prevQuarterDate.getMonth() - 3)
  const prevQuarter = prevQuarterDate.toISOString().split('T')[0]

  const [currentData, prevData] = await Promise.all([
    supabase
      .from('holdings_13f')
      .select('fund_cik, shares')
      .eq('ticker', ticker)
      .eq('report_date', currentQuarter),
    supabase
      .from('holdings_13f')
      .select('fund_cik, shares')
      .eq('ticker', ticker)
      .gte('report_date', prevQuarter)
      .lt('report_date', currentQuarter),
  ])

  if (currentData.error || prevData.error) return null

  const currentFunds = new Map(
    (currentData.data || []).map(h => [h.fund_cik, h.shares])
  )
  const prevFunds = new Map(
    (prevData.data || []).map(h => [h.fund_cik, h.shares])
  )

  let increased = 0
  let decreased = 0
  let newPositions = 0
  let exited = 0

  for (const [cik, shares] of currentFunds) {
    const prevShares = prevFunds.get(cik)
    if (prevShares === undefined) {
      newPositions++
    } else if (shares > prevShares) {
      increased++
    } else if (shares < prevShares) {
      decreased++
    }
  }

  for (const cik of prevFunds.keys()) {
    if (!currentFunds.has(cik)) {
      exited++
    }
  }

  return {
    increased,
    decreased,
    newPositions,
    exited,
    totalFunds: currentFunds.size,
  }
}

export async function getEnhancedWhaleData(
  ticker: string,
  limit: number = 15
): Promise<{
  whales: Array<{
    fundName: string | null
    fundCik: string
    shares: number
    valueUsd: number
    reportDate: string
    previousShares: number | null
    changePercent: number | null
    isNew: boolean
  }>
  activity: QuarterlyActivity | null
}> {
  const { data: latest, error: latestError } = await supabase
    .from('holdings_13f')
    .select('report_date')
    .eq('ticker', ticker)
    .order('report_date', { ascending: false })
    .limit(1)
    .single()

  if (latestError || !latest) {
    return { whales: [], activity: null }
  }

  const currentQuarter = latest.report_date
  const prevQuarterDate = new Date(currentQuarter)
  prevQuarterDate.setMonth(prevQuarterDate.getMonth() - 3)

  const [currentData, prevData, activity] = await Promise.all([
    supabase
      .from('holdings_13f')
      .select('fund_name, fund_cik, shares, value_usd, report_date')
      .eq('ticker', ticker)
      .eq('report_date', currentQuarter)
      .order('value_usd', { ascending: false })
      .limit(limit),
    supabase
      .from('holdings_13f')
      .select('fund_cik, shares')
      .eq('ticker', ticker)
      .gte('report_date', prevQuarterDate.toISOString().split('T')[0])
      .lt('report_date', currentQuarter),
    getQuarterlyActivity(ticker),
  ])

  if (currentData.error) {
    return { whales: [], activity: null }
  }

  const prevFunds = new Map(
    (prevData.data || []).map(h => [h.fund_cik, h.shares])
  )

  const whales = (currentData.data || []).map(h => {
    const prevShares = prevFunds.get(h.fund_cik) ?? null
    let changePercent: number | null = null
    let isNew = false

    if (prevShares === null) {
      isNew = true
    } else if (prevShares > 0) {
      changePercent = ((h.shares - prevShares) / prevShares) * 100
    }

    return {
      fundName: h.fund_name,
      fundCik: h.fund_cik,
      shares: h.shares,
      valueUsd: h.value_usd,
      reportDate: h.report_date,
      previousShares: prevShares,
      changePercent,
      isNew,
    }
  })

  return { whales, activity }
}

export function formatMetricsInsights(metrics: TransactionMetrics): string[] {
  const insights: string[] = []

  if (metrics.sizeMultiplier && metrics.sizeMultiplier >= 2) {
    insights.push(`${metrics.sizeMultiplier.toFixed(1)}x larger than their historical average`)
  } else if (metrics.sizeMultiplier && metrics.sizeMultiplier <= 0.5) {
    insights.push(`${(1 / metrics.sizeMultiplier).toFixed(1)}x smaller than their historical average`)
  }

  if (metrics.percentileRank !== null && metrics.percentileRank <= 0.05) {
    const pct = (metrics.percentileRank * 100).toFixed(1)
    insights.push(`Top ${pct}% by value this month`)
  }

  if (metrics.daysSinceLastTrade !== null && metrics.daysSinceLastTrade > 180) {
    const months = Math.floor(metrics.daysSinceLastTrade / 30)
    insights.push(`First trade in ${months} months`)
  }

  if (metrics.clusterInfo && metrics.clusterInfo.insiderCount >= 2) {
    insights.push(
      `${metrics.clusterInfo.insiderCount} insiders traded this week`
    )
  }

  if (!metrics.is10b51Plan) {
    insights.push('Not a 10b5-1 pre-planned trade')
  }

  if (metrics.ownershipChangePercent !== null) {
    const sign = metrics.ownershipChangePercent > 0 ? '+' : ''
    if (Math.abs(metrics.ownershipChangePercent) >= 10) {
      insights.push(`${sign}${metrics.ownershipChangePercent.toFixed(0)}% position change`)
    }
  }

  return insights
}

export function formatRecency(days: number | null): string {
  if (days === null) return ''
  if (days === 0) return 'Traded today'
  if (days === 1) return 'Traded yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  if (days < 365) return `${Math.floor(days / 30)} months ago`
  return `${Math.floor(days / 365)} years ago`
}
