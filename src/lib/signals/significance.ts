export type SignalType =
  | 'cluster'
  | 'first-buy'
  | 'unusual-size'
  | 'c-suite'
  | 'insider'
  | 'congress'
  | 'institutional'

export interface SignificanceFactors {
  value: number
  insiderTitle?: string | null
  isOfficer?: boolean
  isDirector?: boolean
  isTenPercentOwner?: boolean
  clusterCount?: number
  monthsSinceLast?: number | null
  isWatchlist?: boolean
  isCongress?: boolean
  is13F?: boolean
}

export interface SignificanceResult {
  score: number
  signals: SignalType[]
  primarySignal: SignalType
  context: string
}

const VALUE_THRESHOLDS = {
  MEGA: 10_000_000,
  LARGE: 1_000_000,
  MEDIUM: 100_000,
} as const

const SCORE_WEIGHTS = {
  VALUE_MEGA: 50,
  VALUE_LARGE: 30,
  VALUE_MEDIUM: 10,
  TITLE_CEO: 30,
  TITLE_CFO: 25,
  TITLE_PRESIDENT: 20,
  TITLE_OFFICER: 10,
  CLUSTER: 25,
  FIRST_IN_6_MONTHS: 20,
  WATCHLIST: 20,
  CONGRESS: 15,
  INSTITUTIONAL: 10,
} as const

export function calculateSignificance(factors: SignificanceFactors): SignificanceResult {
  let score = 0
  const signals: SignalType[] = []
  const contexts: string[] = []

  if (factors.value >= VALUE_THRESHOLDS.MEGA) {
    score += SCORE_WEIGHTS.VALUE_MEGA
    signals.push('unusual-size')
    contexts.push(`$${(factors.value / 1_000_000).toFixed(1)}M transaction`)
  } else if (factors.value >= VALUE_THRESHOLDS.LARGE) {
    score += SCORE_WEIGHTS.VALUE_LARGE
    signals.push('unusual-size')
  } else if (factors.value >= VALUE_THRESHOLDS.MEDIUM) {
    score += SCORE_WEIGHTS.VALUE_MEDIUM
  }

  const title = factors.insiderTitle?.toLowerCase() || ''
  if (title.includes('ceo') || title.includes('chief executive')) {
    score += SCORE_WEIGHTS.TITLE_CEO
    signals.push('c-suite')
    contexts.push('CEO transaction')
  } else if (title.includes('cfo') || title.includes('chief financial')) {
    score += SCORE_WEIGHTS.TITLE_CFO
    signals.push('c-suite')
    contexts.push('CFO transaction')
  } else if (title.includes('president')) {
    score += SCORE_WEIGHTS.TITLE_PRESIDENT
    signals.push('c-suite')
  } else if (factors.isOfficer) {
    score += SCORE_WEIGHTS.TITLE_OFFICER
  }

  if (factors.clusterCount && factors.clusterCount >= 3) {
    score += SCORE_WEIGHTS.CLUSTER
    signals.push('cluster')
    contexts.push(`${factors.clusterCount} insiders trading`)
  }

  if (factors.monthsSinceLast && factors.monthsSinceLast > 6) {
    score += SCORE_WEIGHTS.FIRST_IN_6_MONTHS
    signals.push('first-buy')
    contexts.push(`First in ${factors.monthsSinceLast} months`)
  }

  if (factors.isWatchlist) {
    score += SCORE_WEIGHTS.WATCHLIST
  }

  if (factors.isCongress) {
    score += SCORE_WEIGHTS.CONGRESS
    signals.push('congress')
  }

  if (factors.is13F) {
    score += SCORE_WEIGHTS.INSTITUTIONAL
    signals.push('institutional')
  }

  if (signals.length === 0) {
    signals.push('insider')
  }

  const primarySignal = determinePrimarySignal(signals, factors)
  const context = contexts[0] || ''

  return { score, signals, primarySignal, context }
}

function determinePrimarySignal(signals: SignalType[], factors: SignificanceFactors): SignalType {
  if (signals.includes('cluster')) return 'cluster'
  if (signals.includes('first-buy')) return 'first-buy'
  if (signals.includes('unusual-size') && factors.value >= VALUE_THRESHOLDS.LARGE) return 'unusual-size'
  if (signals.includes('c-suite')) return 'c-suite'
  if (signals.includes('congress')) return 'congress'
  if (signals.includes('institutional')) return 'institutional'
  return 'insider'
}

export function formatSignalValue(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toLocaleString()}`
}

export function getSignalLabel(type: SignalType): string {
  const labels: Record<SignalType, string> = {
    'cluster': 'Cluster',
    'first-buy': 'First in months',
    'unusual-size': 'Large',
    'c-suite': 'C-Suite',
    'insider': 'Insider',
    'congress': 'Congress',
    'institutional': '13F',
  }
  return labels[type]
}

export function getActivityLevel(transactionCount: number): 'high' | 'medium' | 'low' | 'none' {
  if (transactionCount >= 5) return 'high'
  if (transactionCount >= 2) return 'medium'
  if (transactionCount >= 1) return 'low'
  return 'none'
}
