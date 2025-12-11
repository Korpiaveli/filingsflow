import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export interface InsiderCluster {
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

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('subscription_tier')
    .eq('id', user.id)
    .single()

  if (!profile || profile.subscription_tier === 'free') {
    return NextResponse.json(
      { error: 'Pro subscription required for cluster detection' },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '7', 10)
  const minInsiders = parseInt(searchParams.get('minInsiders') || '3', 10)
  const minValue = parseInt(searchParams.get('minValue') || '100000', 10)

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data: transactions, error } = await supabase
    .from('insider_transactions')
    .select('*')
    .gte('transaction_date', startDate.toISOString().split('T')[0])
    .gte('total_value', minValue)
    .order('ticker')
    .order('transaction_date', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!transactions?.length) {
    return NextResponse.json({ clusters: [] })
  }

  const tickerGroups = new Map<string, typeof transactions>()
  for (const txn of transactions) {
    if (!txn.ticker) continue
    const existing = tickerGroups.get(txn.ticker) || []
    existing.push(txn)
    tickerGroups.set(txn.ticker, existing)
  }

  const clusters: InsiderCluster[] = []

  for (const [ticker, txns] of tickerGroups) {
    const uniqueInsiders = new Set(txns.map(t => t.insider_cik))

    if (uniqueInsiders.size < minInsiders) continue

    const dates = txns.map(t => t.transaction_date).filter(Boolean).sort()
    const startDate = dates[0] || ''
    const endDate = dates[dates.length - 1] || ''

    if (!startDate || !endDate) continue

    const daysDiff = Math.abs(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysDiff > days) continue

    const buys = txns.filter(t => (t.shares ?? 0) > 0)
    const sells = txns.filter(t => (t.shares ?? 0) < 0)

    let transactionType: 'buy' | 'sell' | 'mixed' = 'mixed'
    if (buys.length > 0 && sells.length === 0) transactionType = 'buy'
    if (sells.length > 0 && buys.length === 0) transactionType = 'sell'

    const totalValue = txns.reduce((sum, t) => sum + Math.abs(t.total_value ?? 0), 0)

    clusters.push({
      ticker,
      companyName: txns[0]?.company_name || ticker,
      insiderCount: uniqueInsiders.size,
      totalValue,
      transactionType,
      transactions: txns.slice(0, 10).map(t => ({
        insiderName: t.insider_name || 'Unknown',
        insiderTitle: t.insider_title || '',
        shares: t.shares ?? 0,
        value: Math.abs(t.total_value ?? 0),
        date: t.transaction_date || '',
      })),
      startDate,
      endDate,
    })
  }

  clusters.sort((a, b) => b.totalValue - a.totalValue)

  return NextResponse.json({
    clusters: clusters.slice(0, 20),
    meta: {
      days,
      minInsiders,
      minValue,
      totalClusters: clusters.length,
    },
  })
}
