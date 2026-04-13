'use client'

import { useQuery } from '@tanstack/react-query'
import { CalendarDays } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import type { UpcomingUncontactedEvent } from '@/types/api'

export function EventBanner() {
  const { data, isLoading } = useQuery<UpcomingUncontactedEvent>({
    queryKey: ['upcoming-uncontacted'],
    queryFn: () => fetch('/api/events/upcoming-uncontacted').then((r) => { if (!r.ok) throw new Error('Failed'); return r.json() }),
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) {
    return <Skeleton className="h-12 w-full rounded-none mb-4" />
  }

  if (!data?.event || !data.uncontactedCount) {
    return null
  }

  return (
    <Alert
      role="alert"
      className="bg-amber-50 border-amber-200 text-amber-900 flex items-center justify-between py-3 px-4 rounded-none mb-4"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <CalendarDays className="h-4 w-4 text-amber-700 shrink-0" />
        <div>
          <span className="font-medium">{data.event.name}</span>
          <span className="text-sm ml-2">· {data.daysUntil} hari lagi</span>
          <span className="text-sm ml-2">· {data.uncontactedCount} kontak belum diundang</span>
        </div>
      </div>
    </Alert>
  )
}
