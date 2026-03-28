'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useAssignedEvents } from '@/hooks/useAssignedEvents'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { isToday, formatIndonesianDate, formatEventTime } from '@/lib/dateUtils'
import type { Event } from '@/types/api'

interface AttendanceStats {
  total: number
  attended: number
  pending: number
}

function EventCard({ event }: { event: Event }) {
  const { data: stats, isLoading } = useQuery<AttendanceStats>({
    queryKey: ['attendance-stats', event.id],
    queryFn: () => fetch(`/api/events/${event.id}/attendance-stats`).then((r) => r.json()),
    refetchInterval: 30_000,
  })

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div>
        <p className="font-semibold">{event.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatEventTime(event.eventDate, event.timezone)}
        </p>
      </div>
      <div className="text-sm text-muted-foreground">
        {isLoading ? (
          <Skeleton className="h-4 w-32" />
        ) : (
          <span>Check-in: {stats?.attended ?? 0} / {event.capacity ?? stats?.total ?? 0}</span>
        )}
      </div>
      <Button asChild size="sm" className="w-full">
        <Link href={`/app/scan?eventId=${event.id}`}>Mulai Scan</Link>
      </Button>
    </div>
  )
}

export function StaffDashboard() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser()
  const { data: assignedEvents, isLoading: eventsLoading } = useAssignedEvents()

  const authUser = useAuthStore((s) => s.user)

  const todayEvents = (assignedEvents ?? []).filter(
    (e) => e.status === 'active' && isToday(e.eventDate, e.timezone)
  )

  const greeting = currentUser?.name ?? authUser?.name ?? 'Staff'
  const today = formatIndonesianDate(new Date())

  return (
    <div className="space-y-6">
      {/* Greeting */}
      {userLoading ? (
        <Skeleton className="h-8 w-64" />
      ) : (
        <div>
          <h1 className="text-2xl font-bold">Selamat datang, {greeting}!</h1>
          <p className="text-muted-foreground text-sm mt-1">Hari ini: {today}</p>
        </div>
      )}

      {/* Assigned events */}
      <div>
        <h2 className="text-base font-semibold mb-3">Event Hari Ini</h2>
        {eventsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : todayEvents.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">Tidak ada event yang ditugaskan hari ini.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
