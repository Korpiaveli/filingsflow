'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
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
  Filter,
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="bg-card border-2 border-border/50 rounded-2xl p-12 text-center shadow-sm"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${bgGradient} flex items-center justify-center mx-auto mb-6`}
      >
        {Icon ? (
          <Icon className={`w-10 h-10 ${finalIconColor}`} />
        ) : typeof icon === 'string' ? (
          <span className="text-4xl">{icon}</span>
        ) : null}
      </motion.div>
      <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
        {description}
      </p>

      {suggestions && suggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="flex flex-wrap justify-center gap-2 text-sm mt-6 mb-2"
        >
          {suggestions.map((suggestion, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: 0.3 + i * 0.05 }}
              className="px-3.5 py-1.5 bg-muted hover:bg-muted/80 rounded-full font-medium cursor-pointer transition-colors"
            >
              {suggestion}
            </motion.span>
          ))}
        </motion.div>
      )}

      {action && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Link
            href={action.href}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all mt-6 shadow-sm"
          >
            {action.label}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      )}
    </motion.div>
  )
}

interface FilterEmptyStateProps {
  onClearFilters?: () => void
  message?: string
}

export function FilterEmptyState({ onClearFilters, message }: FilterEmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center justify-center py-12 px-6 text-center"
    >
      <div className="w-14 h-14 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4">
        <Filter className="w-7 h-7 text-amber-500" />
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-2">
        No matching results
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">
        {message || 'Try adjusting your filters to see more activity'}
      </p>

      {onClearFilters && (
        <button
          onClick={onClearFilters}
          className="px-4 py-2 text-sm font-medium text-primary hover:text-primary/80 hover:bg-primary/5 rounded-lg transition-colors"
        >
          Clear all filters
        </button>
      )}
    </motion.div>
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
  noInsiderTrades: {
    icon: '👤',
    title: 'No insider trades found',
    description: 'This ticker has no recent insider trading activity on record.',
    suggestions: ['Try another ticker', 'Check historical data'],
  },
  noCongress: {
    icon: '🏛️',
    title: 'No congressional trades',
    description: 'No members of Congress have reported trades in this ticker.',
  },
  no13F: {
    icon: '🏦',
    title: 'No institutional holdings',
    description: 'No 13F filings have been found for this ticker in the current quarter.',
  },
  marketClosed: {
    icon: '🌙',
    title: 'Markets are closed',
    description: 'Real-time data will resume when markets open. Historical data is still available.',
  },
  weekend: {
    icon: '☀️',
    title: 'Enjoy your weekend',
    description: 'Markets are closed for the weekend. Check back Monday for fresh insider activity.',
  },
} as const

interface ContextualEmptyStateProps {
  ticker?: string
  dataType: 'insider' | 'congress' | '13f' | 'cluster'
}

export function ContextualEmptyState({ ticker, dataType }: ContextualEmptyStateProps) {
  const configs: Record<typeof dataType, {
    variant: EmptyStateVariant
    title: string
    description: string
    action?: { label: string; href: string }
  }> = {
    insider: {
      variant: 'activity',
      title: ticker ? `No insider trades for ${ticker}` : 'No insider trades',
      description: ticker
        ? `We haven't found any insider trading activity for ${ticker}. This could mean the company is smaller or insiders haven't traded recently.`
        : 'No insider trading activity matches your current filters.',
      action: ticker ? undefined : { label: 'Clear Filters', href: '/activity' },
    },
    congress: {
      variant: 'congress',
      title: ticker ? `No congressional trades for ${ticker}` : 'No congressional trades',
      description: ticker
        ? `No members of Congress have disclosed trades in ${ticker}.`
        : 'No congressional trading activity matches your filters.',
    },
    '13f': {
      variant: 'institutional',
      title: ticker ? `No 13F filings for ${ticker}` : 'No institutional holdings',
      description: ticker
        ? `No institutional investors have reported holdings in ${ticker} in their latest 13F filings.`
        : 'No 13F filings match your current search criteria.',
    },
    cluster: {
      variant: 'clusters',
      title: ticker ? `No clusters for ${ticker}` : 'No clusters detected',
      description: ticker
        ? `No unusual cluster patterns detected for ${ticker}. Clusters occur when multiple insiders trade within a short window.`
        : 'No cluster patterns have been detected matching your criteria.',
    },
  }

  const config = configs[dataType]
  return (
    <EmptyState
      variant={config.variant}
      title={config.title}
      description={config.description}
      action={config.action}
    />
  )
}
