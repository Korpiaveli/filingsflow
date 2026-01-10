'use client'

import { useState, useTransition } from 'react'
import { Bell, BellOff } from 'lucide-react'

interface AlertToggleProps {
  watchlistId: string
  ticker: string
  initialEnabled: boolean
}

export function AlertToggle({ watchlistId, ticker, initialEnabled }: AlertToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [isPending, startTransition] = useTransition()

  const handleToggle = () => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/watchlist/${watchlistId}/alerts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alerts_enabled: !enabled }),
        })

        if (response.ok) {
          setEnabled(!enabled)
        }
      } catch (error) {
        console.error('Failed to toggle alerts:', error)
      }
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
        enabled
          ? 'bg-primary/10 text-primary hover:bg-primary/20'
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
      aria-label={`${enabled ? 'Disable' : 'Enable'} alerts for ${ticker}`}
    >
      {enabled ? (
        <>
          <Bell className="w-4 h-4" />
          Alerts On
        </>
      ) : (
        <>
          <BellOff className="w-4 h-4" />
          Alerts Off
        </>
      )}
    </button>
  )
}
