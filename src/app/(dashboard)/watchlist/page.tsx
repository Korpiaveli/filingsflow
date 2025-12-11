import { createClient } from '@/lib/supabase/server'
import { WatchlistTable } from '@/components/watchlist/watchlist-table'
import { AddTickerForm } from '@/components/watchlist/add-ticker-form'
import type { Tables } from '@/types/database'

type Watchlist = Tables<'watchlists'>

export const dynamic = 'force-dynamic'

export default async function WatchlistPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from('users')
    .select('subscription_tier')
    .eq('id', user.id)
    .single()

  const tier = profile?.subscription_tier || 'free'
  const maxTickers = tier === 'free' ? 5 : tier === 'pro' ? 25 : 100

  const { data: watchlist, error } = await supabase
    .from('watchlists')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const items = (watchlist || []) as Watchlist[]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Watchlist</h1>
          <p className="text-gray-600 mt-1">
            Track tickers and get alerts when insiders trade
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {items.length} / {maxTickers} tickers
        </div>
      </div>

      <div className="bg-white rounded-lg border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Add Ticker</h2>
        <AddTickerForm
          currentCount={items.length}
          maxCount={maxTickers}
          tier={tier}
        />
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Error loading watchlist. Please try again.
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center">
          <p className="text-gray-500">Your watchlist is empty.</p>
          <p className="text-sm text-gray-400 mt-2">
            Add tickers above to start tracking insider activity.
          </p>
        </div>
      ) : (
        <WatchlistTable items={items} />
      )}
    </div>
  )
}
