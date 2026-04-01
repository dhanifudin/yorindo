'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface BlockerItem {
  id: string
  label: string
  onClick: () => void
  urgency?: 'default' | 'warning' | 'critical'
}

interface BlockerStripProps {
  items: BlockerItem[]
  className?: string
}

export function BlockerStrip({ items, className }: BlockerStripProps) {
  return (
    // Always rendered for aria-live declaration — conditionally visible via 'hidden'
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center gap-1 border-b px-4 py-1 bg-muted/30',
        items.length === 0 && 'hidden',
        className,
      )}
    >
      {items.map((item) => (
        <Button
          key={item.id}
          variant="ghost"
          size="sm"
          onClick={item.onClick}
          className={cn(
            'h-7 text-xs',
            item.urgency === 'warning' && 'text-amber-600 hover:text-amber-700',
            item.urgency === 'critical' && 'text-destructive hover:text-destructive',
          )}
        >
          {item.label}
        </Button>
      ))}
    </div>
  )
}
