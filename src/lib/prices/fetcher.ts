interface PriceData {
  symbol: string
  price: number
  previousClose: number
  change: number
  changePercent: number
  timestamp: Date
}

interface HistoricalPrice {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

const ALPHA_VANTAGE_BASE = 'https://www.alphavantage.co/query'

export class PriceFetcher {
  private apiKey: string
  private cache: Map<string, { data: PriceData; expiry: number }> = new Map()
  private cacheDuration = 5 * 60 * 1000

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ALPHA_VANTAGE_API_KEY || ''
  }

  async getCurrentPrice(symbol: string): Promise<PriceData | null> {
    const cached = this.cache.get(symbol)
    if (cached && cached.expiry > Date.now()) {
      return cached.data
    }

    if (!this.apiKey) {
      console.warn('Alpha Vantage API key not configured')
      return null
    }

    try {
      const url = new URL(ALPHA_VANTAGE_BASE)
      url.searchParams.set('function', 'GLOBAL_QUOTE')
      url.searchParams.set('symbol', symbol)
      url.searchParams.set('apikey', this.apiKey)

      const response = await fetch(url.toString())
      const data = await response.json()

      if (data['Error Message'] || data['Note']) {
        console.error('Alpha Vantage error:', data['Error Message'] || data['Note'])
        return null
      }

      const quote = data['Global Quote']
      if (!quote || !quote['05. price']) {
        return null
      }

      const priceData: PriceData = {
        symbol,
        price: parseFloat(quote['05. price']),
        previousClose: parseFloat(quote['08. previous close']),
        change: parseFloat(quote['09. change']),
        changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
        timestamp: new Date(),
      }

      this.cache.set(symbol, {
        data: priceData,
        expiry: Date.now() + this.cacheDuration,
      })

      return priceData
    } catch (error) {
      console.error(`Failed to fetch price for ${symbol}:`, error)
      return null
    }
  }

  async getHistoricalPrices(
    symbol: string,
    startDate: Date,
    endDate: Date = new Date()
  ): Promise<HistoricalPrice[]> {
    if (!this.apiKey) {
      console.warn('Alpha Vantage API key not configured')
      return []
    }

    try {
      const url = new URL(ALPHA_VANTAGE_BASE)
      url.searchParams.set('function', 'TIME_SERIES_DAILY')
      url.searchParams.set('symbol', symbol)
      url.searchParams.set('outputsize', 'full')
      url.searchParams.set('apikey', this.apiKey)

      const response = await fetch(url.toString())
      const data = await response.json()

      if (data['Error Message'] || data['Note']) {
        console.error('Alpha Vantage error:', data['Error Message'] || data['Note'])
        return []
      }

      const timeSeries = data['Time Series (Daily)']
      if (!timeSeries) {
        return []
      }

      const startStr = startDate.toISOString().split('T')[0] ?? ''
      const endStr = endDate.toISOString().split('T')[0] ?? ''

      const prices: HistoricalPrice[] = []
      for (const [date, values] of Object.entries(timeSeries)) {
        if (startStr && endStr && date >= startStr && date <= endStr) {
          const v = values as Record<string, string>
          prices.push({
            date,
            open: parseFloat(v['1. open'] ?? '0'),
            high: parseFloat(v['2. high'] ?? '0'),
            low: parseFloat(v['3. low'] ?? '0'),
            close: parseFloat(v['4. close'] ?? '0'),
            volume: parseInt(v['5. volume'] ?? '0', 10),
          })
        }
      }

      return prices.sort((a, b) => a.date.localeCompare(b.date))
    } catch (error) {
      console.error(`Failed to fetch historical prices for ${symbol}:`, error)
      return []
    }
  }

  async getPriceAtDate(symbol: string, date: Date): Promise<number | null> {
    const endDate = new Date(date)
    endDate.setDate(endDate.getDate() + 7)

    const startDate = new Date(date)
    startDate.setDate(startDate.getDate() - 7)

    const prices = await this.getHistoricalPrices(symbol, startDate, endDate)

    const targetDateStr = date.toISOString().split('T')[0]

    const exactMatch = prices.find(p => p.date === targetDateStr)
    if (exactMatch) {
      return exactMatch.close
    }

    if (prices.length === 0) {
      return null
    }

    const closestPrice = prices.reduce((closest, current) => {
      const currentDiff = Math.abs(new Date(current.date).getTime() - date.getTime())
      const closestDiff = Math.abs(new Date(closest.date).getTime() - date.getTime())
      return currentDiff < closestDiff ? current : closest
    })

    return closestPrice.close
  }

  calculateReturn(entryPrice: number, currentPrice: number): number {
    if (entryPrice === 0) return 0
    return ((currentPrice - entryPrice) / entryPrice) * 100
  }

  async calculatePerformanceMetrics(
    symbol: string,
    entryDate: Date,
    entryPrice?: number
  ): Promise<{
    entryPrice: number
    currentPrice: number
    return7d: number | null
    return30d: number | null
    return90d: number | null
    returnTotal: number
  } | null> {
    const entry = entryPrice || (await this.getPriceAtDate(symbol, entryDate))
    if (!entry) return null

    const current = await this.getCurrentPrice(symbol)
    if (!current) return null

    const now = new Date()
    const price7dAgo = await this.getPriceAtDate(symbol, new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000))
    const price30dAgo = await this.getPriceAtDate(symbol, new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000))
    const price90dAgo = await this.getPriceAtDate(symbol, new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000))

    return {
      entryPrice: entry,
      currentPrice: current.price,
      return7d: price7dAgo ? this.calculateReturn(price7dAgo, current.price) : null,
      return30d: price30dAgo ? this.calculateReturn(price30dAgo, current.price) : null,
      return90d: price90dAgo ? this.calculateReturn(price90dAgo, current.price) : null,
      returnTotal: this.calculateReturn(entry, current.price),
    }
  }
}

export const priceFetcher = new PriceFetcher()
