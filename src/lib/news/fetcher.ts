import { createClient } from '@supabase/supabase-js'
import type { NewsItem, NewsContext } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

const USER_AGENT = 'FilingsFlow/1.0 (RSS Reader)'
const CACHE_HOURS = 1
const NEWS_LIMIT = 5

export async function getNewsContext(ticker: string): Promise<NewsContext> {
  const cachedNews = await getCachedNews(ticker)

  if (cachedNews.length > 0) {
    const latestNewsAge = cachedNews[0]
      ? Math.floor((Date.now() - cachedNews[0].publishedAt.getTime()) / (1000 * 60 * 60))
      : null

    return {
      recentNews: cachedNews.slice(0, 3),
      has8K: cachedNews.some(n => n.source === 'sec_8k'),
      latestNewsAge,
    }
  }

  const freshNews = await fetchFreshNews(ticker)

  if (freshNews.length > 0) {
    await cacheNews(ticker, freshNews)
  }

  const has8K = await check8KFilings(ticker)

  const latestNewsAge = freshNews[0]
    ? Math.floor((Date.now() - freshNews[0].publishedAt.getTime()) / (1000 * 60 * 60))
    : null

  return {
    recentNews: freshNews.slice(0, 3),
    has8K,
    latestNewsAge,
  }
}

async function getCachedNews(ticker: string): Promise<NewsItem[]> {
  const cacheThreshold = new Date()
  cacheThreshold.setHours(cacheThreshold.getHours() - CACHE_HOURS)

  const { data, error } = await supabase
    .from('news_cache')
    .select('source, title, url, published_at, snippet')
    .eq('ticker', ticker.toUpperCase())
    .gte('fetched_at', cacheThreshold.toISOString())
    .order('published_at', { ascending: false })
    .limit(NEWS_LIMIT)

  if (error || !data) return []

  return data.map(row => ({
    source: row.source as NewsItem['source'],
    title: row.title,
    url: row.url,
    publishedAt: new Date(row.published_at),
    snippet: row.snippet,
  }))
}

async function fetchFreshNews(ticker: string): Promise<NewsItem[]> {
  const [yahooNews, googleNews] = await Promise.allSettled([
    fetchYahooNews(ticker),
    fetchGoogleNews(ticker),
  ])

  const allNews: NewsItem[] = []

  if (yahooNews.status === 'fulfilled') {
    allNews.push(...yahooNews.value)
  }

  if (googleNews.status === 'fulfilled') {
    allNews.push(...googleNews.value)
  }

  allNews.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())

  const seen = new Set<string>()
  return allNews.filter(item => {
    const key = item.title.toLowerCase().slice(0, 50)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, NEWS_LIMIT)
}

async function fetchYahooNews(ticker: string): Promise<NewsItem[]> {
  try {
    const url = `https://finance.yahoo.com/rss/headline?s=${encodeURIComponent(ticker)}`
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) return []

    const xml = await response.text()
    return parseRSSFeed(xml, 'yahoo')
  } catch {
    return []
  }
}

async function fetchGoogleNews(ticker: string): Promise<NewsItem[]> {
  try {
    const query = encodeURIComponent(`${ticker} stock`)
    const url = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) return []

    const xml = await response.text()
    return parseRSSFeed(xml, 'google')
  } catch {
    return []
  }
}

function parseRSSFeed(xml: string, source: 'yahoo' | 'google'): NewsItem[] {
  const items: NewsItem[] = []
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g)

  for (const match of itemMatches) {
    const itemXml = match[1] ?? ''

    const title = extractTag(itemXml, 'title')
    const link = extractTag(itemXml, 'link')
    const pubDate = extractTag(itemXml, 'pubDate')
    const description = extractTag(itemXml, 'description')

    if (title && link) {
      items.push({
        source,
        title: decodeHTMLEntities(title),
        url: link,
        publishedAt: pubDate ? new Date(pubDate) : new Date(),
        snippet: description ? truncate(decodeHTMLEntities(stripHtml(description)), 150) : null,
      })
    }

    if (items.length >= NEWS_LIMIT) break
  }

  return items
}

function extractTag(xml: string, tag: string): string | null {
  const cdataMatch = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'))
  if (cdataMatch) return cdataMatch[1]?.trim() || null

  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return match?.[1]?.trim() || null
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '')
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

async function cacheNews(ticker: string, news: NewsItem[]): Promise<void> {
  const rows = news.map(item => ({
    ticker: ticker.toUpperCase(),
    source: item.source,
    title: item.title,
    url: item.url,
    published_at: item.publishedAt.toISOString(),
    snippet: item.snippet,
  }))

  await supabase
    .from('news_cache')
    .upsert(rows, { onConflict: 'url', ignoreDuplicates: true })
}

async function check8KFilings(ticker: string): Promise<boolean> {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const { data, error } = await supabase
    .from('filings')
    .select('id')
    .eq('ticker', ticker.toUpperCase())
    .eq('form_type', '8-K')
    .gte('filed_at', weekAgo.toISOString())
    .limit(1)

  return !error && !!data && data.length > 0
}

export async function fetchNewsForTickers(tickers: string[]): Promise<void> {
  for (const ticker of tickers) {
    try {
      await getNewsContext(ticker)
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (error) {
      console.error(`Failed to fetch news for ${ticker}:`, error)
    }
  }
}

export async function cleanupExpiredCache(): Promise<number> {
  const { data, error } = await supabase.rpc('cleanup_expired_news_cache')
  if (error) {
    console.error('Failed to cleanup news cache:', error)
    return 0
  }
  return data ?? 0
}
