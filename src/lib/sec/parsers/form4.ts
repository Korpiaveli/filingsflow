import type { Form4Filing, Form4Transaction } from '../types'

interface ParsedForm4 {
  issuer: {
    cik: string
    name: string
    ticker: string
  }
  owner: {
    cik: string
    name: string
    title: string | null
    isDirector: boolean
    isOfficer: boolean
    isTenPercentOwner: boolean
  }
  nonDerivativeTransactions: Form4Transaction[]
  derivativeTransactions: Form4Transaction[]
  is10b51Plan: boolean
  footnotes: string[]
}

export function parseForm4Xml(xml: string, accessionNumber: string): Form4Filing | null {
  try {
    const parsed = extractForm4Data(xml)
    if (!parsed) return null

    const allTransactions = [
      ...parsed.nonDerivativeTransactions,
      ...parsed.derivativeTransactions,
    ]

    return {
      filingId: '', // Will be set when inserted to DB
      accessionNumber,
      filedAt: new Date(), // Will be overwritten with actual filing date
      issuer: parsed.issuer,
      reportingOwner: parsed.owner,
      transactions: allTransactions,
      is10b51Plan: parsed.is10b51Plan,
      footnotes: parsed.footnotes,
    }
  } catch (error) {
    console.error('Error parsing Form 4 XML:', error)
    return null
  }
}

function extractForm4Data(xml: string): ParsedForm4 | null {
  // Extract issuer info
  const issuerCik = extractValue(xml, 'issuerCik')
  const issuerName = extractValue(xml, 'issuerName')
  const issuerTicker = extractValue(xml, 'issuerTradingSymbol')

  if (!issuerCik || !issuerName) {
    return null
  }

  // Extract reporting owner info
  const ownerCik = extractValue(xml, 'rptOwnerCik')
  const ownerName = extractValue(xml, 'rptOwnerName')

  if (!ownerCik || !ownerName) {
    return null
  }

  // Extract relationship
  const isDirector = extractValue(xml, 'isDirector') === '1' || extractValue(xml, 'isDirector') === 'true'
  const isOfficer = extractValue(xml, 'isOfficer') === '1' || extractValue(xml, 'isOfficer') === 'true'
  const isTenPercentOwner = extractValue(xml, 'isTenPercentOwner') === '1' || extractValue(xml, 'isTenPercentOwner') === 'true'
  const officerTitle = extractValue(xml, 'officerTitle')

  // Check for 10b5-1 plan
  const is10b51Plan = xml.toLowerCase().includes('10b5-1') || xml.toLowerCase().includes('rule 10b5')

  // Extract non-derivative transactions
  const nonDerivativeTransactions = extractTransactions(xml, 'nonDerivativeTransaction', false)

  // Extract derivative transactions
  const derivativeTransactions = extractTransactions(xml, 'derivativeTransaction', true)

  // Extract footnotes
  const footnotes = extractFootnotes(xml)

  return {
    issuer: {
      cik: issuerCik.padStart(10, '0'),
      name: cleanText(issuerName),
      ticker: issuerTicker?.toUpperCase() || '',
    },
    owner: {
      cik: ownerCik.padStart(10, '0'),
      name: cleanText(ownerName),
      title: officerTitle ? cleanText(officerTitle) : null,
      isDirector,
      isOfficer,
      isTenPercentOwner,
    },
    nonDerivativeTransactions,
    derivativeTransactions,
    is10b51Plan,
    footnotes,
  }
}

function extractTransactions(xml: string, transactionTag: string, isDerivative: boolean): Form4Transaction[] {
  const transactions: Form4Transaction[] = []

  // Find all transaction blocks
  const regex = new RegExp(`<${transactionTag}>([\\s\\S]*?)<\\/${transactionTag}>`, 'gi')
  const matches = xml.matchAll(regex)

  for (const match of matches) {
    const txnXml = match[1] ?? ''

    // Extract transaction date
    const dateMatch = txnXml.match(/<transactionDate>[\s\S]*?<value>([^<]+)<\/value>[\s\S]*?<\/transactionDate>/i)
    const transactionDate = dateMatch?.[1]?.trim() || null

    // Extract transaction code
    const codeMatch = txnXml.match(/<transactionCode>([^<]+)<\/transactionCode>/i)
    const transactionCode = codeMatch?.[1]?.trim() || 'U' // U = Unknown

    // Extract shares
    const sharesMatch = txnXml.match(/<transactionShares>[\s\S]*?<value>([^<]+)<\/value>[\s\S]*?<\/transactionShares>/i)
    const shares = sharesMatch?.[1] ? parseFloat(sharesMatch[1]) : null

    // Extract price per share
    const priceMatch = txnXml.match(/<transactionPricePerShare>[\s\S]*?<value>([^<]+)<\/value>[\s\S]*?<\/transactionPricePerShare>/i)
    const pricePerShare = priceMatch?.[1] ? parseFloat(priceMatch[1]) : null

    // Extract shares owned after transaction
    const afterMatch = txnXml.match(/<sharesOwnedFollowingTransaction>[\s\S]*?<value>([^<]+)<\/value>[\s\S]*?<\/sharesOwnedFollowingTransaction>/i)
    const sharesOwnedAfter = afterMatch?.[1] ? parseFloat(afterMatch[1]) : null

    // Extract direct/indirect ownership
    const ownershipMatch = txnXml.match(/<directOrIndirectOwnership>[\s\S]*?<value>([^<]+)<\/value>[\s\S]*?<\/directOrIndirectOwnership>/i)
    const directOrIndirect = (ownershipMatch?.[1]?.trim().toUpperCase() === 'I' ? 'I' : 'D') as 'D' | 'I'

    transactions.push({
      transactionDate,
      transactionCode,
      shares,
      pricePerShare,
      sharesOwnedAfter,
      directOrIndirect,
      isDerivative,
    })
  }

  return transactions
}

function extractFootnotes(xml: string): string[] {
  const footnotes: string[] = []
  const regex = /<footnote\s+id="[^"]*">([^<]+)<\/footnote>/gi
  const matches = xml.matchAll(regex)

  for (const match of matches) {
    if (match[1]) {
      footnotes.push(cleanText(match[1]))
    }
  }

  return footnotes
}

function extractValue(xml: string, tag: string): string | null {
  // Try direct tag first
  const directMatch = xml.match(new RegExp(`<${tag}>([^<]+)<\\/${tag}>`, 'i'))
  if (directMatch?.[1]) {
    return directMatch[1].trim()
  }

  // Try nested value tag
  const nestedMatch = xml.match(new RegExp(`<${tag}>[\\s\\S]*?<value>([^<]+)<\\/value>[\\s\\S]*?<\\/${tag}>`, 'i'))
  return nestedMatch?.[1]?.trim() || null
}

function cleanText(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

// Calculate total transaction value
export function calculateTransactionValue(transaction: Form4Transaction): number | null {
  if (transaction.shares && transaction.pricePerShare) {
    return transaction.shares * transaction.pricePerShare
  }
  return null
}

// Determine if transaction is a buy or sell
export function isBuyTransaction(code: string): boolean {
  return ['P', 'A', 'M', 'X', 'I'].includes(code.toUpperCase())
}

export function isSellTransaction(code: string): boolean {
  return ['S', 'D', 'F'].includes(code.toUpperCase())
}

// Get human-readable transaction description
export function getTransactionDescription(code: string): string {
  const descriptions: Record<string, string> = {
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
    W: 'Acquisition by will',
    Z: 'Voting trust transaction',
    J: 'Other acquisition/disposition',
    K: 'Equity swap',
    U: 'Tender of shares',
  }

  return descriptions[code.toUpperCase()] || `Transaction (${code})`
}
