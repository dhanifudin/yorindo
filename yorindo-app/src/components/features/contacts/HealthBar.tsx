'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { ContactsHealth } from '@/types/api'

interface HealthBarProps {
  onStatClick: (type: 'flagged' | 'duplicates' | 'missingEmail') => void
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
          <div className="grid grid-cols-3 gap-4 text-center">
            {/* Flagged stat */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Bermasalah
              </span>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <Button
                  variant="ghost"
                  data-stat-trigger="flagged"
                  className={`text-2xl font-bold h-auto p-0 ${data && data.flagged > 0 ? 'text-destructive' : 'text-muted-foreground'}`}
                  onClick={() => onStatClick('flagged')}
                  aria-label={`${data?.flagged ?? 0} catatan bermasalah, klik untuk tinjau`}
                >
                  {data && data.flagged > 0 ? data.flagged : '✓'}
                </Button>
              )}
              {!isLoading && data?.flagged === 0 && (
                <span className="text-xs text-muted-foreground">Semua bersih</span>
              )}
            </div>

            {/* Duplicates stat */}
            <div className="flex flex-col items-center gap-1">
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

            {/* Missing email stat */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Tanpa Email
              </span>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <Button
                  variant="ghost"
                  data-stat-trigger="missingEmail"
                  className={`text-2xl font-bold h-auto p-0 ${data && data.missingEmail > 0 ? 'text-destructive' : 'text-muted-foreground'}`}
                  onClick={() => onStatClick('missingEmail')}
                  aria-label={`${data?.missingEmail ?? 0} kontak tanpa email, klik untuk filter`}
                >
                  {data && data.missingEmail > 0 ? data.missingEmail : '✓'}
                </Button>
              )}
              {!isLoading && data?.missingEmail === 0 && (
                <span className="text-xs text-muted-foreground">Semua bersih</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
