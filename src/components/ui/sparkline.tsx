'use client'

import { cn } from '@/lib/utils/cn'

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: 'buy' | 'sell' | 'neutral' | string
  strokeWidth?: number
  showDots?: boolean
  className?: string
}

export function Sparkline({
  data,
  width = 80,
  height = 24,
  color = 'neutral',
  strokeWidth = 1.5,
  showDots = false,
  className,
}: SparklineProps) {
  if (!data.length) return null

  const colorMap: Record<string, string> = {
    buy: 'hsl(var(--signal-buy))',
    sell: 'hsl(var(--signal-sell))',
    neutral: 'hsl(var(--muted-foreground))',
  }

  const strokeColor = colorMap[color] || color

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const padding = 2
  const effectiveWidth = width - padding * 2
  const effectiveHeight = height - padding * 2

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * effectiveWidth
    const y = padding + effectiveHeight - ((value - min) / range) * effectiveHeight
    return { x, y }
  })

  const pathD = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')

  const areaPathD = `${pathD} L ${points[points.length - 1]?.x || 0} ${height} L ${points[0]?.x || 0} ${height} Z`

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('overflow-visible', className)}
    >
      <defs>
        <linearGradient id={`sparkline-gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity={0.2} />
          <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
        </linearGradient>
      </defs>

      <path
        d={areaPathD}
        fill={`url(#sparkline-gradient-${color})`}
        strokeWidth={0}
      />

      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {showDots && points.length > 0 && (
        <circle
          cx={points[points.length - 1]?.x}
          cy={points[points.length - 1]?.y}
          r={2.5}
          fill={strokeColor}
        />
      )}
    </svg>
  )
}

interface TrendIndicatorProps {
  value: number
  previousValue?: number
  showPercentage?: boolean
  className?: string
}

export function TrendIndicator({
  value,
  previousValue = 0,
  showPercentage = true,
  className,
}: TrendIndicatorProps) {
  const diff = value - previousValue
  const percentage = previousValue !== 0 ? ((diff / Math.abs(previousValue)) * 100) : 0
  const isPositive = diff > 0
  const isNeutral = diff === 0

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-sm font-medium',
        isNeutral
          ? 'text-muted-foreground'
          : isPositive
            ? 'text-[hsl(var(--signal-buy))]'
            : 'text-[hsl(var(--signal-sell))]',
        className
      )}
    >
      <span className="text-xs">
        {isNeutral ? '–' : isPositive ? '▲' : '▼'}
      </span>
      {showPercentage && !isNeutral && (
        <span>{Math.abs(percentage).toFixed(1)}%</span>
      )}
    </span>
  )
}

interface MiniBarChartProps {
  buyValue: number
  sellValue: number
  width?: number
  height?: number
  className?: string
}

export function MiniBarChart({
  buyValue,
  sellValue,
  width = 60,
  height = 6,
  className,
}: MiniBarChartProps) {
  const total = buyValue + sellValue
  if (total === 0) return null

  const buyWidth = (buyValue / total) * width
  const sellWidth = (sellValue / total) * width

  return (
    <div
      className={cn('flex rounded-full overflow-hidden', className)}
      style={{ width, height }}
    >
      {buyValue > 0 && (
        <div
          className="bg-[hsl(var(--signal-buy))]"
          style={{ width: buyWidth }}
        />
      )}
      {sellValue > 0 && (
        <div
          className="bg-[hsl(var(--signal-sell))]"
          style={{ width: sellWidth }}
        />
      )}
    </div>
  )
}
