'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils/cn'

interface SubscriptionCardProps {
  tier: string
  status?: string | null
  trialEndsAt?: string | null
}

const TIER_FEATURES = {
  free: {
    name: 'Free',
    price: '$0',
    features: [
      '5 watchlist tickers',
      '24-hour delayed filings',
      'Basic search & filtering',
      'Web dashboard',
    ],
  },
  pro: {
    name: 'Pro',
    price: '$29/mo',
    features: [
      '25 watchlist tickers',
      'Real-time filings',
      'Email alerts',
      'Discord DM alerts',
      'AI-powered summaries',
      'API access',
    ],
  },
  premium: {
    name: 'Premium',
    price: '$79/mo',
    features: [
      '100 watchlist tickers',
      'Everything in Pro',
      '13F fund tracking',
      'Historical data export',
      'Custom Discord bot',
      'Priority support',
    ],
  },
} as const

export function SubscriptionCard({ tier, status, trialEndsAt }: SubscriptionCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const currentTier = TIER_FEATURES[tier as keyof typeof TIER_FEATURES] || TIER_FEATURES.free

  const handleUpgrade = async (targetTier: string) => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: targetTier }),
      })

      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleManage = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
      })

      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Subscription</h2>
        <span
          className={cn(
            'px-3 py-1 rounded-full text-sm font-medium',
            tier === 'premium'
              ? 'bg-purple-100 text-purple-700'
              : tier === 'pro'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700'
          )}
        >
          {currentTier.name}
        </span>
      </div>

      {status && status !== 'active' && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
          <p className="text-sm text-amber-700">
            Status: <span className="font-medium capitalize">{status}</span>
          </p>
        </div>
      )}

      {trialEndsAt && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-700">
            Trial ends: {new Date(trialEndsAt).toLocaleDateString()}
          </p>
        </div>
      )}

      <div className="mb-6">
        <p className="text-2xl font-bold">{currentTier.price}</p>
        <ul className="mt-4 space-y-2">
          {currentTier.features.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        {tier === 'free' && (
          <>
            <button
              onClick={() => handleUpgrade('pro')}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Upgrade to Pro - $29/mo'}
            </button>
            <button
              onClick={() => handleUpgrade('premium')}
              disabled={isLoading}
              className="w-full px-4 py-2 border border-primary text-primary rounded-md font-medium hover:bg-primary/10 disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Upgrade to Premium - $79/mo'}
            </button>
          </>
        )}

        {tier === 'pro' && (
          <>
            <button
              onClick={() => handleUpgrade('premium')}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Upgrade to Premium - $79/mo'}
            </button>
            <button
              onClick={handleManage}
              disabled={isLoading}
              className="w-full px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Manage Subscription'}
            </button>
          </>
        )}

        {tier === 'premium' && (
          <button
            onClick={handleManage}
            disabled={isLoading}
            className="w-full px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Manage Subscription'}
          </button>
        )}
      </div>
    </section>
  )
}
