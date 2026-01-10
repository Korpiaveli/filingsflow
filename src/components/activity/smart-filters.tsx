'use client'

import { cn } from '@/lib/utils/cn'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { BarChart3, User, Building2, Landmark, TrendingUp, TrendingDown, DollarSign, Star, X } from 'lucide-react'

export type SourceFilter = 'all' | 'insider' | '13f' | 'congress'
export type DirectionFilter = 'all' | 'buys' | 'sells'
export type ValueFilter = 0 | 10000 | 100000 | 1000000

interface SmartFiltersProps {
  currentSource: SourceFilter
  currentDirection: DirectionFilter
  currentMinValue: ValueFilter
  watchlistOnly: boolean
}

const sourceOptions: Array<{ value: SourceFilter; label: string; icon: React.ReactNode; color: string }> = [
  { value: 'all', label: 'All Sources', icon: <BarChart3 className="w-4 h-4" />, color: 'primary' },
  { value: 'insider', label: 'Insider', icon: <User className="w-4 h-4" />, color: 'blue' },
  { value: '13f', label: '13F', icon: <Building2 className="w-4 h-4" />, color: 'emerald' },
  { value: 'congress', label: 'Congress', icon: <Landmark className="w-4 h-4" />, color: 'indigo' },
]

const directionOptions: Array<{ value: DirectionFilter; label: string; icon?: React.ReactNode; activeColor?: string }> = [
  { value: 'all', label: 'All' },
  { value: 'buys', label: 'Buys', icon: <TrendingUp className="w-3.5 h-3.5" />, activeColor: 'bg-[hsl(var(--signal-buy))]/10 text-[hsl(var(--signal-buy))] border-[hsl(var(--signal-buy))]/30' },
  { value: 'sells', label: 'Sells', icon: <TrendingDown className="w-3.5 h-3.5" />, activeColor: 'bg-[hsl(var(--signal-sell))]/10 text-[hsl(var(--signal-sell))] border-[hsl(var(--signal-sell))]/30' },
]

const valueOptions: Array<{ value: ValueFilter; label: string }> = [
  { value: 0, label: 'Any' },
  { value: 10000, label: '$10K+' },
  { value: 100000, label: '$100K+' },
  { value: 1000000, label: '$1M+' },
]

export function SmartFilters({
  currentSource,
  currentDirection,
  currentMinValue,
  watchlistOnly,
}: SmartFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === 'all' || value === '0') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
      params.delete('page')
      router.push(`/activity?${params.toString()}`)
    },
    [router, searchParams]
  )

  const toggleWatchlist = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (watchlistOnly) {
      params.delete('watchlist')
    } else {
      params.set('watchlist', '1')
    }
    params.delete('page')
    router.push(`/activity?${params.toString()}`)
  }, [router, searchParams, watchlistOnly])

  const hasActiveFilters = currentSource !== 'all' || currentDirection !== 'all' || currentMinValue !== 0 || watchlistOnly

  const clearFilters = useCallback(() => {
    router.push('/activity')
  }, [router])

  return (
    <div className="bg-card border-2 border-border/50 rounded-2xl p-5 mb-6 shadow-sm">
      <div className="flex flex-wrap gap-6">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">
            Source
          </label>
          <div className="flex gap-1.5">
            {sourceOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateFilter('source', opt.value)}
                className={cn(
                  'px-3.5 py-2 text-sm rounded-xl border-2 transition-all flex items-center gap-2 font-medium',
                  currentSource === opt.value
                    ? 'bg-primary/10 text-primary border-primary/30 shadow-sm'
                    : 'bg-card text-muted-foreground border-transparent hover:bg-muted hover:border-border'
                )}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">
            Direction
          </label>
          <div className="flex gap-1.5">
            {directionOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateFilter('direction', opt.value)}
                className={cn(
                  'px-3.5 py-2 text-sm rounded-xl border-2 transition-all flex items-center gap-1.5 font-medium',
                  currentDirection === opt.value
                    ? opt.activeColor || 'bg-primary/10 text-primary border-primary/30 shadow-sm'
                    : 'bg-card text-muted-foreground border-transparent hover:bg-muted hover:border-border'
                )}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">
            <DollarSign className="w-3 h-3 inline mr-1" />
            Min Value
          </label>
          <div className="flex gap-1.5">
            {valueOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateFilter('minValue', String(opt.value))}
                className={cn(
                  'px-3 py-2 text-sm rounded-xl border-2 transition-all font-medium',
                  currentMinValue === opt.value
                    ? 'bg-primary/10 text-primary border-primary/30 shadow-sm'
                    : 'bg-card text-muted-foreground border-transparent hover:bg-muted hover:border-border'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-end gap-2">
          <button
            onClick={toggleWatchlist}
            className={cn(
              'px-3.5 py-2 text-sm rounded-xl border-2 transition-all flex items-center gap-2 font-medium',
              watchlistOnly
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 shadow-sm'
                : 'bg-card text-muted-foreground border-transparent hover:bg-muted hover:border-border'
            )}
          >
            <Star className={cn('w-4 h-4', watchlistOnly && 'fill-current')} />
            <span>Watchlist</span>
          </button>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm rounded-xl border-2 border-transparent text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all flex items-center gap-1.5 font-medium"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
