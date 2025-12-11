// SEC Filing Types

export interface SECFiling {
  accessionNumber: string
  cik: string
  formType: string
  filedAt: Date
  acceptedAt?: Date
  companyName?: string
  ticker?: string
  fileUrl: string
  primaryDocument?: string
}

export interface AtomFeedEntry {
  title: string
  link: string
  summary: string
  updated: string
  category: string
  id: string
}

export interface Form4Transaction {
  transactionDate: string | null
  transactionCode: string
  shares: number | null
  pricePerShare: number | null
  sharesOwnedAfter: number | null
  directOrIndirect: 'D' | 'I'
  isDerivative: boolean
}

export interface Form4Filing {
  filingId: string
  accessionNumber: string
  filedAt: Date
  issuer: {
    cik: string
    name: string
    ticker: string
  }
  reportingOwner: {
    cik: string
    name: string
    title: string | null
    isDirector: boolean
    isOfficer: boolean
    isTenPercentOwner: boolean
  }
  transactions: Form4Transaction[]
  is10b51Plan: boolean
  footnotes: string[]
}

export interface Form13FHolding {
  issuerName: string
  titleOfClass: string
  cusip: string
  value: number // in thousands
  shares: number
  putCall: 'PUT' | 'CALL' | null
  investmentDiscretion: 'SOLE' | 'SHARED' | 'NONE'
  votingAuthority: {
    sole: number
    shared: number
    none: number
  }
}

export interface Form13FFiling {
  filingId: string
  accessionNumber: string
  filedAt: Date
  reportDate: Date
  fund: {
    cik: string
    name: string
  }
  holdings: Form13FHolding[]
  totalValue: number
  holdingsCount: number
}

// Transaction codes
export const TRANSACTION_CODES: Record<string, string> = {
  P: 'Open market purchase',
  S: 'Open market sale',
  A: 'Grant/award',
  D: 'Disposition to issuer',
  F: 'Payment of exercise price',
  I: 'Discretionary transaction',
  M: 'Exercise or conversion',
  C: 'Conversion of derivative',
  E: 'Expiration of short derivative',
  H: 'Expiration of long derivative',
  O: 'Exercise of out-of-money derivative',
  X: 'Exercise of in-the-money derivative',
  G: 'Gift',
  L: 'Small acquisition',
  W: 'Acquisition or disposition by will',
  Z: 'Deposit into/withdrawal from voting trust',
  J: 'Other acquisition or disposition',
  K: 'Equity swap or similar',
  U: 'Disposition due to tender of shares',
}
