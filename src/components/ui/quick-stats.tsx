interface QuickStatsProps {
  stats: Array<{
    label: string
    value: string | number
    trend?: 'up' | 'down' | 'neutral'
    subtext?: string
  }>
}

export function QuickStats({ stats }: QuickStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <div key={i} className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            {stat.label}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{stat.value}</span>
            {stat.trend && stat.trend !== 'neutral' && (
              <span
                className={
                  stat.trend === 'up'
                    ? 'text-[hsl(var(--signal-buy))] text-sm'
                    : 'text-[hsl(var(--signal-sell))] text-sm'
                }
              >
                {stat.trend === 'up' ? '▲' : '▼'}
              </span>
            )}
          </div>
          {stat.subtext && (
            <p className="text-xs text-muted-foreground mt-1">{stat.subtext}</p>
          )}
        </div>
      ))}
    </div>
  )
}

export function QuickStatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-card border rounded-xl p-4 animate-pulse">
          <div className="h-3 w-16 bg-muted rounded mb-2" />
          <div className="h-7 w-12 bg-muted rounded" />
        </div>
      ))}
    </div>
  )
}
