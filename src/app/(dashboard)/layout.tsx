import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DISCLAIMER_SHORT } from '@/lib/utils/disclaimer'
import type { Tables } from '@/types/database'
import { MobileNav } from '@/components/layout/mobile-nav'
import { DesktopNav } from '@/components/layout/desktop-nav'
import { OnboardingModal } from '@/components/onboarding/onboarding-modal'
import { LayoutDashboard, Activity, Compass, Star } from 'lucide-react'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single() as { data: Tables<'users'> | null }

  const createdAt = new Date(profile?.created_at || user.created_at || Date.now())
  const isNewUser = Date.now() - createdAt.getTime() < 24 * 60 * 60 * 1000
  const displayName = profile?.discord_username?.split('#')[0] || user.email?.split('@')[0] || 'there'

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/activity', label: 'Activity', icon: Activity },
    { href: '/discover', label: 'Discover', icon: Compass },
    { href: '/watchlist', label: 'Watchlist', icon: Star },
  ]

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="bg-card/95 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="text-xl font-bold text-primary">
                FilingsFlow
              </Link>
              <DesktopNav links={navLinks} />
            </div>
            <div className="flex items-center gap-3">
              <TierBadge tier={profile?.subscription_tier || 'free'} />
              <Link
                href="/settings"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="w-8 h-8 rounded-full ring-2 ring-border"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    {user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {children}
      </main>

      <footer className="hidden md:block border-t bg-card mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-xs text-muted-foreground text-center">{DISCLAIMER_SHORT}</p>
        </div>
      </footer>

      <MobileNav links={navLinks} />
      <OnboardingModal isNewUser={isNewUser} userName={displayName} />
    </div>
  )
}

function TierBadge({ tier }: { tier: string }) {
  const tierStyles: Record<string, string> = {
    free: 'bg-muted text-muted-foreground',
    pro: 'bg-primary/10 text-primary',
    premium: 'bg-accent/20 text-accent-foreground',
  }

  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${tierStyles[tier] || tierStyles.free}`}>
      {tier}
    </span>
  )
}
