import Link from 'next/link'

const DISCLAIMER = `FilingsFlow provides SEC filing data and AI-generated summaries for informational purposes only. This is not investment advice. All investment decisions should be made in consultation with a qualified financial advisor.`

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-primary">FilingsFlow</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-gray-900">
              See what the smart money
              <br />
              <span className="text-primary">is buying</span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
              Real-time SEC filing intelligence with AI-powered summaries.
              Track insider transactions, 13F holdings, and fund position changes
              before the market catches on.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                href="/signup"
                className="bg-primary text-primary-foreground px-8 py-3 rounded-md text-base font-medium hover:bg-primary/90"
              >
                Start Free Trial
              </Link>
              <Link
                href="#features"
                className="text-gray-600 hover:text-gray-900 px-8 py-3 text-base font-medium"
              >
                Learn more
              </Link>
            </div>
          </div>
        </section>

        <section id="features" className="bg-gray-50 py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-12">
              Everything you need to track SEC filings
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard
                title="Insider Transactions"
                description="Get alerts when executives buy or sell company stock. Filter by transaction size, insider role, and more."
              />
              <FeatureCard
                title="13F Holdings"
                description="Track what hedge funds and institutional investors are buying. See quarter-over-quarter position changes."
              />
              <FeatureCard
                title="AI Summaries"
                description="Dense SEC filings transformed into plain English. Understand what matters in seconds, not hours."
              />
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-12">Simple pricing</h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <PricingCard
                tier="Free"
                price="$0"
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
      </main>

      <footer className="border-t bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <p className="text-xs text-gray-500 text-center max-w-3xl mx-auto">
            {DISCLAIMER}
          </p>
          <p className="text-sm text-gray-400 text-center mt-4">
            &copy; {new Date().getFullYear()} FilingsFlow. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}

function PricingCard({
  tier,
  price,
  period,
  features,
  featured,
}: {
  tier: string
  price: string
  period?: string
  features: string[]
  featured?: boolean
}) {
  return (
    <div
      className={`p-6 rounded-lg border ${
        featured ? 'border-primary shadow-lg ring-2 ring-primary' : 'bg-white'
      }`}
    >
      <h3 className="text-lg font-semibold">{tier}</h3>
      <div className="mt-4">
        <span className="text-4xl font-bold">{price}</span>
        {period && <span className="text-gray-500">{period}</span>}
      </div>
      <ul className="mt-6 space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="text-sm text-gray-600">{feature}</span>
          </li>
        ))}
      </ul>
      <Link
        href="/signup"
        className={`mt-8 block text-center py-2 px-4 rounded-md text-sm font-medium ${
          featured
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'border hover:bg-gray-50'
        }`}
      >
        {tier === 'Free' ? 'Get Started' : 'Start Free Trial'}
      </Link>
    </div>
  )
}
