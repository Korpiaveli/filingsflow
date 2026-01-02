export interface NewsItem {
  source: 'yahoo' | 'google' | 'sec_8k'
  title: string
  url: string
  publishedAt: Date
  snippet: string | null
}

export interface NewsContext {
  recentNews: NewsItem[]
  has8K: boolean
  latestNewsAge: number | null
}
