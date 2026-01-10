import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { HeroSignal } from '@/components/dashboard/hero-signal'
import { WatchlistPulse } from '@/components/dashboard/watchlist-pulse'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { CongressCard } from '@/components/dashboard/congress-card'
import { InstitutionalCard } from '@/components/dashboard/institutional-card'
import { AnimatedDashboard } from '@/components/dashboard/animated-dashboard'

export const dynamic = 'force-dynamic'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  const displayName = profile?.discord_username?.split('#')[0] || user.email?.split('@')[0] || 'there'

  return (
    <AnimatedDashboard
      greeting={
        <>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {getGreeting()}, {displayName}.
          </h1>
          <p className="text-lg text-muted-foreground">
            Here&apos;s what matters today.
          </p>
        </>
      }
      heroSignal={<HeroSignal userId={user.id} />}
      watchlistPulse={<WatchlistPulse userId={user.id} />}
      activityFeed={<ActivityFeed userId={user.id} limit={10} />}
      congressCard={<CongressCard />}
      institutionalCard={<InstitutionalCard />}
    />
  )
}
