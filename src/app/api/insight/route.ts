import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { SupabaseClient } from '@supabase/supabase-js'

export interface QuickInsight {
  ticker: string
  sentiment: 'bullish' | 'bearish' | 'neutral'
  activityLevel: 'high' | 'moderate' | 'light' | 'minimal'
  insider: {
    totalBuys: number
    totalSells: number
    buyValue: number
    sellValue: number
    netValue: number
    uniqueInsiders: number
    latestTransaction: {
      insiderName: string
      type: string
      value: number
      date: string
    } | null
  }
  institutional: {
    increased: number
    decreased: number
    newPositions: number
    exited: number
  } | null
  filings: {
    recentCount: number
    latestSummary: string | null
    latestFormType: string | null
    latestDate: string | null
  }
  news: {
    count: number
    has8K: boolean
    headlines: Array<{
      title: string
      url: string
      source: string
      publishedAt: string
    }>
  }
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const ticker = searchParams.get('ticker')?.toUpperCase()

  if (!ticker) {
    return NextResponse.json({ error: 'Ticker is required' }, { status: 400 })
  }

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const twentyFourHoursAgo = new Date()
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

  const [insiderRes, filingRes, newsRes, institutionalRes, filing8KRes] = await Promise.all([
    supabase
      .from('insider_transactions')
      .select('insider_name, insider_cik, transaction_type, total_value, transaction_date')
      .eq('ticker', ticker)
      .gte('transaction_date', sevenDaysAgo.toISOString().split('T')[0])
      .order('transaction_date', { ascending: false }),

    supabase
      .from('filings')
      .select('form_type, filed_at, ai_summary', { count: 'exact' })
      .eq('ticker', ticker)
      .gte('filed_at', thirtyDaysAgo.toISOString())
      .order('filed_at', { ascending: false })
      .limit(1),

    (supabase as unknown as SupabaseClient)
      .from('news_cache')
      .select('title, url, source, published_at')
      .eq('ticker', ticker)
      .gte('fetched_at', twentyFourHoursAgo.toISOString())
      .order('published_at', { ascending: false })
      .limit(5),

    getInstitutionalActivity(supabase, ticker),

    supabase
      .from('filings')
      .select('id')
      .eq('ticker', ticker)
      .eq('form_type', '8-K')
      .gte('filed_at', sevenDaysAgo.toISOString())
      .limit(1),
  ])

  const transactions = insiderRes.data || []
  const buys = transactions.filter(t => ['P', 'A', 'M'].includes(t.transaction_type))
  const sells = transactions.filter(t => ['S', 'D', 'F'].includes(t.transaction_type))

  const buyValue = buys.reduce((sum, t) => sum + Math.abs(t.total_value || 0), 0)
  const sellValue = sells.reduce((sum, t) => sum + Math.abs(t.total_value || 0), 0)
  const netValue = buyValue - sellValue

  const uniqueInsiders = new Set(transactions.map(t => t.insider_cik).filter(Boolean))
  const latest = transactions[0]

  const latestFiling = filingRes.data?.[0]
  const filingCount = filingRes.count || 0

  const newsItems = (newsRes.data || []) as Array<{ title: string; url: string; source: string; published_at: string }>
  const has8K = !filing8KRes.error && (filing8KRes.data?.length || 0) > 0

  const totalTxns = buys.length + sells.length
  const totalValue = buyValue + sellValue

  let activityLevel: QuickInsight['activityLevel'] = 'minimal'
  if (totalTxns >= 5 || totalValue >= 10_000_000 || filingCount >= 10) {
    activityLevel = 'high'
  } else if (totalTxns >= 2 || totalValue >= 1_000_000 || filingCount >= 3) {
    activityLevel = 'moderate'
  } else if (totalTxns >= 1 || filingCount >= 1) {
    activityLevel = 'light'
  }

  let sentiment: QuickInsight['sentiment'] = 'neutral'
  if (netValue > 100_000) sentiment = 'bullish'
  else if (netValue < -100_000) sentiment = 'bearish'

  const insight: QuickInsight = {
    ticker,
    sentiment,
    activityLevel,
    insider: {
      totalBuys: buys.length,
      totalSells: sells.length,
      buyValue,
      sellValue,
      netValue,
      uniqueInsiders: uniqueInsiders.size,
      latestTransaction: latest ? {
        insiderName: latest.insider_name || 'Unknown',
        type: getTransactionAction(latest.transaction_type),
        value: Math.abs(latest.total_value || 0),
        date: latest.transaction_date || '',
      } : null,
    },
    institutional: institutionalRes,
    filings: {
      recentCount: filingCount,
      latestSummary: latestFiling?.ai_summary || null,
      latestFormType: latestFiling?.form_type || null,
      latestDate: latestFiling?.filed_at || null,
    },
    news: {
      count: newsItems.length,
      has8K,
      headlines: newsItems.map(n => ({
        title: n.title,
        url: n.url,
        source: n.source,
        publishedAt: n.published_at,
      })),
    },
  }

  return NextResponse.json(insight)
}

async function getInstitutionalActivity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ticker: string
): Promise<QuickInsight['institutional']> {
  const { data: latest } = await supabase
    .from('holdings_13f')
    .select('report_date')
    .eq('ticker', ticker)
    .order('report_date', { ascending: false })
    .limit(1)
    .single()

  if (!latest) return null

  const currentQuarter = latest.report_date
  const prevQuarterDate = new Date(currentQuarter)
  prevQuarterDate.setMonth(prevQuarterDate.getMonth() - 3)
  const prevQuarter = prevQuarterDate.toISOString().split('T')[0]

  const [currentRes, prevRes] = await Promise.all([
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

  if (currentRes.error || prevRes.error) return null

  const currentFunds = new Map((currentRes.data || []).map(h => [h.fund_cik, h.shares]))
  const prevFunds = new Map((prevRes.data || []).map(h => [h.fund_cik, h.shares]))

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
    if (!currentFunds.has(cik)) exited++
  }

  return { increased, decreased, newPositions, exited }
}

function getTransactionAction(code: string): string {
  const actions: Record<string, string> = {
    P: 'Purchase',
    S: 'Sale',
    A: 'Grant',
    D: 'Disposition',
    M: 'Exercise',
    F: 'Tax Payment',
    G: 'Gift',
  }
  return actions[code] || code
}
