import Link from 'next/link'
import { TrendingUp, Building2, Landmark, Sparkles, ArrowRight, Check, Star, Activity, Target } from 'lucide-react'

const DISCLAIMER = `FilingsFlow provides SEC filing data and AI-generated summaries for informational purposes only. This is not investment advice. All investment decisions should be made in consultation with a qualified financial advisor.`

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-primary">FilingsFlow</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-sm font-medium text-primary mb-8">
                <Sparkles className="w-4 h-4" />
                AI-Powered SEC Intelligence
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground">
                See what the smart money
                <br />
                <span className="text-primary">is buying</span>
              </h1>
              <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Real-time SEC filing intelligence with AI-powered summaries.
                Track insider transactions, 13F holdings, and congressional trades
                before the market catches on.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/signup"
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3.5 rounded-xl text-base font-semibold hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl"
                >
                  Start Free Trial
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="#features"
                  className="text-muted-foreground hover:text-foreground px-8 py-3.5 text-base font-medium transition-colors"
                >
                  Learn more
                </Link>
              </div>
            </div>

            <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
              <SignalPreview
                icon={<TrendingUp className="w-5 h-5 text-[hsl(var(--signal-buy))]" />}
                label="Cluster Detected"
                ticker="NVDA"
                detail="5 insiders bought $12M this week"
              />
              <SignalPreview
                icon={<Building2 className="w-5 h-5 text-emerald-600" />}
                label="13F Filing"
                ticker="AAPL"
                detail="Berkshire added 2.3M shares"
              />
              <SignalPreview
                icon={<Landmark className="w-5 h-5 text-indigo-600" />}
                label="Congress Trade"
                ticker="MSFT"
                detail="Sen. Johnson purchased $50K-$100K"
              />
            </div>
          </div>
        </section>

        <section id="features" className="bg-muted/30 py-24 border-y">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Everything you need to track SEC filings
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                From insider trades to institutional holdings, get the complete picture of market activity
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard
                icon={<Activity className="w-6 h-6" />}
                iconBg="bg-primary/10"
                iconColor="text-primary"
                title="Insider Transactions"
                description="Get alerts when executives buy or sell company stock. Filter by transaction size, insider role, and more."
              />
              <FeatureCard
                icon={<Building2 className="w-6 h-6" />}
                iconBg="bg-emerald-500/10"
                iconColor="text-emerald-600 dark:text-emerald-400"
                title="13F Holdings"
                description="Track what hedge funds and institutional investors are buying. See quarter-over-quarter position changes."
              />
              <FeatureCard
                icon={<Target className="w-6 h-6" />}
                iconBg="bg-amber-500/10"
                iconColor="text-amber-600 dark:text-amber-400"
                title="Cluster Detection"
                description="Identify unusual patterns when multiple insiders trade the same stock—a potentially significant signal."
              />
              <FeatureCard
                icon={<Landmark className="w-6 h-6" />}
                iconBg="bg-indigo-500/10"
                iconColor="text-indigo-600 dark:text-indigo-400"
                title="Congressional Trades"
                description="Monitor stock trades disclosed by members of Congress. Stay informed on political insider activity."
              />
              <FeatureCard
                icon={<Sparkles className="w-6 h-6" />}
                iconBg="bg-purple-500/10"
                iconColor="text-purple-600 dark:text-purple-400"
                title="AI Summaries"
                description="Dense SEC filings transformed into plain English. Understand what matters in seconds, not hours."
              />
              <FeatureCard
                icon={<Star className="w-6 h-6" />}
                iconBg="bg-rose-500/10"
                iconColor="text-rose-600 dark:text-rose-400"
                title="Custom Watchlists"
                description="Build personalized watchlists and get instant alerts when activity happens on your tracked tickers."
              />
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Simple, transparent pricing</h2>
              <p className="text-lg text-muted-foreground">Start free. Upgrade when you need more.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <PricingCard
                tier="Free"
                price="$0"
                description="Get started with the basics"
                features={[
                  '5 watchlist tickers',
                  '24-hour delayed filings',
                  'Basic search',
                  'Web dashboard',
                ]}
              />
              <PricingCard
                tier="Pro"
                price="$29"
                period="/month"
                description="For active investors"
                featured
                features={[
                  '25 watchlist tickers',
                  'Real-time alerts',
                  'AI summaries',
                  'Discord notifications',
                  'Email digests',
                  'Insider cluster detection',
                ]}
              />
              <PricingCard
                tier="Premium"
                price="$79"
                period="/month"
                description="Maximum coverage"
                features={[
                  '100 watchlist tickers',
                  'Everything in Pro',
                  'Priority support',
                  'Early access to new features',
                  'Extended data retention',
                  'Custom alert filters',
                ]}
              />
            </div>
          </div>
        </section>

        <section className="bg-primary/5 py-24 border-y">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Ready to see what the smart money is doing?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join thousands of investors who get their edge from FilingsFlow.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-xl text-lg font-semibold hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl"
            >
              Start Your Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <p className="text-xs text-muted-foreground text-center max-w-3xl mx-auto leading-relaxed">
            {DISCLAIMER}
          </p>
          <p className="text-sm text-muted-foreground/70 text-center mt-4">
            &copy; {new Date().getFullYear()} FilingsFlow. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

function SignalPreview({
  icon,
  label,
  ticker,
  detail,
}: {
  icon: React.ReactNode
  label: string
  ticker: string
  detail: string
}) {
  return (
    <div className="bg-card border-2 border-border/50 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="font-bold text-foreground mb-1">{ticker}</p>
      <p className="text-sm text-muted-foreground">{detail}</p>
    </div>
  )
}

function FeatureCard({
  icon,
  iconBg,
  iconColor,
  title,
  description,
}: {
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  title: string
  description: string
}) {
  return (
    <div className="bg-card border-2 border-border/50 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center mb-4`}>
        <span className={iconColor}>{icon}</span>
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

function PricingCard({
  tier,
  price,
  period,
  description,
  features,
  featured,
}: {
  tier: string
  price: string
  period?: string
  description: string
  features: string[]
  featured?: boolean
}) {
  return (
    <div
      className={`relative rounded-2xl p-6 ${
        featured
          ? 'bg-gradient-to-br from-primary/5 via-background to-background border-2 border-primary shadow-xl'
          : 'bg-card border-2 border-border/50'
      }`}
    >
      {featured && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
          Most Popular
        </span>
      )}
      <h3 className="text-xl font-bold text-foreground">{tier}</h3>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
      <div className="mt-4 mb-6">
        <span className="text-4xl font-bold text-foreground">{price}</span>
        {period && <span className="text-muted-foreground">{period}</span>}
      </div>
      <ul className="space-y-3 mb-8">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[hsl(var(--signal-buy))]" />
            <span className="text-sm text-muted-foreground">{feature}</span>
          </li>
        ))}
      </ul>
      <Link
        href="/signup"
        className={`block text-center py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
          featured
            ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
            : 'border-2 border-border hover:bg-muted'
        }`}
      >
        {tier === 'Free' ? 'Get Started' : 'Start Free Trial'}
      </Link>
    </div>
  )
}
