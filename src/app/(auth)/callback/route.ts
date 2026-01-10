import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { UpdateTables } from '@/types/database'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirect = searchParams.get('redirect') || '/filings'
  const ref = searchParams.get('ref')
  const errorDescription = searchParams.get('error_description')

  if (errorDescription) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription)}`
    )
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user?.user_metadata) {
        const { full_name, avatar_url, provider_id } = user.user_metadata

        const updateData: UpdateTables<'users'> = {
          discord_id: provider_id,
          discord_username: full_name,
          avatar_url,
        }

        await supabase
          .from('users')
          .update(updateData)
          .eq('id', user.id)
      }

      if (ref && user) {
        try {
          await fetch(`${origin}/api/referrals/track`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: ref, userId: user.id }),
          })
        } catch {
          // Referral tracking failure shouldn't block auth
        }
      }

      return NextResponse.redirect(`${origin}${redirect}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
