'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { ContactsHealth } from '@/types/api'

interface HealthBarProps {
  onStatClick: (type: 'duplicates' | 'missingEmail' | 'missingPhone') => void
}

export function HealthBar({ onStatClick }: HealthBarProps) {
  const { data, isLoading } = useQuery<ContactsHealth>({
    queryKey: ['contacts-health'],
    queryFn: () => fetch('/api/contacts/health').then((r) => { if (!r.ok) throw new Error('Failed'); return r.json() }),
  })

  const stats = [
    {
      key: 'duplicates' as const,
      label: 'Duplikat',
      value: data?.duplicates ?? 0,
      zeroLabel: 'Semua bersih',
    },
    {
      key: 'missingEmail' as const,
      label: 'Email Kosong',
      value: data?.missingEmail ?? 0,
      zeroLabel: 'Lengkap',
    },
    {
      key: 'missingPhone' as const,
      label: 'Telepon Kosong',
      value: data?.missingPhone ?? 0,
      zeroLabel: 'Lengkap',
    },
  ]

  return (
    <div role="status" aria-live="polite" className="mb-4">
      <Card>
        <CardContent className="py-3 px-4">
          <div className="grid gap-4 md:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.key} className="flex items-center gap-4">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {stat.label}
                </span>
                {isLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <Button
                    variant="ghost"
                    data-stat-trigger={stat.key}
                    className={`h-auto p-0 text-2xl font-bold ${stat.value > 0 ? 'text-destructive' : 'text-muted-foreground'}`}
                    onClick={() => onStatClick(stat.key)}
                    aria-label={`${stat.value} ${stat.label.toLowerCase()}, klik untuk tinjau`}
                  >
                    {stat.value > 0 ? stat.value : '✓'}
                  </Button>
                )}
                {!isLoading && stat.value === 0 && (
                  <span className="text-xs text-muted-foreground">{stat.zeroLabel}</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
