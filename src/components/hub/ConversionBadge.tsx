import { cn } from '@/lib/utils'
import type { Health } from '@/lib/benchmarks'

const HEALTH_CONFIG: Record<Health, { symbol: string; className: string }> = {
  good:    { symbol: '✓', className: 'text-green-700 bg-green-50 border-green-200' },
  warn:    { symbol: '~', className: 'text-amber-700 bg-amber-50 border-amber-200' },
  bad:     { symbol: '✗', className: 'text-red-700 bg-red-50 border-red-200' },
  pending: { symbol: '—', className: 'text-muted-foreground bg-muted border-border' },
}

interface ConversionBadgeProps {
  health: Health
  rate: number | null  // 0.0 to 1.0; null → show '—'
  label: string
}

export function ConversionBadge({ health, rate, label }: ConversionBadgeProps) {
  const config = HEALTH_CONFIG[health]
  const display = health === 'pending' || rate === null
    ? '—'
    : `${Math.round(rate * 100)}%`

  return (
    <span
      aria-label={`${label}: ${display} (${health})`}
      className={cn(
        'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-medium tabular-nums',
        config.className,
      )}
    >
      <span aria-hidden="true">{config.symbol}</span>
      {display}
    </span>
  )
}
