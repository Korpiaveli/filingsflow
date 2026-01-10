import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database'

type DbClusterType = Database['public']['Tables']['cluster_definitions']['Row']['type']
type ClusterType = DbClusterType

export interface CorrelatedClusterResponse {
  id: string
  name: string
  description: string
  type: DbClusterType
  correlationScore: number
  totalOccurrences: number
  avgReturn30d: number | null
  avgReturn90d: number | null
  winRate: number | null
  isActive: boolean
  lastActivityAt: string
  memberCount: number
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

  if (!profile || !['pro', 'premium'].includes(profile.subscription_tier)) {
    return NextResponse.json(
      { error: 'Pro subscription required for correlated cluster tracking' },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '20', 10)
  const type = searchParams.get('type') as ClusterType | null
  const sortBy = searchParams.get('sortBy') || 'correlation'

  let query = supabase
    .from('cluster_definitions')
    .select(`
      id,
      name,
      description,
      type,
      correlation_score,
      total_occurrences,
      avg_return_30d,
      avg_return_90d,
      win_rate,
      is_active,
      last_activity_at,
      cluster_members(count)
    `)
    .eq('is_active', true)

  if (type) {
    query = query.eq('type', type)
  }

  if (sortBy === 'performance') {
    query = query.order('avg_return_30d', { ascending: false, nullsFirst: false })
  } else if (sortBy === 'winRate') {
    query = query.order('win_rate', { ascending: false, nullsFirst: false })
  } else if (sortBy === 'activity') {
    query = query.order('total_occurrences', { ascending: false })
  } else {
    query = query.order('correlation_score', { ascending: false })
  }

  query = query.limit(limit)

  const { data: clusters, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const response: CorrelatedClusterResponse[] = (clusters || []).map(c => ({
    id: c.id,
    name: c.name || 'Unnamed Cluster',
    description: c.description || '',
    type: c.type,
    correlationScore: c.correlation_score,
    totalOccurrences: c.total_occurrences,
    avgReturn30d: c.avg_return_30d,
    avgReturn90d: c.avg_return_90d,
    winRate: c.win_rate,
    isActive: c.is_active,
    lastActivityAt: c.last_activity_at,
    memberCount: (c.cluster_members as { count: number }[])?.[0]?.count || 0,
  }))

  return NextResponse.json({
    clusters: response,
    meta: {
      total: response.length,
      sortBy,
      type,
    },
  })
}
