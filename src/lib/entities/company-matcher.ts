import { compareCiks } from '@/lib/validators/filing-schemas'

const COMPANY_STOPWORDS = [
  'the', 'and', 'of', 'in', 'for', 'to', 'with', 'on', 'by', 'at',
  'inc', 'incorporated', 'corp', 'corporation', 'llc', 'ltd', 'limited',
  'company', 'co', 'group', 'holdings', 'global', 'international',
]

const TICKER_COMPANY_MAP: Record<string, { name: string; cik: string }> = {
  NVDA: { name: 'NVIDIA Corporation', cik: '0001045810' },
  AAPL: { name: 'Apple Inc.', cik: '0000320193' },
  MSFT: { name: 'Microsoft Corporation', cik: '0000789019' },
  GOOGL: { name: 'Alphabet Inc.', cik: '0001652044' },
  GOOG: { name: 'Alphabet Inc.', cik: '0001652044' },
  TSLA: { name: 'Tesla, Inc.', cik: '0001318605' },
  AMZN: { name: 'Amazon.com, Inc.', cik: '0001018724' },
  META: { name: 'Meta Platforms, Inc.', cik: '0001326801' },
  JPM: { name: 'JPMorgan Chase & Co.', cik: '0000019617' },
  V: { name: 'Visa Inc.', cik: '0001403161' },
  MA: { name: 'Mastercard Incorporated', cik: '0001141391' },
  BRK: { name: 'Berkshire Hathaway Inc.', cik: '0001067983' },
  JNJ: { name: 'Johnson & Johnson', cik: '0000200406' },
  WMT: { name: 'Walmart Inc.', cik: '0000104169' },
  PG: { name: 'Procter & Gamble Company', cik: '0000080424' },
  UNH: { name: 'UnitedHealth Group Incorporated', cik: '0000731766' },
  HD: { name: 'Home Depot, Inc.', cik: '0000354950' },
  BAC: { name: 'Bank of America Corporation', cik: '0000070858' },
  XOM: { name: 'Exxon Mobil Corporation', cik: '0000034088' },
  CVX: { name: 'Chevron Corporation', cik: '0000093410' },
}

const KNOWN_INSIDER_COMPANIES: Record<string, { companyCik: string; companyName: string; ticker: string }> = {
  'Jensen Huang': { companyCik: '0001045810', companyName: 'NVIDIA Corporation', ticker: 'NVDA' },
  'Tim Cook': { companyCik: '0000320193', companyName: 'Apple Inc.', ticker: 'AAPL' },
  'Satya Nadella': { companyCik: '0000789019', companyName: 'Microsoft Corporation', ticker: 'MSFT' },
  'Sundar Pichai': { companyCik: '0001652044', companyName: 'Alphabet Inc.', ticker: 'GOOGL' },
  'Elon Musk': { companyCik: '0001318605', companyName: 'Tesla, Inc.', ticker: 'TSLA' },
  'Andy Jassy': { companyCik: '0001018724', companyName: 'Amazon.com, Inc.', ticker: 'AMZN' },
  'Mark Zuckerberg': { companyCik: '0001326801', companyName: 'Meta Platforms, Inc.', ticker: 'META' },
  'Jamie Dimon': { companyCik: '0000019617', companyName: 'JPMorgan Chase & Co.', ticker: 'JPM' },
  'Ryan McInerney': { companyCik: '0001403161', companyName: 'Visa Inc.', ticker: 'V' },
  'Michael Miebach': { companyCik: '0001141391', companyName: 'Mastercard Incorporated', ticker: 'MA' },
  'Warren Buffett': { companyCik: '0001067983', companyName: 'Berkshire Hathaway Inc.', ticker: 'BRK' },
}

export class CompanyMatcher {
  normalizeName(name: string): string {
    let normalized = name
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    const fingerprint = normalized
      .split(' ')
      .filter((word) => !COMPANY_STOPWORDS.includes(word))
      .join(' ')

    return fingerprint.length > 0 ? fingerprint : normalized
  }

  matchTickerToCompany(
    ticker: string,
    companyName: string
  ): { isMatch: boolean; confidence: number; reason: string } {
    const upperTicker = ticker.toUpperCase()
    const knownCompany = TICKER_COMPANY_MAP[upperTicker]

    if (!knownCompany) {
      return {
        isMatch: false,
        confidence: 0,
        reason: `Unknown ticker: ${ticker}`,
      }
    }

    const normalizedInput = this.normalizeName(companyName)
    const normalizedKnown = this.normalizeName(knownCompany.name)

    if (normalizedInput === normalizedKnown) {
      return {
        isMatch: true,
        confidence: 100,
        reason: 'Exact match after normalization',
      }
    }

    const similarity = this.calculateSimilarity(normalizedInput, normalizedKnown)

    if (similarity >= 0.8) {
      return {
        isMatch: true,
        confidence: Math.round(similarity * 100),
        reason: 'High similarity match',
      }
    }

    if (normalizedInput.includes(normalizedKnown) || normalizedKnown.includes(normalizedInput)) {
      return {
        isMatch: true,
        confidence: 85,
        reason: 'Substring match',
      }
    }

    return {
      isMatch: false,
      confidence: Math.round(similarity * 100),
      reason: 'Names do not match sufficiently',
    }
  }

  validateInsiderRelationship(
    insiderName: string,
    companyCik: string,
    transactionCompanyCik: string,
    insiderTitle: string | null
  ): {
    valid: boolean
    isTitleValidForCompany: boolean
    relationship: 'officer' | 'director' | '10%_owner' | 'unknown'
    displayTitle: string | null
    reason?: string
  } {
    const cikMatch = compareCiks(companyCik, transactionCompanyCik)

    const knownInsider = KNOWN_INSIDER_COMPANIES[insiderName]

    if (knownInsider && !compareCiks(knownInsider.companyCik, transactionCompanyCik)) {
      return {
        valid: false,
        isTitleValidForCompany: false,
        relationship: 'unknown',
        displayTitle: null,
        reason: `${insiderName} is affiliated with ${knownInsider.companyName} (${knownInsider.ticker}), not this company`,
      }
    }

    if (!cikMatch) {
      return {
        valid: true,
        isTitleValidForCompany: false,
        relationship: '10%_owner',
        displayTitle: null,
        reason: 'Insider CIK does not match company CIK - likely 10% owner',
      }
    }

    let relationship: 'officer' | 'director' | '10%_owner' | 'unknown' = 'unknown'
    if (insiderTitle) {
      const lowerTitle = insiderTitle.toLowerCase()
      if (
        lowerTitle.includes('ceo') ||
        lowerTitle.includes('cfo') ||
        lowerTitle.includes('coo') ||
        lowerTitle.includes('cto') ||
        lowerTitle.includes('chief') ||
        lowerTitle.includes('president') ||
        lowerTitle.includes('vp') ||
        lowerTitle.includes('vice president') ||
        lowerTitle.includes('officer')
      ) {
        relationship = 'officer'
      } else if (lowerTitle.includes('director')) {
        relationship = 'director'
      }
    }

    return {
      valid: true,
      isTitleValidForCompany: true,
      relationship,
      displayTitle: insiderTitle,
    }
  }

  getCompanyForTicker(ticker: string): { name: string; cik: string } | null {
    const upperTicker = ticker.toUpperCase()
    return TICKER_COMPANY_MAP[upperTicker] || null
  }

  getKnownInsiderCompany(insiderName: string): {
    companyCik: string
    companyName: string
    ticker: string
  } | null {
    return KNOWN_INSIDER_COMPANIES[insiderName] || null
  }

  isInsiderOfCompany(insiderName: string, companyCik: string): boolean {
    const knownInsider = KNOWN_INSIDER_COMPANIES[insiderName]
    if (!knownInsider) return false
    return compareCiks(knownInsider.companyCik, companyCik)
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const maxLen = Math.max(str1.length, str2.length)
    if (maxLen === 0) return 1.0

    const distance = this.levenshteinDistance(str1, str2)
    return 1.0 - distance / maxLen
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length
    const n = str2.length

    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0) as number[])

    for (let i = 0; i <= m; i++) dp[i]![0] = i
    for (let j = 0; j <= n; j++) dp[0]![j] = j

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
        const row = dp[i]!
        const prevRow = dp[i - 1]!
        row[j] = Math.min((prevRow[j] ?? 0) + 1, (row[j - 1] ?? 0) + 1, (prevRow[j - 1] ?? 0) + cost)
      }
    }

    return dp[m]![n] ?? 0
  }
}

export const companyMatcher = new CompanyMatcher()
