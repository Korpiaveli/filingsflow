import { createServiceClient } from '@/lib/supabase/server'
import { validateReferralCode } from '@/lib/referrals'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { code } = await request.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'Code is required' },
        { status: 400 }
      )
    }

    const supabase = await createServiceClient()
    const result = await validateReferralCode(supabase, code)

    return NextResponse.json({
      valid: result.valid,
      referrerName: result.referrerName,
    })
  } catch (error) {
    console.error('Failed to validate referral code:', error)
    return NextResponse.json(
      { valid: false, error: 'Failed to validate code' },
      { status: 500 }
    )
  }
}
