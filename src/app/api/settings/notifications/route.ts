import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const {
    email_enabled,
    email_frequency,
    discord_dm_enabled,
    min_transaction_value,
    c_suite_only,
  } = body

  const { data: existing } = await supabase
    .from('notification_preferences')
    .select('id')
    .eq('user_id', user.id)
    .single()

  const updates = {
    user_id: user.id,
    email_enabled: email_enabled ?? true,
    email_frequency: email_frequency ?? 'daily',
    discord_dm_enabled: discord_dm_enabled ?? false,
    min_transaction_value: min_transaction_value ?? null,
    c_suite_only: c_suite_only ?? false,
    updated_at: new Date().toISOString(),
  }

  let result
  if (existing) {
    result = await supabase
      .from('notification_preferences')
      .update(updates)
      .eq('id', existing.id)
      .select()
      .single()
  } else {
    result = await supabase
      .from('notification_preferences')
      .insert(updates)
      .select()
      .single()
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 })
  }

  return NextResponse.json(result.data)
}
