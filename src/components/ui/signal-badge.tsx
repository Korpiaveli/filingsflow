import { cn } from '@/lib/utils/cn'

export type SignalType =
  | 'cluster'
  | 'first-buy'
  | 'large-sale'
  | 'unusual-size'
  | 'c-suite'
  | 'new-position'
  | 'exit'
  | 'congress'
  | 'institutional'

interface SignalBadgeProps {
  type: SignalType
  label?: string
  className?: string
}

const badgeConfig: Record<SignalType, { bg: string; text: string; icon: string; defaultLabel: string }> = {
  cluster: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-400',
    icon: '🔥',
    defaultLabel: 'Cluster',
  },
  'first-buy': {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    icon: '✨',
    defaultLabel: 'First buy',
  },
  'large-sale': {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-400',
    icon: '📉',
    defaultLabel: 'Large sale',
  },
  'unusual-size': {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-400',
    icon: '📊',
    defaultLabel: '10x size',
  },
  'c-suite': {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-400',
    icon: '👔',
    defaultLabel: 'C-Suite',
  },
  'new-position': {
    bg: 'bg-teal-100 dark:bg-teal-900/30',
    text: 'text-teal-700 dark:text-teal-400',
    icon: '🆕',
    defaultLabel: 'New position',
  },
  exit: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-700 dark:text-gray-400',
    icon: '🚪',
    defaultLabel: 'Exited',
  },
  congress: {
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    text: 'text-indigo-700 dark:text-indigo-400',
    icon: '🏛️',
    defaultLabel: 'Congress',
  },
  institutional: {
    bg: 'bg-sky-100 dark:bg-sky-900/30',
    text: 'text-sky-700 dark:text-sky-400',
    icon: '🏦',
    defaultLabel: '13F',
  },
}

export function SignalBadge({ type, label, className }: SignalBadgeProps) {
  const config = badgeConfig[type]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        config.bg,
        config.text,
        className
      )}
    >
      <span className="text-[10px]">{config.icon}</span>
      <span>{label || config.defaultLabel}</span>
    </span>
  )
}

export function SignalBadgeList({ signals }: { signals: Array<{ type: SignalType; label?: string }> }) {
  if (signals.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1">
      {signals.map((signal, i) => (
        <SignalBadge key={`${signal.type}-${i}`} type={signal.type} label={signal.label} />
      ))}
    </div>
  )
}
