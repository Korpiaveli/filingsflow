'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="bg-card/95 backdrop-blur-lg border-t shadow-lg">
        <div className="flex items-center justify-around px-2 py-2 safe-area-inset-bottom">
          {links.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`)
            const Icon = link.icon

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all min-w-[64px]',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground active:scale-95'
                )}
              >
                {isActive && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
                )}
                <div
                  className={cn(
                    'p-1.5 rounded-lg transition-all',
                    isActive ? 'bg-primary/10 scale-110' : 'group-hover:bg-muted/50'
                  )}
                >
                  <Icon className={cn('w-5 h-5', isActive && 'text-primary')} />
                </div>
                <span className={cn(
                  'text-[10px] font-medium transition-colors',
                  isActive && 'text-primary'
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
