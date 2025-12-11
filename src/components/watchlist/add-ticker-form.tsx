'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface AddTickerFormProps {
  currentCount: number
  maxCount: number
  tier: string
}

export function AddTickerForm({ currentCount, maxCount, tier }: AddTickerFormProps) {
  const [ticker, setTicker] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const canAdd = currentCount < maxCount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticker.trim() || !canAdd) return

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: ticker.toUpperCase().trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add ticker')
      }

      setTicker('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
      <div className="flex-1">
        <input
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          placeholder="Enter ticker symbol (e.g., AAPL)"
          className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-primary uppercase"
          disabled={!canAdd || isLoading}
          maxLength={10}
        />
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
      <button
        type="submit"
        disabled={!ticker.trim() || !canAdd || isLoading}
        className="px-6 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Adding...' : 'Add to Watchlist'}
      </button>
      {!canAdd && (
        <div className="text-sm text-amber-600 self-center">
          {tier === 'free' ? (
            <span>Upgrade to Pro for more tickers</span>
          ) : tier === 'pro' ? (
            <span>Upgrade to Premium for more tickers</span>
          ) : (
            <span>Maximum tickers reached</span>
          )}
        </div>
      )}
    </form>
  )
}
