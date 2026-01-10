'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, TrendingUp, Clock, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface SearchResult {
  ticker: string
  name: string
  activity?: 'high' | 'medium' | 'low' | 'none'
}

interface SearchCommandProps {
  placeholder?: string
  className?: string
  autoFocus?: boolean
  onSelect?: (ticker: string) => void
}

const POPULAR_TICKERS: SearchResult[] = [
  { ticker: 'NVDA', name: 'NVIDIA Corporation', activity: 'high' },
  { ticker: 'AAPL', name: 'Apple Inc.', activity: 'medium' },
  { ticker: 'TSLA', name: 'Tesla, Inc.', activity: 'high' },
  { ticker: 'MSFT', name: 'Microsoft Corporation', activity: 'medium' },
  { ticker: 'GOOGL', name: 'Alphabet Inc.', activity: 'low' },
  { ticker: 'AMZN', name: 'Amazon.com, Inc.', activity: 'medium' },
  { ticker: 'META', name: 'Meta Platforms, Inc.', activity: 'low' },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.', activity: 'medium' },
]

const STORAGE_KEY = 'filingsflow_recent_searches'

function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function addRecentSearch(ticker: string) {
  if (typeof window === 'undefined') return
  try {
    const recent = getRecentSearches()
    const filtered = recent.filter((t) => t !== ticker)
    const updated = [ticker, ...filtered].slice(0, 5)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // Ignore storage errors
  }
}

const activityColors: Record<string, string> = {
  high: 'bg-emerald-500',
  medium: 'bg-amber-500',
  low: 'bg-slate-400',
  none: 'bg-slate-300',
}

export function SearchCommand({
  placeholder = 'Search by ticker or company name...',
  className,
  autoFocus = false,
  onSelect,
}: SearchCommandProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)

  useEffect(() => {
    setRecentSearches(getRecentSearches())
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const searchTickers = useCallback((searchQuery: string) => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) {
      setResults([])
      return
    }

    setIsLoading(true)

    setTimeout(() => {
      const filtered = POPULAR_TICKERS.filter(
        (t) =>
          t.ticker.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q)
      )
      setResults(filtered)
      setIsLoading(false)
    }, 150)
  }, [])

  useEffect(() => {
    const debounce = setTimeout(() => {
      searchTickers(query)
    }, 200)
    return () => clearTimeout(debounce)
  }, [query, searchTickers])

  const handleSelect = useCallback(
    (ticker: string) => {
      addRecentSearch(ticker)
      setQuery('')
      setIsOpen(false)
      setRecentSearches(getRecentSearches())

      if (onSelect) {
        onSelect(ticker)
      } else {
        router.push(`/activity?ticker=${ticker}`)
      }
    },
    [router, onSelect]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const items = query ? results : recentSearches.length > 0 ? recentSearches.map(t => ({ ticker: t })) : POPULAR_TICKERS

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => Math.max(prev - 1, -1))
          break
        case 'Enter':
          e.preventDefault()
          if (selectedIndex >= 0 && selectedIndex < items.length) {
            const item = items[selectedIndex]
            if (item) {
              handleSelect(typeof item === 'string' ? item : item.ticker)
            }
          } else if (query.trim()) {
            handleSelect(query.toUpperCase().trim())
          }
          break
        case 'Escape':
          setIsOpen(false)
          inputRef.current?.blur()
          break
      }
    },
    [query, results, recentSearches, selectedIndex, handleSelect]
  )

  const showDropdown = isOpen && (query || recentSearches.length > 0 || POPULAR_TICKERS.length > 0)

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelectedIndex(-1)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full pl-10 pr-10 py-2.5 bg-muted/50 border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('')
              setResults([])
              inputRef.current?.focus()
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        )}
      </div>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50"
          >
            {query ? (
              results.length > 0 ? (
                <div className="py-2">
                  {results.map((result, index) => (
                    <button
                      key={result.ticker}
                      onClick={() => handleSelect(result.ticker)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        selectedIndex === index
                          ? 'bg-primary/10'
                          : 'hover:bg-muted/50'
                      )}
                    >
                      <span className="font-semibold text-foreground min-w-[4rem]">
                        {result.ticker}
                      </span>
                      <span className="text-sm text-muted-foreground truncate flex-1">
                        {result.name}
                      </span>
                      {result.activity && (
                        <span
                          className={cn(
                            'w-2 h-2 rounded-full',
                            activityColors[result.activity]
                          )}
                          title={`${result.activity} activity`}
                        />
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    No results for &quot;{query}&quot;
                  </p>
                  <button
                    onClick={() => handleSelect(query.toUpperCase())}
                    className="mt-2 text-sm text-primary hover:underline"
                  >
                    Search for {query.toUpperCase()} anyway
                  </button>
                </div>
              )
            ) : (
              <div className="py-2">
                {recentSearches.length > 0 && (
                  <>
                    <div className="px-4 py-2 flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      <Clock className="w-3 h-3" />
                      Recent
                    </div>
                    {recentSearches.map((ticker, index) => (
                      <button
                        key={ticker}
                        onClick={() => handleSelect(ticker)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                          selectedIndex === index
                            ? 'bg-primary/10'
                            : 'hover:bg-muted/50'
                        )}
                      >
                        <span className="font-semibold text-foreground">
                          {ticker}
                        </span>
                      </button>
                    ))}
                    <div className="my-2 border-t border-border" />
                  </>
                )}
                <div className="px-4 py-2 flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <TrendingUp className="w-3 h-3" />
                  Popular
                </div>
                {POPULAR_TICKERS.slice(0, 5).map((result, index) => {
                  const adjustedIndex = recentSearches.length + index
                  return (
                    <button
                      key={result.ticker}
                      onClick={() => handleSelect(result.ticker)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        selectedIndex === adjustedIndex
                          ? 'bg-primary/10'
                          : 'hover:bg-muted/50'
                      )}
                    >
                      <span className="font-semibold text-foreground min-w-[4rem]">
                        {result.ticker}
                      </span>
                      <span className="text-sm text-muted-foreground truncate flex-1">
                        {result.name}
                      </span>
                      {result.activity && (
                        <span
                          className={cn(
                            'w-2 h-2 rounded-full',
                            activityColors[result.activity]
                          )}
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
