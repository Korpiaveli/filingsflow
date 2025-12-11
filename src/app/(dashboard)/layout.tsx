import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DISCLAIMER_SHORT } from '@/lib/utils/disclaimer'
import type { Tables } from '@/types/database'

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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link href="/filings" className="text-xl font-bold text-primary">
                FilingsFlow
              </Link>
              <nav className="hidden md:flex items-center gap-6">
                <NavLink href="/filings">Filings</NavLink>
                <NavLink href="/insiders">Insiders</NavLink>
                <NavLink href="/funds">Funds</NavLink>
                <NavLink href="/clusters">Clusters</NavLink>
                <NavLink href="/watchlist">Watchlist</NavLink>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600 capitalize">
                {profile?.subscription_tier || 'free'}
              </span>
              <Link
                href="/settings"
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="w-8 h-8 rounded-full"
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="border-t bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-xs text-gray-400 text-center">{DISCLAIMER_SHORT}</p>
        </div>
      </footer>
    </div>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
    >
      {children}
    </Link>
  )
}
