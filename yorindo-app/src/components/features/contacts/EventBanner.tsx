'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { CalendarDays } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { UpcomingUncontactedEvent } from '@/types/api'

function buildBlastUrl(event: { id: string; industryTags?: string[] }, count: number): string {
  const params = new URLSearchParams()
  params.set('eventId', event.id)
  if (event.industryTags?.length) params.set('segment', event.industryTags.join(','))
  params.set('count', String(count))
  return `/app/blasts/new?${params.toString()}`
}

export function EventBanner() {
  const router = useRouter()
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
      <Button
        size="sm"
        className="bg-amber-700 hover:bg-amber-800 text-white shrink-0"
        onClick={() => router.push(buildBlastUrl(data.event!, data.uncontactedCount!))}
      >
        Blast Sekarang →
      </Button>
    </Alert>
  )
}
