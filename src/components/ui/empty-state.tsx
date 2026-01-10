import Link from 'next/link'
import {
  Activity,
  Search,
  Star,
  TrendingUp,
  FileText,
  Building2,
  Landmark,
  Target,
  AlertCircle,
  Bell,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react'

type EmptyStateVariant =
  | 'activity'
  | 'watchlist'
  | 'search'
  | 'trending'
  | 'filings'
  | 'institutional'
  | 'congress'
  | 'clusters'
  | 'signals'
  | 'funds'
  | 'error'
  | 'custom'

interface EmptyStateProps {
  variant?: EmptyStateVariant
  icon?: string | LucideIcon
  title: string
  description: string
  action?: {
    label: string
    href: string
  }
  suggestions?: string[]
  gradientFrom?: string
  gradientTo?: string
  iconColor?: string
}

const variantConfig: Record<
  Exclude<EmptyStateVariant, 'custom'>,
  {
    Icon: LucideIcon
    bgGradient: string
    iconColor: string
  }
> = {
  activity: {
    Icon: Activity,
    bgGradient: 'from-primary/15 to-primary/5',
    iconColor: 'text-primary',
  },
  watchlist: {
    Icon: Star,
    bgGradient: 'from-amber-500/15 to-amber-500/5',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  search: {
    Icon: Search,
    bgGradient: 'from-primary/15 to-primary/5',
    iconColor: 'text-primary',
  },
  trending: {
    Icon: TrendingUp,
    bgGradient: 'from-emerald-500/15 to-emerald-500/5',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  filings: {
    Icon: FileText,
    bgGradient: 'from-blue-500/15 to-blue-500/5',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  institutional: {
    Icon: Building2,
    bgGradient: 'from-emerald-500/15 to-emerald-500/5',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  congress: {
    Icon: Landmark,
    bgGradient: 'from-indigo-500/15 to-indigo-500/5',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
  },
  clusters: {
    Icon: Target,
    bgGradient: 'from-amber-500/15 to-amber-500/5',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  signals: {
    Icon: Bell,
    bgGradient: 'from-primary/15 to-primary/5',
    iconColor: 'text-primary',
  },
  funds: {
    Icon: Building2,
    bgGradient: 'from-emerald-500/15 to-emerald-500/5',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  error: {
    Icon: AlertCircle,
    bgGradient: 'from-destructive/15 to-destructive/5',
    iconColor: 'text-destructive',
  },
}

export function EmptyState({
  variant = 'custom',
  icon,
  title,
  description,
  action,
  suggestions,
  gradientFrom,
  gradientTo,
  iconColor,
}: EmptyStateProps) {
  const config = variant !== 'custom' ? variantConfig[variant] : null
  const Icon = config?.Icon

  const bgGradient = config?.bgGradient || `${gradientFrom || 'from-muted/50'} ${gradientTo || 'to-muted/25'}`
  const finalIconColor = iconColor || config?.iconColor || 'text-muted-foreground'

  return (
    <div className="bg-card border-2 border-border/50 rounded-2xl p-12 text-center shadow-sm">
      <div
        className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${bgGradient} flex items-center justify-center mx-auto mb-6`}
      >
        {Icon ? (
          <Icon className={`w-10 h-10 ${finalIconColor}`} />
        ) : typeof icon === 'string' ? (
          <span className="text-4xl">{icon}</span>
        ) : null}
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
        {description}
      </p>

      {suggestions && suggestions.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 text-sm mt-6 mb-2">
          {suggestions.map((suggestion, i) => (
            <span
              key={i}
              className="px-3.5 py-1.5 bg-muted hover:bg-muted/80 rounded-full font-medium cursor-pointer transition-colors"
            >
              {suggestion}
            </span>
          ))}
        </div>
      )}

      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all mt-6 shadow-sm"
        >
          {action.label}
          <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  )
}

export const emptyStatePresets = {
  noActivity: {
    icon: '📊',
    title: 'No activity yet',
    description: 'There are no transactions matching your current filters. Try adjusting your filters or check back during market hours.',
  },
  emptyWatchlist: {
    icon: '👀',
    title: 'Your watchlist is empty',
    description: 'Add tickers to track insider activity, 13F holdings, and congressional trades all in one place.',
    suggestions: ['AAPL', 'NVDA', 'TSLA'],
    action: {
      label: 'Browse Trending',
      href: '/discover',
    },
  },
  noSignals: {
    icon: '🔔',
    title: 'All quiet today',
    description: 'No significant signals detected yet. Check back later or expand your watchlist to monitor more tickers.',
    action: {
      label: 'Add to Watchlist',
      href: '/watchlist',
    },
  },
  noSearch: {
    icon: '🔍',
    title: 'Search for any ticker',
    description: 'Enter a ticker symbol to view all insider transactions, 13F holdings, and congressional trades.',
  },
  noFilings: {
    icon: '📄',
    title: 'No filings found',
    description: 'No SEC filings match your current search. Try a different ticker or form type.',
  },
  noClusters: {
    icon: '🎯',
    title: 'No clusters detected',
    description: 'Cluster detection finds unusual patterns of multiple insiders trading the same stock within a short window.',
    action: {
      label: 'View Recent Activity',
      href: '/activity',
    },
  },
  noFunds: {
    icon: '🏦',
    title: 'No funds tracked',
    description: 'Track institutional investors to see their quarterly 13F filings and portfolio changes.',
    action: {
      label: 'Explore Funds',
      href: '/discover?tab=filings',
    },
  },
} as const
