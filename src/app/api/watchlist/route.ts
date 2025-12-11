import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const TIER_LIMITS = {
  free: 5,
  pro: 25,
  premium: 100,
} as const

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('watchlists')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { ticker } = body

  if (!ticker || typeof ticker !== 'string') {
    return NextResponse.json({ error: 'Ticker is required' }, { status: 400 })
  }

  const cleanTicker = ticker.toUpperCase().trim()
  if (!/^[A-Z]{1,10}$/.test(cleanTicker)) {
    return NextResponse.json({ error: 'Invalid ticker format' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('subscription_tier')
    .eq('id', user.id)
    .single()

  const tier = (profile?.subscription_tier || 'free') as keyof typeof TIER_LIMITS
  const maxTickers = TIER_LIMITS[tier]

  const { count } = await supabase
    .from('watchlists')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if ((count || 0) >= maxTickers) {
    return NextResponse.json(
      { error: `Watchlist limit reached. Upgrade for more tickers.` },
      { status: 403 }
    )
  }

  const { data: existing } = await supabase
    .from('watchlists')
    .select('id')
    .eq('user_id', user.id)
    .eq('ticker', cleanTicker)
    .single()

  if (existing) {
    return NextResponse.json(
      { error: `${cleanTicker} is already in your watchlist` },
      { status: 409 }
    )
  }

  const { data, error } = await supabase
    .from('watchlists')
    .insert({
      user_id: user.id,
      ticker: cleanTicker,
      alert_on_insider: true,
      alert_on_13f: true,
      alert_on_8k: false,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
