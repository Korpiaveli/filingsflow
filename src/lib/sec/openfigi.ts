import { createServiceClient } from '@/lib/supabase/server'

interface OpenFIGIRequest {
  idType: 'ID_CUSIP'
  idValue: string
}

interface OpenFIGIData {
  figi: string
  name: string
  ticker: string
  exchCode: string
  compositeFIGI: string
  securityType: string
  marketSector: string
}

interface OpenFIGIResponse {
  data?: OpenFIGIData[]
  warning?: string
  error?: string
}

const OPENFIGI_URL = 'https://api.openfigi.com/v3/mapping'
const CACHE_TTL_DAYS = 30

const memoryCache = new Map<string, { ticker: string | null; timestamp: number }>()
const MEMORY_CACHE_TTL = 60 * 60 * 1000 // 1 hour

export async function lookupCusipTicker(cusip: string): Promise<string | null> {
  if (!cusip || cusip.length !== 9) {
    return null
  }

  // Check memory cache first
  const memoryCached = memoryCache.get(cusip)
  if (memoryCached && Date.now() - memoryCached.timestamp < MEMORY_CACHE_TTL) {
    return memoryCached.ticker
  }

  // Check database cache
  const dbCached = await checkDatabaseCache(cusip)
  if (dbCached !== undefined) {
    memoryCache.set(cusip, { ticker: dbCached, timestamp: Date.now() })
    return dbCached
  }

  // Call OpenFIGI API
  const ticker = await fetchFromOpenFIGI(cusip)

  // Cache the result
  await cacheCusipMapping(cusip, ticker)
  memoryCache.set(cusip, { ticker, timestamp: Date.now() })

  return ticker
}

export async function lookupCusipTickersBatch(cusips: string[]): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>()
  const uncached: string[] = []

  // Check caches first
  for (const cusip of cusips) {
    if (!cusip || cusip.length !== 9) {
      results.set(cusip, null)
      continue
    }

    const memoryCached = memoryCache.get(cusip)
    if (memoryCached && Date.now() - memoryCached.timestamp < MEMORY_CACHE_TTL) {
      results.set(cusip, memoryCached.ticker)
      continue
    }

    uncached.push(cusip)
  }

  if (uncached.length === 0) {
    return results
  }

  // Check database cache for uncached items
  const dbCached = await checkDatabaseCacheBatch(uncached)
  const stillUncached: string[] = []

  for (const cusip of uncached) {
    if (dbCached.has(cusip)) {
      const ticker = dbCached.get(cusip) ?? null
      results.set(cusip, ticker)
      memoryCache.set(cusip, { ticker, timestamp: Date.now() })
    } else {
      stillUncached.push(cusip)
    }
  }

  // Fetch from OpenFIGI in batches (max 100 per request)
  const batchSize = 100
  for (let i = 0; i < stillUncached.length; i += batchSize) {
    const batch = stillUncached.slice(i, i + batchSize)
    const batchResults = await fetchFromOpenFIGIBatch(batch)

    for (const [cusip, ticker] of batchResults) {
      results.set(cusip, ticker)
      memoryCache.set(cusip, { ticker, timestamp: Date.now() })
      await cacheCusipMapping(cusip, ticker)
    }

    // Rate limit: OpenFIGI allows 25 req/min for free tier
    if (i + batchSize < stillUncached.length) {
      await new Promise(resolve => setTimeout(resolve, 2500))
    }
  }

  return results
}

async function fetchFromOpenFIGI(cusip: string): Promise<string | null> {
  try {
    const request: OpenFIGIRequest[] = [{ idType: 'ID_CUSIP', idValue: cusip }]

    const response = await fetch(OPENFIGI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.OPENFIGI_API_KEY && {
          'X-OPENFIGI-APIKEY': process.env.OPENFIGI_API_KEY
        })
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      console.error(`OpenFIGI API error: ${response.status}`)
      return null
    }

    const data: OpenFIGIResponse[] = await response.json()
    const result = data[0]

    if (result?.data && result.data.length > 0) {
      // Prefer US equity exchanges
      const usEquity = result.data.find(d =>
        d.marketSector === 'Equity' &&
        ['US', 'UN', 'UW', 'UA', 'UQ'].includes(d.exchCode)
      )
      return usEquity?.ticker || result.data[0]?.ticker || null
    }

    return null
  } catch (error) {
    console.error('Error fetching from OpenFIGI:', error)
    return null
  }
}

async function fetchFromOpenFIGIBatch(cusips: string[]): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>()

  try {
    const requests: OpenFIGIRequest[] = cusips.map(cusip => ({
      idType: 'ID_CUSIP',
      idValue: cusip
    }))

    const response = await fetch(OPENFIGI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.OPENFIGI_API_KEY && {
          'X-OPENFIGI-APIKEY': process.env.OPENFIGI_API_KEY
        })
      },
      body: JSON.stringify(requests)
    })

    if (!response.ok) {
      console.error(`OpenFIGI API batch error: ${response.status}`)
      cusips.forEach(cusip => results.set(cusip, null))
      return results
    }

    const data: OpenFIGIResponse[] = await response.json()

    for (let i = 0; i < cusips.length; i++) {
      const cusip = cusips[i]!
      const result = data[i]

      if (result?.data && result.data.length > 0) {
        const usEquity = result.data.find(d =>
          d.marketSector === 'Equity' &&
          ['US', 'UN', 'UW', 'UA', 'UQ'].includes(d.exchCode)
        )
        results.set(cusip, usEquity?.ticker || result.data[0]?.ticker || null)
      } else {
        results.set(cusip, null)
      }
    }
  } catch (error) {
    console.error('Error in OpenFIGI batch request:', error)
    cusips.forEach(cusip => results.set(cusip, null))
  }

  return results
}

async function checkDatabaseCache(cusip: string): Promise<string | null | undefined> {
  try {
    const supabase = await createServiceClient()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - CACHE_TTL_DAYS)

    const { data } = await supabase
      .from('cusip_cache')
      .select('ticker')
      .eq('cusip', cusip)
      .gte('cached_at', cutoffDate.toISOString())
      .single()

    if (data) {
      return data.ticker
    }

    return undefined
  } catch {
    return undefined
  }
}

async function checkDatabaseCacheBatch(cusips: string[]): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>()

  try {
    const supabase = await createServiceClient()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - CACHE_TTL_DAYS)

    const { data } = await supabase
      .from('cusip_cache')
      .select('cusip, ticker')
      .in('cusip', cusips)
      .gte('cached_at', cutoffDate.toISOString())

    if (data) {
      for (const row of data) {
        results.set(row.cusip, row.ticker)
      }
    }
  } catch (error) {
    console.error('Error checking database cache batch:', error)
  }

  return results
}

async function cacheCusipMapping(cusip: string, ticker: string | null): Promise<void> {
  try {
    const supabase = await createServiceClient()

    await supabase
      .from('cusip_cache')
      .upsert({
        cusip,
        ticker,
        cached_at: new Date().toISOString()
      }, {
        onConflict: 'cusip'
      })
  } catch (error) {
    console.error('Error caching CUSIP mapping:', error)
  }
}

// Synchronous fallback for known major tickers
const KNOWN_CUSIPS: Record<string, string> = {
  '037833100': 'AAPL',
  '594918104': 'MSFT',
  '02079K107': 'GOOG',
  '02079K305': 'GOOGL',
  '023135106': 'AMZN',
  '88160R101': 'TSLA',
  '30303M102': 'META',
  '67066G104': 'NVDA',
  '084670702': 'BRK.B',
  '478160104': 'JNJ',
  '742718109': 'PG',
  '931142103': 'WMT',
  '172967424': 'C',
  '46625H100': 'JPM',
  '0258161092': 'AMD',
  '92826C839': 'V',
  '57636Q104': 'MA',
  '254687106': 'DIS',
  '693475105': 'PFE',
  '459200101': 'IBM',
}

export function cusipToTickerSync(cusip: string): string | null {
  return KNOWN_CUSIPS[cusip] || null
}
