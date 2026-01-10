'use client'

import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  BellOff,
  ChevronDown,
  Users,
  Briefcase,
  Landmark,
  TrendingUp,
  TrendingDown,
  Settings2,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface AlertConfigProps {
  watchlistId: string
  ticker: string
  initialConfig: AlertSettings
  tier?: 'free' | 'pro' | 'premium'
}

interface AlertSettings {
  enabled: boolean
  insiderBuys: boolean
  insiderSells: boolean
  cSuiteOnly: boolean
  minValue: number | null
  congressTrades: boolean
  institutional: boolean
}

const DEFAULT_CONFIG: AlertSettings = {
  enabled: false,
  insiderBuys: true,
  insiderSells: true,
  cSuiteOnly: false,
  minValue: null,
  congressTrades: true,
  institutional: false,
}

const MIN_VALUE_OPTIONS = [
  { value: null, label: 'Any amount' },
  { value: 10000, label: '$10K+' },
  { value: 50000, label: '$50K+' },
  { value: 100000, label: '$100K+' },
  { value: 500000, label: '$500K+' },
  { value: 1000000, label: '$1M+' },
]

export function AlertConfig({
  watchlistId,
  ticker,
  initialConfig,
  tier = 'free',
}: AlertConfigProps) {
  const [config, setConfig] = useState<AlertSettings>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  })
  const [isExpanded, setIsExpanded] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [showSaved, setShowSaved] = useState(false)

  const isPro = tier === 'pro' || tier === 'premium'

  const saveConfig = (newConfig: AlertSettings) => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/watchlist/${watchlistId}/alerts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newConfig),
        })

        if (response.ok) {
          setShowSaved(true)
          setTimeout(() => setShowSaved(false), 2000)
        }
      } catch (error) {
        console.error('Failed to save alert config:', error)
      }
    })
  }

  const handleToggle = () => {
    const newConfig = { ...config, enabled: !config.enabled }
    setConfig(newConfig)
    saveConfig(newConfig)
  }

  const handleSettingChange = <K extends keyof AlertSettings>(
    key: K,
    value: AlertSettings[K]
  ) => {
    const newConfig = { ...config, [key]: value }
    setConfig(newConfig)
    saveConfig(newConfig)
  }

  return (
    <div className="border-t pt-3 mt-3">
      <div className="flex items-center justify-between">
        <button
          onClick={handleToggle}
          disabled={isPending}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
            config.enabled
              ? 'bg-primary/10 text-primary hover:bg-primary/20'
              : 'bg-muted text-muted-foreground hover:bg-muted/80',
            isPending && 'opacity-50 cursor-not-allowed'
          )}
          aria-label={`${config.enabled ? 'Disable' : 'Enable'} alerts for ${ticker}`}
        >
          {config.enabled ? (
            <Bell className="w-4 h-4" />
          ) : (
            <BellOff className="w-4 h-4" />
          )}
          {config.enabled ? 'Alerts On' : 'Alerts Off'}
        </button>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          disabled={!config.enabled}
          className={cn(
            'flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all',
            config.enabled
              ? 'text-muted-foreground hover:bg-muted'
              : 'text-muted-foreground/50 cursor-not-allowed'
          )}
        >
          <Settings2 className="w-3.5 h-3.5" />
          <ChevronDown
            className={cn(
              'w-3.5 h-3.5 transition-transform',
              isExpanded && 'rotate-180'
            )}
          />
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && config.enabled && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-4 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Transaction Type
                </label>
                <div className="flex gap-2">
                  <ToggleButton
                    active={config.insiderBuys}
                    onClick={() =>
                      handleSettingChange('insiderBuys', !config.insiderBuys)
                    }
                    icon={<TrendingUp className="w-3.5 h-3.5" />}
                    label="Buys"
                    activeClass="text-[hsl(var(--signal-buy))] bg-[hsl(var(--signal-buy))]/10"
                  />
                  <ToggleButton
                    active={config.insiderSells}
                    onClick={() =>
                      handleSettingChange('insiderSells', !config.insiderSells)
                    }
                    icon={<TrendingDown className="w-3.5 h-3.5" />}
                    label="Sells"
                    activeClass="text-[hsl(var(--signal-sell))] bg-[hsl(var(--signal-sell))]/10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Minimum Value
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {MIN_VALUE_OPTIONS.map((option) => (
                    <button
                      key={option.value ?? 'any'}
                      onClick={() =>
                        handleSettingChange('minValue', option.value)
                      }
                      className={cn(
                        'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                        config.minValue === option.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  Insider Filter
                  {!isPro && (
                    <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded">
                      PRO
                    </span>
                  )}
                </label>
                <ToggleButton
                  active={config.cSuiteOnly}
                  onClick={() =>
                    isPro &&
                    handleSettingChange('cSuiteOnly', !config.cSuiteOnly)
                  }
                  icon={<Briefcase className="w-3.5 h-3.5" />}
                  label="C-Suite Only"
                  disabled={!isPro}
                  activeClass="text-primary bg-primary/10"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Additional Alerts
                </label>
                <div className="flex gap-2">
                  <ToggleButton
                    active={config.congressTrades}
                    onClick={() =>
                      handleSettingChange(
                        'congressTrades',
                        !config.congressTrades
                      )
                    }
                    icon={<Landmark className="w-3.5 h-3.5" />}
                    label="Congress"
                    activeClass="text-indigo-600 dark:text-indigo-400 bg-indigo-500/10"
                  />
                  <ToggleButton
                    active={config.institutional}
                    onClick={() =>
                      isPro &&
                      handleSettingChange('institutional', !config.institutional)
                    }
                    icon={<Users className="w-3.5 h-3.5" />}
                    label="13F"
                    disabled={!isPro}
                    activeClass="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSaved && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 text-xs text-primary font-medium text-center"
          >
            Settings saved
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface ToggleButtonProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  activeClass?: string
  disabled?: boolean
}

function ToggleButton({
  active,
  onClick,
  icon,
  label,
  activeClass = 'text-primary bg-primary/10',
  disabled = false,
}: ToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
        active ? activeClass : 'bg-muted/50 text-muted-foreground',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && !active && 'hover:bg-muted'
      )}
    >
      {icon}
      {label}
    </button>
  )
}

export function AlertConfigSimple({
  watchlistId,
  ticker,
  initialEnabled,
}: {
  watchlistId: string
  ticker: string
  initialEnabled: boolean
}) {
  return (
    <AlertConfig
      watchlistId={watchlistId}
      ticker={ticker}
      initialConfig={{ ...DEFAULT_CONFIG, enabled: initialEnabled }}
    />
  )
}
