import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { alerts_enabled } = body

  if (typeof alerts_enabled !== 'boolean') {
    return NextResponse.json({ error: 'alerts_enabled must be a boolean' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('watchlists')
    .update({
      alert_on_insider: alerts_enabled,
      alert_on_13f: alerts_enabled,
      alert_on_8k: alerts_enabled,
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    alerts_enabled: data.alert_on_insider
  })
}
