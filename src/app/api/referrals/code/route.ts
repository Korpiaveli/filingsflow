import { createClient } from '@/lib/supabase/server'
import { getOrCreateReferralCode } from '@/lib/referrals'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const code = await getOrCreateReferralCode(supabase, user.id)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://filingsflow.com'

    return NextResponse.json({
      code,
      url: `${baseUrl}/signup?ref=${code}`,
    })
  } catch (error) {
    console.error('Failed to get referral code:', error)
    return NextResponse.json(
      { error: 'Failed to get referral code' },
      { status: 500 }
    )
  }
}
