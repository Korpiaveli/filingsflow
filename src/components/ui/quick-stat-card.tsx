import { cn } from '@/lib/utils/cn'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

type TrendDirection = 'up' | 'down' | 'neutral'

interface QuickStatCardProps {
  label: string
  value: string | number
  subtext?: string
  trend?: TrendDirection
  trendValue?: string
  icon?: React.ReactNode
  variant?: 'default' | 'highlighted'
  className?: string
}

export function QuickStatCard({
  label,
  value,
  subtext,
  trend,
  trendValue,
  icon,
  variant = 'default',
  className,
}: QuickStatCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus

  return (
    <div
      className={cn(
        'p-4 rounded-xl border transition-all',
        variant === 'default' && 'bg-card hover:bg-muted/30',
        variant === 'highlighted' && 'bg-gradient-to-br from-primary/5 to-background border-primary/20',
        className
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-foreground">{value}</span>
        {trend && trendValue && (
          <div
            className={cn(
              'flex items-center gap-0.5 text-xs font-medium pb-1',
              trend === 'up' && 'text-[hsl(var(--signal-buy))]',
              trend === 'down' && 'text-[hsl(var(--signal-sell))]',
              trend === 'neutral' && 'text-muted-foreground'
            )}
          >
            <TrendIcon className="w-3 h-3" />
            {trendValue}
          </div>
        )}
      </div>

      {subtext && (
        <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>
      )}
    </div>
  )
}

interface QuickStatGridProps {
  children: React.ReactNode
  columns?: 2 | 3 | 4
  className?: string
}

export function QuickStatGrid({ children, columns = 2, className }: QuickStatGridProps) {
  return (
    <div
      className={cn(
        'grid gap-4',
        columns === 2 && 'grid-cols-2',
        columns === 3 && 'grid-cols-3',
        columns === 4 && 'grid-cols-2 md:grid-cols-4',
        className
      )}
    >
      {children}
    </div>
  )
}
