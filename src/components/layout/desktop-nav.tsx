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

interface DesktopNavProps {
  links: NavLink[]
}

export function DesktopNav({ links }: DesktopNavProps) {
  const pathname = usePathname()

  return (
    <nav className="hidden md:flex items-center gap-1">
      {links.map((link) => {
        const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`)
        const Icon = link.icon

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all',
              isActive
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <Icon className={cn('w-4 h-4', isActive && 'text-primary')} />
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
