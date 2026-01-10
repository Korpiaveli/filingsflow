'use client'

import { motion } from 'framer-motion'
import { Users, Activity, Clock, TrendingUp, Zap, Shield } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { CountUp } from './animated-counter'

interface TrustBarProps {
  investorCount?: number
  filingsToday?: number
  avgDelay?: string
  className?: string
}

export function TrustBar({
  investorCount = 12847,
  filingsToday = 847,
  avgDelay = '< 30s',
  className,
}: TrustBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-center justify-center gap-6 py-2 px-4 bg-muted/30 border-b text-xs text-muted-foreground',
        className
      )}
    >
      <TrustStat icon={<Users className="w-3.5 h-3.5" />} value={investorCount} label="investors" />
      <div className="w-px h-4 bg-border" />
      <TrustStat icon={<Activity className="w-3.5 h-3.5" />} value={filingsToday} label="filings today" />
      <div className="w-px h-4 bg-border hidden sm:block" />
      <TrustStat icon={<Clock className="w-3.5 h-3.5" />} value={avgDelay} label="avg. delay" isText className="hidden sm:flex" />
    </motion.div>
  )
}

interface TrustStatProps {
  icon: React.ReactNode
  value: number | string
  label: string
  isText?: boolean
  className?: string
}

function TrustStat({ icon, value, label, isText = false, className }: TrustStatProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {icon}
      <span className="font-semibold text-foreground">
        {isText ? value : <CountUp end={value as number} duration={1.5} separator="," />}
      </span>
      <span>{label}</span>
    </div>
  )
}

interface TrendingBadgeProps {
  ticker: string
  change: number
  className?: string
}

export function TrendingBadge({ change, className }: TrendingBadgeProps) {
  const isPositive = change >= 0

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
        isPositive
          ? 'bg-[hsl(var(--signal-buy))]/10 text-[hsl(var(--signal-buy))]'
          : 'bg-[hsl(var(--signal-sell))]/10 text-[hsl(var(--signal-sell))]',
        className
      )}
    >
      <TrendingUp className={cn('w-3 h-3', !isPositive && 'rotate-180')} />
      <span>Trending</span>
      <span className="opacity-70">
        {isPositive ? '+' : ''}{change}%
      </span>
    </motion.div>
  )
}

interface HotSignalBadgeProps {
  type: 'cluster' | 'surge' | 'breakout' | 'unusual'
  className?: string
}

const signalConfig = {
  cluster: { label: 'Cluster', icon: Users, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  surge: { label: 'Surge', icon: Zap, color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
  breakout: { label: 'Breakout', icon: TrendingUp, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  unusual: { label: 'Unusual', icon: Activity, color: 'bg-red-500/10 text-red-600 dark:text-red-400' },
}

export function HotSignalBadge({ type, className }: HotSignalBadgeProps) {
  const config = signalConfig[type]
  const Icon = config.icon

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide',
        config.color,
        className
      )}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </motion.span>
  )
}

interface SecurityBadgeProps {
  className?: string
}

export function SecurityBadge({ className }: SecurityBadgeProps) {
  return (
    <div className={cn('flex items-center gap-1.5 text-xs text-muted-foreground', className)}>
      <Shield className="w-3.5 h-3.5 text-[hsl(var(--signal-buy))]" />
      <span>SEC Data</span>
    </div>
  )
}

interface DataSourceBadgeProps {
  source: 'sec' | 'congress' | '13f'
  className?: string
}

const sourceConfig = {
  sec: { label: 'Form 4', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  congress: { label: 'Congress', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
  '13f': { label: '13F', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
}

export function DataSourceBadge({ source, className }: DataSourceBadgeProps) {
  const config = sourceConfig[source]

  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold',
        config.color,
        className
      )}
    >
      {config.label}
    </span>
  )
}

interface SocialProofCardProps {
  quote: string
  author: string
  handle?: string
  avatarUrl?: string
  className?: string
}

export function SocialProofCard({
  quote,
  author,
  handle,
  avatarUrl,
  className,
}: SocialProofCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('bg-card border rounded-xl p-4', className)}
    >
      <blockquote className="text-sm text-foreground italic mb-3">
        &ldquo;{quote}&rdquo;
      </blockquote>
      <div className="flex items-center gap-2">
        {avatarUrl ? (
          <div
            className="w-8 h-8 rounded-full bg-cover bg-center"
            style={{ backgroundImage: `url(${avatarUrl})` }}
            role="img"
            aria-label={author}
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xs font-bold text-primary">
              {author.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-foreground">{author}</p>
          {handle && <p className="text-xs text-muted-foreground">{handle}</p>}
        </div>
      </div>
    </motion.div>
  )
}

interface PlatformStatsProps {
  totalFilings: number
  totalAlerts: number
  clustersDetected: number
  className?: string
}

export function PlatformStats({
  totalFilings,
  totalAlerts,
  clustersDetected,
  className,
}: PlatformStatsProps) {
  return (
    <div className={cn('grid grid-cols-3 gap-4', className)}>
      <StatCard value={totalFilings} label="Filings Tracked" icon={<Activity className="w-5 h-5 text-blue-500" />} />
      <StatCard value={totalAlerts} label="Alerts Sent" icon={<Zap className="w-5 h-5 text-amber-500" />} />
      <StatCard value={clustersDetected} label="Clusters Found" icon={<Users className="w-5 h-5 text-purple-500" />} />
    </div>
  )
}

interface StatCardProps {
  value: number
  label: string
  icon: React.ReactNode
}

function StatCard({ value, label, icon }: StatCardProps) {
  return (
    <div className="bg-card border rounded-xl p-4 text-center">
      <div className="flex justify-center mb-2">{icon}</div>
      <div className="text-2xl font-bold text-foreground">
        <CountUp end={value} duration={2} separator="," />
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}
