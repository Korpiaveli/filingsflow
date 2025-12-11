import { withSecRateLimit } from '@/lib/utils/rate-limiter'
import type { SECFiling, AtomFeedEntry } from './types'

const SEC_BASE_URL = 'https://www.sec.gov'
const SEC_DATA_URL = 'https://data.sec.gov'
const USER_AGENT = process.env.SEC_USER_AGENT || 'FilingsFlow/1.0 (contact@filingsflow.com)'

// Form types we care about
export const SUPPORTED_FORM_TYPES = ['3', '4', '5', '13F-HR', '13F-HR/A', '10-K', '10-Q', '8-K']

class SECClient {
  private async fetch(url: string): Promise<Response> {
    return withSecRateLimit(async () => {
      const response = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'application/xml, application/atom+xml, text/xml, */*',
        },
        next: { revalidate: 60 }, // Cache for 60 seconds
      })

      if (!response.ok) {
        throw new Error(`SEC API error: ${response.status} ${response.statusText}`)
      }

      return response
    })
  }

  async fetchAtomFeed(formType?: string, count: number = 40): Promise<AtomFeedEntry[]> {
    const typeParam = formType ? `&type=${encodeURIComponent(formType)}` : ''
    const url = `${SEC_BASE_URL}/cgi-bin/browse-edgar?action=getcurrent${typeParam}&owner=include&count=${count}&output=atom`

    const response = await this.fetch(url)
    const xml = await response.text()

    return this.parseAtomFeed(xml)
  }

  private parseAtomFeed(xml: string): AtomFeedEntry[] {
    const entries: AtomFeedEntry[] = []

    // Simple regex-based XML parsing (no external deps)
    const entryMatches = xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)

    for (const match of entryMatches) {
      const entryXml = match[1] ?? ''

      const title = this.extractTag(entryXml, 'title')
      const link = this.extractAttribute(entryXml, 'link', 'href')
      const summary = this.extractTag(entryXml, 'summary')
      const updated = this.extractTag(entryXml, 'updated')
      const category = this.extractAttribute(entryXml, 'category', 'term')
      const id = this.extractTag(entryXml, 'id')

      if (title && link && id) {
        entries.push({
          title,
          link,
          summary: summary || '',
          updated: updated || new Date().toISOString(),
          category: category || '',
          id,
        })
      }
    }

    return entries
  }

  parseFilingFromAtomEntry(entry: AtomFeedEntry): SECFiling | null {
    // Parse the atom entry ID to extract filing details
    // Example ID: urn:tag:sec.gov,2008:accession-number=0001234567-24-000001
    const accessionMatch = entry.id.match(/accession-number=(\d{10}-\d{2}-\d{6})/)
    if (!accessionMatch?.[1]) return null

    const accessionNumber = accessionMatch[1]

    // Parse CIK from link
    // Example link: https://www.sec.gov/Archives/edgar/data/320193/000032019324000001/...
    const cikMatch = entry.link.match(/\/edgar\/data\/(\d+)\//)
    if (!cikMatch?.[1]) return null

    const cik = cikMatch[1].padStart(10, '0')

    // Extract form type from category
    const formType = entry.category || 'Unknown'

    // Parse company name and ticker from title
    // Example: "4 - Apple Inc (0000320193) (Issuer)"
    const titleMatch = entry.title.match(/^(\S+)\s+-\s+(.+?)\s+\((\d+)\)/)
    const companyName = titleMatch?.[2]?.trim()

    // Try to find ticker in summary
    const tickerMatch = entry.summary.match(/Trading Symbol:\s*([A-Z]+)/i)
    const ticker = tickerMatch?.[1]

    return {
      accessionNumber,
      cik,
      formType,
      filedAt: new Date(entry.updated),
      companyName,
      ticker,
      fileUrl: entry.link,
    }
  }

  async fetchCompanyInfo(cik: string): Promise<{
    name: string
    ticker: string | null
    sic: string | null
    sicDescription: string | null
  } | null> {
    const paddedCik = cik.padStart(10, '0')
    const url = `${SEC_DATA_URL}/submissions/CIK${paddedCik}.json`

    try {
      const response = await this.fetch(url)
      const data = await response.json() as {
        name?: string
        tickers?: string[]
        sic?: string
        sicDescription?: string
      }

      return {
        name: data.name || 'Unknown',
        ticker: data.tickers?.[0] || null,
        sic: data.sic || null,
        sicDescription: data.sicDescription || null,
      }
    } catch {
      return null
    }
  }

  async fetchFilingDocument(
    cik: string,
    accessionNumber: string,
    document: string
  ): Promise<string> {
    const paddedCik = cik.replace(/^0+/, '') // Remove leading zeros for path
    const formattedAccession = accessionNumber.replace(/-/g, '')
    const url = `${SEC_BASE_URL}/Archives/edgar/data/${paddedCik}/${formattedAccession}/${document}`

    const response = await this.fetch(url)
    return response.text()
  }

  async fetchForm4Xml(cik: string, accessionNumber: string): Promise<string> {
    // Form 4s are usually named with the accession number + .xml
    const formattedAccession = accessionNumber.replace(/-/g, '')
    const document = `${formattedAccession}.xml`

    try {
      return await this.fetchFilingDocument(cik, accessionNumber, document)
    } catch {
      // Try alternate naming: primary_doc.xml
      return this.fetchFilingDocument(cik, accessionNumber, 'primary_doc.xml')
    }
  }

  async fetchForm13FXml(cik: string, accessionNumber: string): Promise<string> {
    // 13F information tables are usually in infotable.xml
    try {
      return await this.fetchFilingDocument(cik, accessionNumber, 'infotable.xml')
    } catch {
      // Try alternate naming
      const formattedAccession = accessionNumber.replace(/-/g, '')
      return this.fetchFilingDocument(cik, accessionNumber, `${formattedAccession}-infotable.xml`)
    }
  }

  async fetch13FXml(cik: string, accessionNumber: string): Promise<string> {
    return this.fetchForm13FXml(cik, accessionNumber)
  }

  getFilingUrl(cik: string, accessionNumber: string): string {
    const paddedCik = cik.replace(/^0+/, '')
    const formattedAccession = accessionNumber.replace(/-/g, '')
    return `${SEC_BASE_URL}/Archives/edgar/data/${paddedCik}/${formattedAccession}/`
  }

  private extractTag(xml: string, tag: string): string | null {
    const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
    return match?.[1]?.trim() || null
  }

  private extractAttribute(xml: string, tag: string, attr: string): string | null {
    const match = xml.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i'))
    return match?.[1] || null
  }
}

export const secClient = new SECClient()
