import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const TIER_LIMITS = {
  free: 3,
  pro: 15,
  premium: 50,
} as const

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('tracked_funds')
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
  const { cik, fundName } = body

  if (!cik || typeof cik !== 'string') {
    return NextResponse.json({ error: 'Fund CIK is required' }, { status: 400 })
  }

  const cleanCik = cik.replace(/^0+/, '').trim()
  if (!/^\d+$/.test(cleanCik)) {
    return NextResponse.json({ error: 'Invalid CIK format' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('subscription_tier')
    .eq('id', user.id)
    .single()

  const tier = (profile?.subscription_tier || 'free') as keyof typeof TIER_LIMITS
  const maxFunds = TIER_LIMITS[tier]

  const { count } = await supabase
    .from('tracked_funds')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if ((count || 0) >= maxFunds) {
    return NextResponse.json(
      { error: `Fund tracking limit reached. Upgrade for more.` },
      { status: 403 }
    )
  }

  const { data: existing } = await supabase
    .from('tracked_funds')
    .select('id')
    .eq('user_id', user.id)
    .eq('cik', cleanCik)
    .single()

  if (existing) {
    return NextResponse.json(
      { error: `This fund is already being tracked` },
      { status: 409 }
    )
  }

  const { data, error } = await supabase
    .from('tracked_funds')
    .insert({
      user_id: user.id,
      cik: cleanCik,
      fund_name: fundName || `Fund ${cleanCik}`,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
