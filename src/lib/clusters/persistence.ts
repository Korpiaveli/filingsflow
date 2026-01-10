import { createClient } from '@supabase/supabase-js'
import type { DetectedCluster, ClusterParticipant, ClusterType } from './types'
import { createHash } from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface ClusterDefinition {
  id: string
  name: string | null
  description: string | null
  type: ClusterType
  member_fingerprint: string
  first_detected_at: string
  last_activity_at: string
  correlation_score: number
  total_occurrences: number
  avg_return_30d: number | null
  avg_return_90d: number | null
  win_rate: number | null
  is_active: boolean
}

interface ClusterMember {
  id: string
  cluster_id: string
  participant_cik: string
  participant_name: string
  participant_type: string
  affiliation: string | null
  transaction_count: number
  total_value: number
}

interface ClusterAction {
  id: string
  cluster_id: string
  ticker: string
  company_name: string | null
  direction: 'buy' | 'sell' | 'mixed'
  action_date: string
  participant_count: number
  total_value: number
  avg_entry_price: number | null
}

export class ClusterPersistence {
  private supabase

  constructor() {
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured')
    }
    this.supabase = createClient(supabaseUrl, supabaseServiceKey)
  }

  generateFingerprint(participants: ClusterParticipant[]): string {
    const sortedCiks = participants
      .map(p => this.extractCik(p))
      .filter(Boolean)
      .sort()
      .join('|')

    return createHash('sha256').update(sortedCiks).digest('hex').substring(0, 32)
  }

  private extractCik(participant: ClusterParticipant): string {
    const normalized = participant.name.toLowerCase().replace(/[^a-z0-9]/g, '')
    return normalized
  }

  async findOrCreateCluster(
    detected: DetectedCluster,
    participants: ClusterParticipant[]
  ): Promise<{ clusterId: string; isNew: boolean }> {
    const fingerprint = this.generateFingerprint(participants)

    const { data: existing } = await this.supabase
      .from('cluster_definitions')
      .select('id')
      .eq('member_fingerprint', fingerprint)
      .single()

    if (existing) {
      return { clusterId: existing.id, isNew: false }
    }

    const name = this.generateClusterName(detected.type, participants)
    const description = detected.description

    const { data: created, error } = await this.supabase
      .from('cluster_definitions')
      .insert({
        name,
        description,
        type: detected.type,
        member_fingerprint: fingerprint,
        correlation_score: 0,
        total_occurrences: 1,
      })
      .select('id')
      .single()

    if (error) throw error

    await this.addClusterMembers(created.id, participants)

    return { clusterId: created.id, isNew: true }
  }

  private generateClusterName(type: ClusterType, participants: ClusterParticipant[]): string {
    const count = new Set(participants.map(p => p.name)).size

    switch (type) {
      case 'company_insider': {
        const affiliation = participants[0]?.affiliation || 'Unknown'
        return `${affiliation} Leadership`
      }
      case 'cross_company_exec': {
        const companies = [...new Set(participants.map(p => p.affiliation))]
        if (companies.length <= 2) {
          return `${companies.join(' & ')} Executives`
        }
        return `${count}-Company Executive Group`
      }
      case 'congressional': {
        const parties = [...new Set(participants.map(p => {
          const match = p.title?.match(/^([DR])-/)
          return match?.[1]
        }).filter(Boolean))]
        if (parties.length === 1) {
          return `${parties[0] === 'D' ? 'Democratic' : 'Republican'} Congressional Bloc`
        }
        return `Bipartisan Congressional Group`
      }
      case 'institutional':
        return `Institutional Investor Coalition`
      case 'mixed_influential':
        return `Cross-Sector Influential Group`
    }
  }

  private async addClusterMembers(clusterId: string, participants: ClusterParticipant[]) {
    const uniqueMembers = new Map<string, ClusterParticipant>()
    for (const p of participants) {
      const key = this.extractCik(p)
      if (!uniqueMembers.has(key)) {
        uniqueMembers.set(key, p)
      }
    }

    const members = Array.from(uniqueMembers.entries()).map(([cik, p]) => ({
      cluster_id: clusterId,
      participant_cik: cik,
      participant_name: p.name,
      participant_type: this.mapAffiliationType(p.affiliationType),
      affiliation: p.affiliation,
      transaction_count: 1,
      total_value: p.value,
    }))

    await this.supabase.from('cluster_members').insert(members)
  }

  private mapAffiliationType(type: ClusterParticipant['affiliationType']): string {
    const mapping: Record<string, string> = {
      company_officer: 'officer',
      company_director: 'director',
      congress: 'congress',
      institution: 'institution',
      '10%_owner': '10%_owner',
      unknown: 'unknown',
    }
    return mapping[type] || 'unknown'
  }

  async recordClusterAction(
    clusterId: string,
    detected: DetectedCluster,
    participants: ClusterParticipant[]
  ): Promise<string> {
    const totalValue = participants.reduce((sum, p) => sum + p.value, 0)
    const avgPrice = participants.reduce((sum, p) => sum + (p.value / Math.max(p.shares, 1)), 0) / participants.length

    const { data: action, error } = await this.supabase
      .from('cluster_actions')
      .insert({
        cluster_id: clusterId,
        ticker: detected.ticker,
        company_name: detected.companyName,
        direction: detected.direction,
        action_date: detected.startDate,
        participant_count: participants.length,
        total_value: totalValue,
        avg_entry_price: isFinite(avgPrice) ? avgPrice : null,
      })
      .select('id')
      .single()

    if (error) throw error

    await this.recordClusterTransactions(action.id, participants)

    return action.id
  }

  private async recordClusterTransactions(actionId: string, participants: ClusterParticipant[]) {
    const transactions = participants.map(p => ({
      cluster_action_id: actionId,
      participant_cik: this.extractCik(p),
      participant_name: p.name,
      transaction_type: p.transactionType,
      value: p.value,
      shares: p.shares,
      transaction_date: p.date,
    }))

    await this.supabase.from('cluster_transactions').insert(transactions)
  }

  async updateCorrelationScore(clusterId: string) {
    const { data: actions } = await this.supabase
      .from('cluster_actions')
      .select('direction, action_date')
      .eq('cluster_id', clusterId)
      .order('action_date', { ascending: true })

    if (!actions || actions.length < 2) return

    let correlatedPairs = 0
    let totalPairs = 0

    for (let i = 1; i < actions.length; i++) {
      const prev = actions[i - 1]!
      const curr = actions[i]!

      const daysDiff = Math.abs(
        new Date(curr.action_date).getTime() - new Date(prev.action_date).getTime()
      ) / (1000 * 60 * 60 * 24)

      if (daysDiff <= 30) {
        totalPairs++
        if (prev.direction === curr.direction) {
          correlatedPairs++
        }
      }
    }

    const correlationScore = totalPairs > 0 ? correlatedPairs / totalPairs : 0

    await this.supabase
      .from('cluster_definitions')
      .update({ correlation_score: correlationScore })
      .eq('id', clusterId)
  }

  async getTopClusters(limit = 20): Promise<ClusterDefinition[]> {
    const { data } = await this.supabase
      .from('cluster_definitions')
      .select('*')
      .eq('is_active', true)
      .order('correlation_score', { ascending: false })
      .order('total_occurrences', { ascending: false })
      .limit(limit)

    return data || []
  }

  async getClusterWithDetails(clusterId: string): Promise<{
    cluster: ClusterDefinition
    members: ClusterMember[]
    recentActions: ClusterAction[]
  } | null> {
    const { data: cluster } = await this.supabase
      .from('cluster_definitions')
      .select('*')
      .eq('id', clusterId)
      .single()

    if (!cluster) return null

    const [membersResult, actionsResult] = await Promise.all([
      this.supabase
        .from('cluster_members')
        .select('*')
        .eq('cluster_id', clusterId)
        .order('total_value', { ascending: false }),
      this.supabase
        .from('cluster_actions')
        .select('*')
        .eq('cluster_id', clusterId)
        .order('action_date', { ascending: false })
        .limit(10),
    ])

    return {
      cluster,
      members: membersResult.data || [],
      recentActions: actionsResult.data || [],
    }
  }

  async processAndPersistClusters(detectedClusters: DetectedCluster[]) {
    const results: Array<{ clusterId: string; isNew: boolean; actionId: string }> = []

    for (const detected of detectedClusters) {
      try {
        const { clusterId, isNew } = await this.findOrCreateCluster(
          detected,
          detected.participants
        )

        const actionId = await this.recordClusterAction(
          clusterId,
          detected,
          detected.participants
        )

        await this.updateCorrelationScore(clusterId)

        results.push({ clusterId, isNew, actionId })
      } catch (error) {
        console.error(`Failed to persist cluster ${detected.id}:`, error)
      }
    }

    return results
  }
}

export const clusterPersistence = new ClusterPersistence()
