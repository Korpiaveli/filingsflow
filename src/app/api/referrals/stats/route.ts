import { createClient } from '@/lib/supabase/server'
import { getReferralStats } from '@/lib/referrals'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const stats = await getReferralStats(supabase, user.id)

    if (!stats) {
      return NextResponse.json(
        { error: 'Failed to get referral stats' },
        { status: 500 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://filingsflow.com'

    return NextResponse.json({
      ...stats,
      url: `${baseUrl}/signup?ref=${stats.code}`,
    })
  } catch (error) {
    console.error('Failed to get referral stats:', error)
    return NextResponse.json(
      { error: 'Failed to get referral stats' },
      { status: 500 }
    )
  }
}
