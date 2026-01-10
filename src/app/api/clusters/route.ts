import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  clusterDetector,
  type DetectedCluster,
  type ClusterType,
} from '@/lib/clusters'

export type { DetectedCluster, ClusterType }

export interface ClustersResponse {
  clusters: DetectedCluster[]
  meta: {
    days: number
    minParticipants: number
    minValue: number
    totalClusters: number
    byType: Record<ClusterType, number>
  }
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
  const minParticipants = parseInt(searchParams.get('minParticipants') || searchParams.get('minInsiders') || '3', 10)
  const minValue = parseInt(searchParams.get('minValue') || '100000', 10)
  const clusterType = searchParams.get('type') as ClusterType | null

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startDateStr = startDate.toISOString().split('T')[0]

  const [insiderResult, congressResult] = await Promise.all([
    supabase
      .from('insider_transactions')
      .select('*')
      .gte('transaction_date', startDateStr)
      .gte('total_value', minValue)
      .order('ticker')
      .order('transaction_date', { ascending: true }),
    supabase
      .from('congressional_transactions')
      .select('*')
      .gte('transaction_date', startDateStr)
      .order('ticker')
      .order('transaction_date', { ascending: true }),
  ])

  if (insiderResult.error) {
    return NextResponse.json({ error: insiderResult.error.message }, { status: 500 })
  }

  const insiderTransactions = insiderResult.data || []
  const congressTransactions = congressResult.data || []

  let clusters = clusterDetector.detectClusters(
    insiderTransactions,
    congressTransactions,
    [],
    { days, minParticipants, minValue }
  )

  if (clusterType) {
    clusters = clusters.filter(c => c.type === clusterType)
  }

  const byType: Record<ClusterType, number> = {
    company_insider: 0,
    cross_company_exec: 0,
    congressional: 0,
    institutional: 0,
    mixed_influential: 0,
  }

  for (const cluster of clusters) {
    byType[cluster.type]++
  }

  return NextResponse.json({
    clusters: clusters.slice(0, 30),
    meta: {
      days,
      minParticipants,
      minValue,
      totalClusters: clusters.length,
      byType,
    },
  } satisfies ClustersResponse)
}
