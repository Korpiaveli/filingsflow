import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { performanceTracker } from '@/lib/clusters/performance-tracker'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  if (!profile || !['pro', 'premium'].includes(profile.subscription_tier)) {
    return NextResponse.json(
      { error: 'Pro subscription required' },
      { status: 403 }
    )
  }

  const { id } = await params

  const { data: cluster, error: clusterError } = await supabase
    .from('cluster_definitions')
    .select('*')
    .eq('id', id)
    .single()

  if (clusterError || !cluster) {
    return NextResponse.json({ error: 'Cluster not found' }, { status: 404 })
  }

  const [membersResult, actionsResult, performanceSummary] = await Promise.all([
    supabase
      .from('cluster_members')
      .select('*')
      .eq('cluster_id', id)
      .order('total_value', { ascending: false }),
    supabase
      .from('cluster_actions')
      .select(`
        id,
        ticker,
        company_name,
        direction,
        action_date,
        participant_count,
        total_value,
        avg_entry_price
      `)
      .eq('cluster_id', id)
      .order('action_date', { ascending: false })
      .limit(20),
    performanceTracker.getClusterPerformanceSummary(id),
  ])

  const recentActionsWithPerformance = await Promise.all(
    (actionsResult.data || []).map(async (action) => {
      const { data: perf } = await supabase
        .from('cluster_performance')
        .select('current_price, price_change_pct, days_since_action')
        .eq('cluster_action_id', action.id)
        .order('days_since_action', { ascending: false })
        .limit(1)

      return {
        ...action,
        currentPerformance: perf?.[0] || null,
      }
    })
  )

  return NextResponse.json({
    cluster: {
      id: cluster.id,
      name: cluster.name,
      description: cluster.description,
      type: cluster.type,
      correlationScore: cluster.correlation_score,
      totalOccurrences: cluster.total_occurrences,
      firstDetectedAt: cluster.first_detected_at,
      lastActivityAt: cluster.last_activity_at,
      isActive: cluster.is_active,
    },
    members: (membersResult.data || []).map(m => ({
      id: m.id,
      name: m.participant_name,
      cik: m.participant_cik,
      type: m.participant_type,
      affiliation: m.affiliation,
      transactionCount: m.transaction_count,
      totalValue: m.total_value,
      lastActiveAt: m.last_active_at,
    })),
    recentActions: recentActionsWithPerformance.map(a => ({
      id: a.id,
      ticker: a.ticker,
      companyName: a.company_name,
      direction: a.direction,
      actionDate: a.action_date,
      participantCount: a.participant_count,
      totalValue: a.total_value,
      avgEntryPrice: a.avg_entry_price,
      currentPerformance: a.currentPerformance,
    })),
    performance: performanceSummary,
  })
}
