'use client'

import { forwardRef, useRef, useId, useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils/cn'

interface SkipLinkProps {
  href?: string
  className?: string
}

export function SkipLink({ href = '#main-content', className }: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100]',
        'focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        className
      )}
    >
      Skip to main content
    </a>
  )
}

interface VisuallyHiddenProps {
  children: React.ReactNode
  as?: keyof JSX.IntrinsicElements
}

export function VisuallyHidden({ children, as: Component = 'span' }: VisuallyHiddenProps) {
  return <Component className="sr-only">{children}</Component>
}

interface LiveRegionProps {
  children: React.ReactNode
  role?: 'status' | 'alert' | 'log'
  atomic?: boolean
  relevant?: 'additions' | 'removals' | 'text' | 'all'
  className?: string
}

export function LiveRegion({
  children,
  role = 'status',
  atomic = true,
  relevant = 'additions',
  className,
}: LiveRegionProps) {
  return (
    <div
      role={role}
      aria-live={role === 'alert' ? 'assertive' : 'polite'}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className={cn('sr-only', className)}
    >
      {children}
    </div>
  )
}

interface AnnouncerProps {
  message: string
  politeness?: 'polite' | 'assertive'
}

export function Announcer({ message, politeness = 'polite' }: AnnouncerProps) {
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    if (message) {
      setAnnouncement('')
      const timer = setTimeout(() => setAnnouncement(message), 100)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [message])

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  )
}

interface FocusTrapProps {
  children: React.ReactNode
  active?: boolean
  initialFocus?: React.RefObject<HTMLElement>
  returnFocus?: boolean
}

export function FocusTrap({
  children,
  active = true,
  initialFocus,
  returnFocus = true,
}: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!active) return undefined

    previousFocus.current = document.activeElement as HTMLElement

    if (initialFocus?.current) {
      initialFocus.current.focus()
    } else {
      const focusable = containerRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      focusable?.focus()
    }

    return () => {
      if (returnFocus && previousFocus.current) {
        previousFocus.current.focus()
      }
    }
  }, [active, initialFocus, returnFocus])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!active || e.key !== 'Tab') return

    const container = containerRef.current
    if (!container) return

    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )

    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault()
      lastElement?.focus()
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault()
      firstElement?.focus()
    }
  }, [active])

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown}>
      {children}
    </div>
  )
}

interface AccessibleLabelProps {
  id?: string
  label: string
  description?: string
  required?: boolean
  children: (props: { labelId: string; descriptionId?: string }) => React.ReactNode
}

export function AccessibleLabel({
  id,
  label,
  description,
  required,
  children,
}: AccessibleLabelProps) {
  const generatedId = useId()
  const baseId = id || generatedId
  const labelId = `${baseId}-label`
  const descriptionId = description ? `${baseId}-description` : undefined

  return (
    <div>
      <label id={labelId} className="block text-sm font-medium text-foreground mb-1">
        {label}
        {required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
        {required && <VisuallyHidden> (required)</VisuallyHidden>}
      </label>
      {children({ labelId, descriptionId })}
      {description && (
        <p id={descriptionId} className="text-xs text-muted-foreground mt-1">
          {description}
        </p>
      )}
    </div>
  )
}

interface KeyboardShortcutProps {
  keys: string[]
  description: string
  onTrigger: () => void
  disabled?: boolean
}

export function useKeyboardShortcut({
  keys,
  description,
  onTrigger,
  disabled = false,
}: KeyboardShortcutProps) {
  useEffect(() => {
    if (disabled) return undefined

    const handleKeyDown = (e: KeyboardEvent) => {
      const modifiers = {
        ctrl: e.ctrlKey || e.metaKey,
        shift: e.shiftKey,
        alt: e.altKey,
      }

      const pressedKeys = keys.map(key => {
        if (key === 'ctrl' || key === 'cmd') return modifiers.ctrl
        if (key === 'shift') return modifiers.shift
        if (key === 'alt') return modifiers.alt
        return e.key.toLowerCase() === key.toLowerCase()
      })

      if (pressedKeys.every(Boolean)) {
        e.preventDefault()
        onTrigger()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [keys, onTrigger, disabled])

  return { keys, description }
}

interface ReducedMotionProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ReducedMotion({ children, fallback }: ReducedMotionProps) {
  const [prefersReduced, setPrefersReduced] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReduced(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  if (prefersReduced && fallback) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReduced(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return prefersReduced
}

interface AccessibleIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  icon: React.ReactNode
  showLabel?: boolean
}

export const AccessibleIconButton = forwardRef<HTMLButtonElement, AccessibleIconButtonProps>(
  ({ label, icon, showLabel = false, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={!showLabel ? label : undefined}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg p-2 transition-colors',
          'hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          className
        )}
        {...props}
      >
        {icon}
        {showLabel ? (
          <span className="text-sm font-medium">{label}</span>
        ) : (
          <VisuallyHidden>{label}</VisuallyHidden>
        )}
      </button>
    )
  }
)
AccessibleIconButton.displayName = 'AccessibleIconButton'

interface LoadingStateProps {
  isLoading: boolean
  loadingText?: string
  children: React.ReactNode
}

export function LoadingState({
  isLoading,
  loadingText = 'Loading...',
  children,
}: LoadingStateProps) {
  return (
    <>
      {isLoading && (
        <div role="status" aria-live="polite">
          <VisuallyHidden>{loadingText}</VisuallyHidden>
        </div>
      )}
      <div aria-busy={isLoading}>{children}</div>
    </>
  )
}

interface ErrorBoundaryMessageProps {
  error: Error
  retry?: () => void
}

export function ErrorBoundaryMessage({ error, retry }: ErrorBoundaryMessageProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg"
    >
      <h2 className="text-lg font-semibold text-destructive mb-2">Something went wrong</h2>
      <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
      {retry && (
        <button
          onClick={retry}
          className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Try again
        </button>
      )}
    </div>
  )
}

interface ProgressIndicatorProps {
  value: number
  max?: number
  label: string
  showValue?: boolean
}

export function ProgressIndicator({
  value,
  max = 100,
  label,
  showValue = true,
}: ProgressIndicatorProps) {
  const percentage = Math.round((value / max) * 100)

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        {showValue && <span className="text-muted-foreground">{percentage}%</span>}
      </div>
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
        className="h-2 w-full bg-muted rounded-full overflow-hidden"
      >
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
