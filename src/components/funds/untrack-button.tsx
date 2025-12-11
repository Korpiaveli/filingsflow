'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function UntrackButton({ fundId, fundName }: { fundId: string; fundName: string }) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleUntrack = async () => {
    if (!confirm(`Stop tracking ${fundName}?`)) return

    setIsLoading(true)

    try {
      const response = await fetch(`/api/tracked-funds/${fundId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to untrack fund')
      }

      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to untrack fund')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleUntrack}
      disabled={isLoading}
      className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
    >
      {isLoading ? 'Removing...' : 'Untrack'}
    </button>
  )
}
