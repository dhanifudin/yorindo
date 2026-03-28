'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { ContactsHealth } from '@/types/api'

interface HealthBarProps {
  onStatClick: (type: 'duplicates') => void
}

export function HealthBar({ onStatClick }: HealthBarProps) {
  const { data, isLoading } = useQuery<ContactsHealth>({
    queryKey: ['contacts-health'],
    queryFn: () => fetch('/api/contacts/health').then((r) => { if (!r.ok) throw new Error('Failed'); return r.json() }),
  })

  return (
    <div role="status" aria-live="polite" className="mb-4">
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Duplikat
            </span>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <Button
                variant="ghost"
                data-stat-trigger="duplicates"
                className={`text-2xl font-bold h-auto p-0 ${data && data.duplicates > 0 ? 'text-destructive' : 'text-muted-foreground'}`}
                onClick={() => onStatClick('duplicates')}
                aria-label={`${data?.duplicates ?? 0} duplikat, klik untuk tinjau`}
              >
                {data && data.duplicates > 0 ? data.duplicates : '✓'}
              </Button>
            )}
            {!isLoading && data?.duplicates === 0 && (
              <span className="text-xs text-muted-foreground">Semua bersih</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
