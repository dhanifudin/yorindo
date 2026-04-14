'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useAssignedEvents } from '@/hooks/useAssignedEvents'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { QrCode, Search, Calendar, Users, UserCheck, Clock } from 'lucide-react'
import { formatIndonesianDate } from '@/lib/dateUtils'
import type { Event } from '@/types/api'

interface AttendanceStats {
  total: number
  attended: number
  pending: number
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  published: 'Dipublikasi',
  active: 'Berlangsung',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
  archived: 'Diarsipkan',
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  published: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
  archived: 'bg-gray-100 text-gray-500',
}

function EventCard({ event, showScanLink }: { event: Event; showScanLink: boolean }) {
  const { data: stats, isLoading } = useQuery<AttendanceStats>({
    queryKey: ['attendance-stats', event.id],
    queryFn: () => fetch(`/api/events/${event.id}/attendance-stats`).then((r) => r.json()),
    refetchInterval: 30_000,
    staleTime: 20_000,
  })

  const attended = stats?.attended ?? 0
  const total = event.capacity ?? stats?.total ?? 0
  const pct = total > 0 ? Math.round((attended / total) * 100) : 0

  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-colors group"
      onClick={() => {
        window.location.href = `/app/events/${event.id}`
      }}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold truncate group-hover:text-primary transition-colors">{event.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={STATUS_BADGE[event.status] ?? 'bg-muted text-muted-foreground'}>
                {STATUS_LABEL[event.status] ?? event.status}
              </Badge>
              {event.venue && (
                <span className="text-xs text-muted-foreground truncate">{event.venue}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {event.eventDate
              ? new Date(event.eventDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
              : '—'}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {isLoading ? <Skeleton className="h-4 w-12" /> : `${attended} / ${total}`}
          </span>
        </div>

        {/* Progress bar */}
        {!isLoading && total > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Kehadiran</span>
              <span>{pct}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {/* Action buttons */}
        {showScanLink && (
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="flex-1 gap-1.5" asChild>
              <Link href="/app/scan">
                <QrCode className="h-3.5 w-3.5" />
                Scan QR
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function StaffDashboard() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser()
  const { data: assignedEvents, isLoading: eventsLoading } = useAssignedEvents()
  const authUser = useAuthStore((s) => s.user)

  const activeEvents = (assignedEvents ?? []).filter((e) => e.status === 'active')
  const upcomingEvents = (assignedEvents ?? []).filter(
    (e) => e.status === 'published' && new Date(e.eventDate) >= new Date()
  ).sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())

  // Aggregate stats across all active events
  const { data: activeStats } = useQuery<{ totalAttended: number; totalPending: number }>({
    queryKey: ['staff-dashboard-active-stats'],
    queryFn: async () => {
      const results = await Promise.allSettled(
        activeEvents.map((e) =>
          fetch(`/api/events/${e.id}/attendance-stats`).then((r) => r.json())
        )
      )
      let totalAttended = 0
      let totalPending = 0
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          totalAttended += result.value.attended ?? 0
          totalPending += result.value.pending ?? 0
        }
      }
      return { totalAttended, totalPending }
    },
    enabled: activeEvents.length > 0,
    refetchInterval: 30_000,
  })

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
          <p className="text-muted-foreground text-sm mt-1">{today}</p>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button asChild className="h-14 gap-2 text-base">
          <Link href="/app/scan">
            <QrCode className="h-5 w-5" />
            Scan Check-in
          </Link>
        </Button>
        <Button variant="outline" asChild className="h-14 gap-2 text-base">
          <Link href="/app/scan">
            <Search className="h-5 w-5" />
            Check-in Manual
          </Link>
        </Button>
      </div>

      {/* Aggregate stats for active events */}
      {activeEvents.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-2">
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">{activeStats?.totalAttended ?? 0}</p>
                <p className="text-xs text-muted-foreground">Sudah hadir</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-full bg-orange-100 p-2">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-700">{activeStats?.totalPending ?? 0}</p>
                <p className="text-xs text-muted-foreground">Belum hadir</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeEvents.length}</p>
                <p className="text-xs text-muted-foreground">Event aktif</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active events */}
      <div>
        <h2 className="text-base font-semibold mb-3">Event Berlangsung</h2>
        {eventsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : activeEvents.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Tidak ada event aktif saat ini.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Hubungi admin untuk penugasan event.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeEvents.map((event) => (
              <EventCard key={event.id} event={event} showScanLink />
            ))}
          </div>
        )}
      </div>

      {/* Upcoming events */}
      {upcomingEvents.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3">Event Mendatang</h2>
          <div className="space-y-3">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} showScanLink={false} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
