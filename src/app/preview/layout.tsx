import Link from 'next/link'

export default function PreviewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-amber-500 text-black text-center py-2 text-sm font-medium">
        🎨 UI Preview Mode — Sample data shown for review purposes
      </div>
      <header className="bg-card border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link href="/preview" className="text-xl font-bold text-primary">
                FilingsFlow
              </Link>
              <nav className="hidden md:flex items-center gap-6">
                <NavLink href="/preview">Dashboard</NavLink>
                <NavLink href="/preview/activity">Activity</NavLink>
                <NavLink href="/preview/discover">Discover</NavLink>
                <NavLink href="/preview/watchlist">Watchlist</NavLink>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs px-2 py-1 rounded-full font-medium capitalize bg-primary/10 text-primary">
                pro
              </span>
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                D
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="border-t bg-card mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-xs text-muted-foreground text-center">
            Preview Mode — Not financial advice. For informational purposes only.
          </p>
        </div>
      </footer>
    </div>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
    >
      {children}
    </Link>
  )
}
