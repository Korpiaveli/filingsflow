'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Tables } from '@/types/database'

type NotificationPrefs = Tables<'notification_preferences'>

interface NotificationSettingsProps {
  prefs: NotificationPrefs | null
}

export function NotificationSettings({ prefs }: NotificationSettingsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [emailEnabled, setEmailEnabled] = useState(prefs?.email_enabled ?? true)
  const [emailFrequency, setEmailFrequency] = useState(prefs?.email_frequency ?? 'daily')
  const [discordEnabled, setDiscordEnabled] = useState(prefs?.discord_dm_enabled ?? false)
  const [minValue, setMinValue] = useState(prefs?.min_transaction_value ?? 0)
  const [cSuiteOnly, setCSuiteOnly] = useState(prefs?.c_suite_only ?? false)
  const router = useRouter()

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/settings/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_enabled: emailEnabled,
          email_frequency: emailFrequency,
          discord_dm_enabled: discordEnabled,
          min_transaction_value: minValue,
          c_suite_only: cSuiteOnly,
        }),
      })

      if (res.ok) {
        router.refresh()
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="bg-white rounded-lg border p-6">
      <h2 className="text-lg font-semibold mb-4">Notification Preferences</h2>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <label className="font-medium text-gray-900">Email Notifications</label>
            <p className="text-sm text-gray-500">Receive alerts via email</p>
          </div>
          <input
            type="checkbox"
            checked={emailEnabled}
            onChange={(e) => setEmailEnabled(e.target.checked)}
            className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
          />
        </div>

        {emailEnabled && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Frequency
            </label>
            <select
              value={emailFrequency}
              onChange={(e) => setEmailFrequency(e.target.value as 'realtime' | 'daily' | 'weekly' | 'never')}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
            >
              <option value="realtime">Real-time (Pro/Premium)</option>
              <option value="daily">Daily digest</option>
              <option value="weekly">Weekly digest</option>
              <option value="never">Never</option>
            </select>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <label className="font-medium text-gray-900">Discord DM Alerts</label>
            <p className="text-sm text-gray-500">Get DMs from the FilingsFlow bot</p>
          </div>
          <input
            type="checkbox"
            checked={discordEnabled}
            onChange={(e) => setDiscordEnabled(e.target.checked)}
            className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Minimum Transaction Value
          </label>
          <select
            value={minValue}
            onChange={(e) => setMinValue(Number(e.target.value))}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
          >
            <option value={0}>Any value</option>
            <option value={10000}>$10,000+</option>
            <option value={50000}>$50,000+</option>
            <option value={100000}>$100,000+</option>
            <option value={500000}>$500,000+</option>
            <option value={1000000}>$1,000,000+</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="font-medium text-gray-900">C-Suite Only</label>
            <p className="text-sm text-gray-500">
              Only alert for CEO, CFO, COO, and other top executives
            </p>
          </div>
          <input
            type="checkbox"
            checked={cSuiteOnly}
            onChange={(e) => setCSuiteOnly(e.target.checked)}
            className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
          />
        </div>

        <div className="pt-4 border-t">
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </section>
  )
}
