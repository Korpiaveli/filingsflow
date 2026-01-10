import { compareCiks } from '@/lib/validators/filing-schemas'
import { companyMatcher } from '@/lib/entities/company-matcher'
import type {
  ClusterType,
  ClusterParticipant,
  DetectedCluster,
  ClusterSignificance,
} from './types'

interface InsiderTransaction {
  id: string
  ticker: string | null
  company_cik: string | null
  company_name: string | null
  insider_cik: string | null
  insider_name: string | null
  insider_title: string | null
  is_officer: boolean | null
  is_director: boolean | null
  is_ten_percent_owner: boolean | null
  transaction_type: string
  transaction_date: string | null
  shares: number | null
  total_value: number | null
}

interface CongressionalTransaction {
  id: string
  ticker: string | null
  member_name: string
  party: string | null
  chamber: string | null
  state: string | null
  transaction_type: string
  transaction_date: string | null
  amount_low: number | null
  amount_high: number | null
}

interface Holding13F {
  id: string
  ticker: string | null
  fund_cik: string | null
  fund_name: string | null
  shares: number | null
  value_usd: number | null
  report_date: string | null
}

export interface ClusterDetectionOptions {
  days: number
  minParticipants: number
  minValue: number
}

export class ClusterDetector {
  detectClusters(
    insiderTxns: InsiderTransaction[],
    congressTxns: CongressionalTransaction[],
    _holdings13F: Holding13F[],
    options: ClusterDetectionOptions
  ): DetectedCluster[] {
    const allClusters: DetectedCluster[] = []

    const insiderByTicker = this.groupByTicker(insiderTxns)
    const congressByTicker = this.groupCongressByTicker(congressTxns)

    for (const [ticker, txns] of insiderByTicker) {
      const companyInsiderClusters = this.detectCompanyInsiderClusters(ticker, txns, options)
      allClusters.push(...companyInsiderClusters)

      const crossCompanyClusters = this.detectCrossCompanyExecutiveClusters(ticker, txns, options)
      allClusters.push(...crossCompanyClusters)
    }

    for (const [ticker, txns] of congressByTicker) {
      const congressClusters = this.detectCongressionalClusters(ticker, txns, options)
      allClusters.push(...congressClusters)
    }

    const mixedClusters = this.detectMixedInfluentialClusters(
      insiderByTicker,
      congressByTicker,
      options
    )
    allClusters.push(...mixedClusters)

    return allClusters.sort((a, b) => b.significance.score - a.significance.score)
  }

  private detectCompanyInsiderClusters(
    ticker: string,
    txns: InsiderTransaction[],
    options: ClusterDetectionOptions
  ): DetectedCluster[] {
    const clusters: DetectedCluster[] = []
    const companyCik = txns[0]?.company_cik || ''
    const companyName = txns[0]?.company_name || ticker

    const companyInsiders = txns.filter(t => {
      if (!t.company_cik || !t.insider_cik) return false
      return (t.is_officer || t.is_director) && compareCiks(t.company_cik, companyCik)
    })

    const uniqueInsiders = new Set(companyInsiders.map(t => t.insider_cik))
    if (uniqueInsiders.size < options.minParticipants) return clusters

    const participants = this.buildParticipants(companyInsiders, companyCik, true)
    const direction = this.determineDirection(participants)
    const totalValue = participants.reduce((sum, p) => sum + p.value, 0)

    if (totalValue < options.minValue) return clusters

    const dates = companyInsiders.map(t => t.transaction_date).filter(Boolean).sort() as string[]
    if (dates.length === 0) return clusters

    const significance = this.calculateSignificance(participants, 'company_insider', direction)

    clusters.push({
      id: `company_insider_${ticker}_${Date.now()}`,
      type: 'company_insider',
      ticker,
      companyName,
      companyCik,
      direction,
      participants,
      participantCount: uniqueInsiders.size,
      totalValue,
      startDate: dates[0]!,
      endDate: dates[dates.length - 1]!,
      significance,
      description: this.generateDescription('company_insider', participants, companyName, direction),
    })

    return clusters
  }

  private detectCrossCompanyExecutiveClusters(
    ticker: string,
    txns: InsiderTransaction[],
    options: ClusterDetectionOptions
  ): DetectedCluster[] {
    const clusters: DetectedCluster[] = []
    const companyCik = txns[0]?.company_cik || ''
    const companyName = txns[0]?.company_name || ticker

    const externalExecutives = txns.filter(t => {
      if (!t.insider_name || !t.insider_title) return false

      const knownCompany = companyMatcher.getKnownInsiderCompany(t.insider_name)
      if (!knownCompany) return false

      if (compareCiks(knownCompany.companyCik, companyCik)) return false

      const title = t.insider_title.toLowerCase()
      return title.includes('ceo') || title.includes('cfo') || title.includes('chief')
    })

    const uniqueExecs = new Set(externalExecutives.map(t => t.insider_cik))
    if (uniqueExecs.size < options.minParticipants) return clusters

    const participants = externalExecutives.map(t => {
      const knownCompany = companyMatcher.getKnownInsiderCompany(t.insider_name || '')
      return {
        name: t.insider_name || 'Unknown',
        title: t.insider_title,
        affiliation: knownCompany?.companyName || 'Unknown Company',
        affiliationType: 'company_officer' as const,
        transactionType: t.transaction_type === 'P' ? 'buy' as const : 'sell' as const,
        value: Math.abs(t.total_value || 0),
        shares: Math.abs(t.shares || 0),
        date: t.transaction_date || '',
        isCompanyInsider: false,
      }
    })

    const direction = this.determineDirection(participants)
    const totalValue = participants.reduce((sum, p) => sum + p.value, 0)

    if (totalValue < options.minValue) return clusters

    const dates = externalExecutives.map(t => t.transaction_date).filter(Boolean).sort() as string[]
    if (dates.length === 0) return clusters

    const significance = this.calculateSignificance(participants, 'cross_company_exec', direction)

    clusters.push({
      id: `cross_company_exec_${ticker}_${Date.now()}`,
      type: 'cross_company_exec',
      ticker,
      companyName,
      companyCik,
      direction,
      participants,
      participantCount: uniqueExecs.size,
      totalValue,
      startDate: dates[0]!,
      endDate: dates[dates.length - 1]!,
      significance,
      description: this.generateDescription('cross_company_exec', participants, companyName, direction),
    })

    return clusters
  }

  private detectCongressionalClusters(
    ticker: string,
    txns: CongressionalTransaction[],
    options: ClusterDetectionOptions
  ): DetectedCluster[] {
    const clusters: DetectedCluster[] = []

    const uniqueMembers = new Set(txns.map(t => t.member_name))
    if (uniqueMembers.size < options.minParticipants) return clusters

    const participants: ClusterParticipant[] = txns.map(t => ({
      name: t.member_name,
      title: `${t.party}-${t.state}`,
      affiliation: t.chamber === 'senate' ? 'U.S. Senate' : 'U.S. House',
      affiliationType: 'congress' as const,
      transactionType: t.transaction_type?.toLowerCase().includes('purchase') ? 'buy' as const : 'sell' as const,
      value: ((t.amount_low || 0) + (t.amount_high || 0)) / 2,
      shares: 0,
      date: t.transaction_date || '',
      isCompanyInsider: false,
    }))

    const direction = this.determineDirection(participants)
    const totalValue = participants.reduce((sum, p) => sum + p.value, 0)

    if (totalValue < options.minValue) return clusters

    const dates = txns.map(t => t.transaction_date).filter(Boolean).sort() as string[]
    if (dates.length === 0) return clusters

    const significance = this.calculateSignificance(participants, 'congressional', direction)

    clusters.push({
      id: `congressional_${ticker}_${Date.now()}`,
      type: 'congressional',
      ticker,
      companyName: ticker,
      companyCik: '',
      direction,
      participants,
      participantCount: uniqueMembers.size,
      totalValue,
      startDate: dates[0]!,
      endDate: dates[dates.length - 1]!,
      significance,
      description: this.generateDescription('congressional', participants, ticker, direction),
    })

    return clusters
  }

  private detectMixedInfluentialClusters(
    insiderByTicker: Map<string, InsiderTransaction[]>,
    congressByTicker: Map<string, CongressionalTransaction[]>,
    options: ClusterDetectionOptions
  ): DetectedCluster[] {
    const clusters: DetectedCluster[] = []

    const allTickers = new Set([...insiderByTicker.keys(), ...congressByTicker.keys()])

    for (const ticker of allTickers) {
      const insiderTxns = insiderByTicker.get(ticker) || []
      const congressTxns = congressByTicker.get(ticker) || []

      const hasInsiders = insiderTxns.length > 0
      const hasCongress = congressTxns.length > 0

      if (!hasInsiders || !hasCongress) continue

      const insiderParticipants = this.buildParticipants(
        insiderTxns.filter(t => t.is_officer || t.is_director),
        insiderTxns[0]?.company_cik || '',
        false
      )

      const congressParticipants: ClusterParticipant[] = congressTxns.map(t => ({
        name: t.member_name,
        title: `${t.party}-${t.state}`,
        affiliation: t.chamber === 'senate' ? 'U.S. Senate' : 'U.S. House',
        affiliationType: 'congress' as const,
        transactionType: t.transaction_type?.toLowerCase().includes('purchase') ? 'buy' as const : 'sell' as const,
        value: ((t.amount_low || 0) + (t.amount_high || 0)) / 2,
        shares: 0,
        date: t.transaction_date || '',
        isCompanyInsider: false,
      }))

      const allParticipants = [...insiderParticipants, ...congressParticipants]
      const uniqueParticipants = new Set(allParticipants.map(p => p.name))

      if (uniqueParticipants.size < options.minParticipants) continue

      const direction = this.determineDirection(allParticipants)
      const totalValue = allParticipants.reduce((sum, p) => sum + p.value, 0)

      if (totalValue < options.minValue) continue

      const dates = allParticipants.map(p => p.date).filter(Boolean).sort()
      if (dates.length === 0) continue

      const companyName = insiderTxns[0]?.company_name || ticker

      const significance = this.calculateSignificance(allParticipants, 'mixed_influential', direction)

      clusters.push({
        id: `mixed_influential_${ticker}_${Date.now()}`,
        type: 'mixed_influential',
        ticker,
        companyName,
        companyCik: insiderTxns[0]?.company_cik || '',
        direction,
        participants: allParticipants,
        participantCount: uniqueParticipants.size,
        totalValue,
        startDate: dates[0]!,
        endDate: dates[dates.length - 1]!,
        significance,
        description: this.generateDescription('mixed_influential', allParticipants, companyName, direction),
      })
    }

    return clusters
  }

  private buildParticipants(
    txns: InsiderTransaction[],
    companyCik: string,
    checkCompanyInsider: boolean
  ): ClusterParticipant[] {
    return txns.map(t => {
      const isCompanyInsider = checkCompanyInsider && compareCiks(t.company_cik || '', companyCik)
      const knownCompany = companyMatcher.getKnownInsiderCompany(t.insider_name || '')

      let affiliationType: ClusterParticipant['affiliationType'] = 'unknown'
      if (t.is_officer) affiliationType = 'company_officer'
      else if (t.is_director) affiliationType = 'company_director'
      else if (t.is_ten_percent_owner) affiliationType = '10%_owner'

      return {
        name: t.insider_name || 'Unknown',
        title: t.insider_title,
        affiliation: isCompanyInsider
          ? (t.company_name || 'Unknown Company')
          : (knownCompany?.companyName || t.company_name || 'Unknown'),
        affiliationType,
        transactionType: t.transaction_type === 'P' ? 'buy' as const : 'sell' as const,
        value: Math.abs(t.total_value || 0),
        shares: Math.abs(t.shares || 0),
        date: t.transaction_date || '',
        isCompanyInsider,
      }
    })
  }

  private determineDirection(participants: ClusterParticipant[]): 'buy' | 'sell' | 'mixed' {
    const buys = participants.filter(p => p.transactionType === 'buy').length
    const sells = participants.filter(p => p.transactionType === 'sell').length

    if (buys > 0 && sells === 0) return 'buy'
    if (sells > 0 && buys === 0) return 'sell'
    return 'mixed'
  }

  private calculateSignificance(
    participants: ClusterParticipant[],
    clusterType: ClusterType,
    direction: 'buy' | 'sell' | 'mixed'
  ): ClusterSignificance {
    let score = 0
    const signals: string[] = []

    score += participants.length * 10

    const ceoCount = participants.filter(p =>
      p.title?.toLowerCase().includes('ceo') || p.title?.toLowerCase().includes('chief executive')
    ).length
    if (ceoCount > 0) {
      score += ceoCount * 25
      signals.push(`${ceoCount} CEO${ceoCount > 1 ? 's' : ''} involved`)
    }

    const cfoCount = participants.filter(p =>
      p.title?.toLowerCase().includes('cfo') || p.title?.toLowerCase().includes('chief financial')
    ).length
    if (cfoCount > 0) {
      score += cfoCount * 20
      signals.push(`${cfoCount} CFO${cfoCount > 1 ? 's' : ''} involved`)
    }

    if (clusterType === 'congressional') {
      score += 30
      signals.push('Congressional activity')
    }

    if (clusterType === 'cross_company_exec') {
      score += 40
      signals.push('Cross-company executive interest')
    }

    if (clusterType === 'mixed_influential') {
      score += 50
      signals.push('Mixed influential participants')
    }

    if (direction === 'buy') {
      signals.push('Unanimous buying')
      score += 15
    } else if (direction === 'sell') {
      signals.push('Unanimous selling')
      score += 15
    }

    const totalValue = participants.reduce((sum, p) => sum + p.value, 0)
    if (totalValue > 10_000_000) {
      score += 30
      signals.push('$10M+ total value')
    } else if (totalValue > 1_000_000) {
      score += 15
      signals.push('$1M+ total value')
    }

    let riskLevel: ClusterSignificance['riskLevel'] = 'low'
    if (score >= 100) riskLevel = 'critical'
    else if (score >= 70) riskLevel = 'high'
    else if (score >= 40) riskLevel = 'medium'

    return { score, signals, riskLevel }
  }

  private generateDescription(
    type: ClusterType,
    participants: ClusterParticipant[],
    companyName: string,
    direction: 'buy' | 'sell' | 'mixed'
  ): string {
    const count = new Set(participants.map(p => p.name)).size
    const action = direction === 'buy' ? 'buying' : direction === 'sell' ? 'selling' : 'trading'

    switch (type) {
      case 'company_insider':
        return `${count} ${companyName} insiders ${action} shares`

      case 'cross_company_exec':
        const companies = [...new Set(participants.map(p => p.affiliation))]
        return `Executives from ${companies.slice(0, 3).join(', ')}${companies.length > 3 ? ` +${companies.length - 3} more` : ''} ${action} ${companyName}`

      case 'congressional':
        return `${count} members of Congress ${action} ${companyName}`

      case 'institutional':
        return `${count} institutional investors ${action} ${companyName}`

      case 'mixed_influential':
        const types = [...new Set(participants.map(p => p.affiliationType))]
        const typeLabels = types.map(t => {
          if (t === 'congress') return 'Congress'
          if (t === 'company_officer') return 'executives'
          if (t === 'institution') return 'institutions'
          return t
        })
        return `${count} influential participants (${typeLabels.join(', ')}) ${action} ${companyName}`
    }
  }

  private groupByTicker(txns: InsiderTransaction[]): Map<string, InsiderTransaction[]> {
    const groups = new Map<string, InsiderTransaction[]>()
    for (const txn of txns) {
      if (!txn.ticker) continue
      const existing = groups.get(txn.ticker) || []
      existing.push(txn)
      groups.set(txn.ticker, existing)
    }
    return groups
  }

  private groupCongressByTicker(txns: CongressionalTransaction[]): Map<string, CongressionalTransaction[]> {
    const groups = new Map<string, CongressionalTransaction[]>()
    for (const txn of txns) {
      if (!txn.ticker) continue
      const existing = groups.get(txn.ticker) || []
      existing.push(txn)
      groups.set(txn.ticker, existing)
    }
    return groups
  }
}

export const clusterDetector = new ClusterDetector()
