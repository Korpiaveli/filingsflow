import { cusipToTickerSync, lookupCusipTicker, lookupCusipTickersBatch } from '@/lib/sec/openfigi'

export interface Form13FHolding {
  nameOfIssuer: string
  titleOfClass: string
  cusip: string
  value: number
  shares: number
  shareType: 'SH' | 'PRN'
  putCall?: 'PUT' | 'CALL'
  investmentDiscretion: 'SOLE' | 'SHARED' | 'NONE'
  otherManager?: string
  votingAuthoritySole: number
  votingAuthorityShared: number
  votingAuthorityNone: number
}

export interface Form13FFiling {
  accessionNumber: string
  reportDate: string
  filerCik: string
  filerName: string
  totalValue: number
  holdings: Form13FHolding[]
}

export function parse13FXml(xml: string, accessionNumber: string): Form13FFiling | null {
  try {
    const reportDateMatch = xml.match(/<reportCalendarOrQuarter>(\d{2}-\d{2}-\d{4})<\/reportCalendarOrQuarter>/)
    const reportDateStr = reportDateMatch ? reportDateMatch[1] : null

    if (!reportDateStr) {
      return null
    }

    const reportDate = formatDate(reportDateStr)

    const filerCikMatch = xml.match(/<cik>(\d+)<\/cik>/)
    const filerNameMatch = /<filingManager>\s*<name>([^<]+)<\/name>/.exec(xml)

    const filerCik = filerCikMatch?.[1] || ''
    const filerName = filerNameMatch?.[1]?.trim() || ''

    const holdings: Form13FHolding[] = []

    const infoTableRegex = /<infoTable[^>]*>([\s\S]*?)<\/infoTable>/g
    let match = infoTableRegex.exec(xml)

    while (match !== null) {
      const holdingXml = match[1] || ''

      const nameOfIssuer = extractTag(holdingXml, 'nameOfIssuer')
      const titleOfClass = extractTag(holdingXml, 'titleOfClass')
      const cusip = extractTag(holdingXml, 'cusip')
      const valueStr = extractTag(holdingXml, 'value')
      const value = parseInt(valueStr, 10) * 1000
      const sharesStr = extractTag(holdingXml, 'sshPrnamt')
      const shares = parseInt(sharesStr, 10)
      const shareTypeStr = extractTag(holdingXml, 'sshPrnamtType')
      const shareType = (shareTypeStr === 'PRN' ? 'PRN' : 'SH') as 'SH' | 'PRN'
      const putCallStr = extractTag(holdingXml, 'putCall')
      const putCall = putCallStr === 'PUT' || putCallStr === 'CALL' ? putCallStr : undefined
      const investDiscStr = extractTag(holdingXml, 'investmentDiscretion')
      const investmentDiscretion = (investDiscStr === 'SHARED' || investDiscStr === 'NONE' ? investDiscStr : 'SOLE') as 'SOLE' | 'SHARED' | 'NONE'
      const otherManagerStr = extractTag(holdingXml, 'otherManager')
      const otherManager = otherManagerStr || undefined
      const votingAuthoritySoleStr = extractTag(holdingXml, 'Sole')
      const votingAuthoritySole = parseInt(votingAuthoritySoleStr, 10) || 0
      const votingAuthoritySharedStr = extractTag(holdingXml, 'Shared')
      const votingAuthorityShared = parseInt(votingAuthoritySharedStr, 10) || 0
      const votingAuthorityNoneStr = extractTag(holdingXml, 'None')
      const votingAuthorityNone = parseInt(votingAuthorityNoneStr, 10) || 0

      if (cusip && shares > 0) {
        holdings.push({
          nameOfIssuer,
          titleOfClass,
          cusip,
          value,
          shares,
          shareType,
          putCall,
          investmentDiscretion,
          otherManager,
          votingAuthoritySole,
          votingAuthorityShared,
          votingAuthorityNone,
        })
      }

      match = infoTableRegex.exec(xml)
    }

    const totalValue = holdings.reduce((sum, h) => sum + h.value, 0)

    return {
      accessionNumber,
      reportDate,
      filerCik,
      filerName,
      totalValue,
      holdings,
    }
  } catch (error) {
    console.error('Error parsing 13F XML:', error)
    return null
  }
}

function extractTag(xml: string, tagName: string): string {
  const regex = new RegExp('<(?:ns1:)?' + tagName + '>([^<]*)</(?:ns1:)?' + tagName + '>', 'i')
  const match = regex.exec(xml)
  return match && match[1] ? match[1].trim() : ''
}

function formatDate(dateStr: string): string {
  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr
  const month = parts[0] || ''
  const day = parts[1] || ''
  const year = parts[2] || ''
  return `${year}-${month}-${day}`
}

// Synchronous fallback for immediate lookups (uses hardcoded known CUSIPs)
export function cusipToTicker(cusip: string): string | null {
  return cusipToTickerSync(cusip)
}

// Async lookup using OpenFIGI API with caching
export async function cusipToTickerAsync(cusip: string): Promise<string | null> {
  return lookupCusipTicker(cusip)
}

// Batch async lookup for multiple CUSIPs
export async function cusipToTickerBatch(cusips: string[]): Promise<Map<string, string | null>> {
  return lookupCusipTickersBatch(cusips)
}
