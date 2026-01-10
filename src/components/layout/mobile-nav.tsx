'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'
import type { LucideIcon } from 'lucide-react'

interface NavLink {
  href: string
  label: string
  icon: LucideIcon
}

interface MobileNavProps {
  links: NavLink[]
}

export function MobileNav({ links }: MobileNavProps) {
  const pathname = usePathname()

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10)
    }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="bg-card/95 backdrop-blur-lg border-t shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-around px-1 py-1.5 safe-area-inset-bottom">
          {links.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`)
            const Icon = link.icon

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={triggerHaptic}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-0.5 py-2 px-4 rounded-2xl transition-all min-w-[72px] min-h-[56px]',
                  'active:scale-95 active:bg-muted/50 touch-manipulation',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground'
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="mobile-nav-indicator"
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-10 h-1 bg-primary rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <motion.div
                  className={cn(
                    'p-2 rounded-xl transition-colors',
                    isActive ? 'bg-primary/15' : ''
                  )}
                  whileTap={{ scale: 0.9 }}
                  transition={{ duration: 0.1 }}
                >
                  <Icon className={cn(
                    'w-5 h-5 transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )} />
                </motion.div>
                <span className={cn(
                  'text-[11px] font-semibold transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {link.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
