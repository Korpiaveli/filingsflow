'use client'

import { useState } from 'react'
import { X, ExternalLink } from 'lucide-react'
import { SignalBadge } from './signal-badge'
import type { SignalType } from './signal-badge'

interface InsightPanelProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  subtitle?: string
}

export function InsightPanel({ isOpen, onClose, children, title, subtitle }: InsightPanelProps) {
  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-card border-l shadow-xl z-50 overflow-y-auto transition-transform">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex items-center justify-between">
          <div>
            {title && <h2 className="font-semibold text-foreground">{title}</h2>}
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </>
  )
}

interface InsightCardProps {
  icon: string
  title: string
  description: string
  signals?: Array<{ type: SignalType; label?: string }>
  href?: string
  onClick?: () => void
}

export function InsightCard({ icon, title, description, signals, href, onClick }: InsightCardProps) {
  const Wrapper = href ? 'a' : onClick ? 'button' : 'div'
  const wrapperProps = href
    ? { href, target: '_blank', rel: 'noopener noreferrer' }
    : onClick
    ? { onClick, type: 'button' as const }
    : {}

  return (
    <Wrapper
      {...wrapperProps}
      className={`block bg-muted/50 rounded-xl p-4 ${
        (href || onClick) ? 'hover:bg-muted transition-colors cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-foreground">{title}</h3>
            {href && <ExternalLink className="w-3 h-3 text-muted-foreground" />}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          {signals && signals.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {signals.map((signal, i) => (
                <SignalBadge key={i} type={signal.type} label={signal.label} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Wrapper>
  )
}

interface InsightTimelineProps {
  events: Array<{
    date: string
    title: string
    description?: string
    type?: 'buy' | 'sell' | 'neutral'
  }>
}

export function InsightTimeline({ events }: InsightTimelineProps) {
  return (
    <div className="relative">
      <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
      <div className="space-y-4">
        {events.map((event, i) => (
          <div key={i} className="relative pl-8">
            <div
              className={`absolute left-2 top-1.5 w-2 h-2 rounded-full ${
                event.type === 'buy'
                  ? 'bg-[hsl(var(--signal-buy))]'
                  : event.type === 'sell'
                  ? 'bg-[hsl(var(--signal-sell))]'
                  : 'bg-muted-foreground'
              }`}
            />
            <p className="text-xs text-muted-foreground mb-0.5">{event.date}</p>
            <p className="text-sm font-medium text-foreground">{event.title}</p>
            {event.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function useInsightPanel() {
  const [isOpen, setIsOpen] = useState(false)

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
  }
}
