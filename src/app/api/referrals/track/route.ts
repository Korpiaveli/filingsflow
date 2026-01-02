import { createServiceClient } from '@/lib/supabase/server'
import { trackReferral } from '@/lib/referrals'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function POST(request: Request) {
  try {
    const { code, userId } = await request.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Code is required' },
        { status: 400 }
      )
    }

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }

    const headersList = await headers()
    const forwardedFor = headersList.get('x-forwarded-for')
    const realIp = headersList.get('x-real-ip')
    const signupIp = forwardedFor?.split(',')[0]?.trim() || realIp || null

    const supabase = await createServiceClient()
    const result = await trackReferral(supabase, code, userId, signupIp)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to track referral:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to track referral' },
      { status: 500 }
    )
  }
}
