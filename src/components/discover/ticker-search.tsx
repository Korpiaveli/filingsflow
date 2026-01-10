'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

export function TickerSearch() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const ticker = query.trim().toUpperCase()
      if (ticker) {
        router.push(`/activity?ticker=${ticker}`)
      }
    },
    [query, router]
  )

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value.toUpperCase())}
          placeholder="Search ticker (e.g., AAPL)"
          className="w-full px-4 py-3 pr-12 text-lg font-mono bg-card border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/50"
          maxLength={10}
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Search
        </button>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        View all insider, 13F, and congressional activity for any ticker
      </p>
    </form>
  )
}
