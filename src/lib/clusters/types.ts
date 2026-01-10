export type ClusterType =
  | 'company_insider'      // Executives/directors of the SAME company trading their own stock
  | 'cross_company_exec'   // Executives from DIFFERENT companies trading the same stock
  | 'congressional'        // Multiple congress members trading the same stock
  | 'institutional'        // Multiple institutional investors (13F filers) trading same stock
  | 'mixed_influential'    // Mix of executives, congress, institutions trading same stock

export interface ClusterParticipant {
  name: string
  title: string | null
  affiliation: string
  affiliationType: 'company_officer' | 'company_director' | 'congress' | 'institution' | '10%_owner' | 'unknown'
  transactionType: 'buy' | 'sell'
  value: number
  shares: number
  date: string
  isCompanyInsider: boolean
}

export interface DetectedCluster {
  id: string
  type: ClusterType
  ticker: string
  companyName: string
  companyCik: string
  direction: 'buy' | 'sell' | 'mixed'
  participants: ClusterParticipant[]
  participantCount: number
  totalValue: number
  startDate: string
  endDate: string
  significance: ClusterSignificance
  description: string
}

export interface ClusterSignificance {
  score: number
  signals: string[]
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

export const CLUSTER_DESCRIPTIONS: Record<ClusterType, { title: string; description: string; icon: string }> = {
  company_insider: {
    title: 'Company Insider Cluster',
    description: 'Multiple executives or directors of the same company trading their own stock',
    icon: '👥',
  },
  cross_company_exec: {
    title: 'Cross-Company Executive Cluster',
    description: 'Executives from different companies all trading the same stock',
    icon: '🌐',
  },
  congressional: {
    title: 'Congressional Cluster',
    description: 'Multiple members of Congress trading the same stock',
    icon: '🏛️',
  },
  institutional: {
    title: 'Institutional Cluster',
    description: 'Multiple institutional investors changing positions in the same stock',
    icon: '🏦',
  },
  mixed_influential: {
    title: 'Mixed Influential Cluster',
    description: 'Combination of executives, congress members, and institutions trading the same stock',
    icon: '⭐',
  },
}

export function getClusterTypeLabel(type: ClusterType): string {
  return CLUSTER_DESCRIPTIONS[type].title
}

export function getClusterIcon(type: ClusterType): string {
  return CLUSTER_DESCRIPTIONS[type].icon
}
