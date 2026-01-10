'use client'

import { useState } from 'react'
import type { ReferralStats } from '@/lib/referrals'
import { REFERRAL_MILESTONES } from '@/lib/referrals'

interface ReferralCardProps {
  stats: ReferralStats
}

export function ReferralCard({ stats }: ReferralCardProps) {
  const [copied, setCopied] = useState(false)

  const referralUrl = `https://filingsflow.com/signup?ref=${stats.code}`

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(referralUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const progressToNext = stats.nextMilestone
    ? (stats.confirmedReferrals / stats.nextMilestone) * 100
    : 100

  return (
    <section className="bg-white rounded-lg border p-6">
      <h2 className="text-lg font-semibold mb-4">Referral Program</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">
            Your Referral Link
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={referralUrl}
              className="flex-1 px-3 py-2 border rounded-md bg-gray-50 text-sm text-gray-700"
            />
            <button
              onClick={copyToClipboard}
              className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Code: <span className="font-mono font-medium">{stats.code}</span>
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 py-4 border-y">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.confirmedReferrals}</p>
            <p className="text-xs text-gray-500">Confirmed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.pendingReferrals}</p>
            <p className="text-xs text-gray-500">Pending</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              ${(stats.creditsEarnedCents / 100).toFixed(0)}
            </p>
            <p className="text-xs text-gray-500">Earned</p>
          </div>
        </div>

        {stats.nextMilestone && (
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">
                Progress to {stats.nextMilestone} referrals
              </span>
              <span className="font-medium text-gray-900">
                {stats.confirmedReferrals}/{stats.nextMilestone}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.min(progressToNext, 100)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Earn ${((stats.creditsAtNextCents || 0) / 100).toFixed(0)} at {stats.nextMilestone} referrals
            </p>
          </div>
        )}

        <div className="bg-gray-50 rounded-md p-3">
          <p className="text-sm font-medium text-gray-700 mb-2">Milestone Rewards</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {REFERRAL_MILESTONES.map((m) => {
              const achieved = stats.confirmedReferrals >= m.count
              return (
                <div
                  key={m.count}
                  className={`flex justify-between px-2 py-1 rounded ${
                    achieved ? 'bg-green-100 text-green-800' : 'text-gray-600'
                  }`}
                >
                  <span>{m.count} referrals</span>
                  <span className="font-medium">${(m.amountCents / 100).toFixed(0)}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
