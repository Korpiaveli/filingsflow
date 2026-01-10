'use client'

import { useState, useTransition } from 'react'
import { Plus, Check, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface WatchButtonProps {
  ticker: string
  isWatched?: boolean
  variant?: 'default' | 'compact'
}

export function WatchButton({ ticker, isWatched = false, variant = 'default' }: WatchButtonProps) {
  const [watched, setWatched] = useState(isWatched)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (watched) return

    setError(null)
    startTransition(async () => {
      try {
        const response = await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticker }),
        })

        if (response.ok) {
          setWatched(true)
          router.refresh()
        } else {
          const data = await response.json()
          if (response.status === 409) {
            setWatched(true)
          } else {
            setError(data.error || 'Failed to add')
          }
        }
      } catch {
        setError('Network error')
      }
    })
  }

  if (variant === 'compact') {
    return (
      <button
        onClick={handleClick}
        disabled={isPending || watched}
        className={`p-1.5 rounded-lg transition-all ${
          watched
            ? 'bg-primary/10 text-primary cursor-default'
            : 'bg-muted hover:bg-primary/10 hover:text-primary'
        } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={watched ? 'Watching' : `Add ${ticker} to watchlist`}
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : watched ? (
          <Check className="w-4 h-4" />
        ) : (
          <Plus className="w-4 h-4" />
        )}
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending || watched}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
        watched
          ? 'bg-primary/10 text-primary cursor-default'
          : 'bg-muted hover:bg-primary/10 hover:text-primary'
      } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={error || undefined}
    >
      {isPending ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Adding...
        </>
      ) : watched ? (
        <>
          <Check className="w-3.5 h-3.5" />
          Watching
        </>
      ) : (
        <>
          <Plus className="w-3.5 h-3.5" />
          Watch
        </>
      )}
    </button>
  )
}
