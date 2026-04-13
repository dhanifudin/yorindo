'use client'

import { useState, useMemo } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAssignedEvents } from '@/hooks/useAssignedEvents'
import { QRScanner } from '@/components/features/scan/QRScanner'
import { ManualCheckinSheet } from '@/components/features/scan/NameSearchSheet'
import { ParticipantSyncStatus } from '@/components/features/scan/ParticipantSyncStatus'
import { ScanStatsBar } from '@/components/features/scan/ScanStatsBar'
import { Users, Search, BadgeCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Event as EventType } from '@/types/api'

export default function ScanPage() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  const router = useRouter()
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)

  const isAdmin = user?.role === 'admin'

  // Fetch all events for admin, assigned events for staff
  const { data: assignedEvents, isLoading: loadingAssigned } = useAssignedEvents()
  const { data: allEvents, isLoading: loadingEvents } = useQuery<{ data: EventType[] }>({
    queryKey: ['events-list'],
    queryFn: () => fetch('/api/events?status=active').then((r) => r.json()),
    enabled: isAdmin,
    staleTime: 30_000,
  })

  const availableEvents: EventType[] = useMemo(() => {
    if (isAdmin) return allEvents?.data ?? []
    // For staff, filter assigned events to only active ones
    return (assignedEvents ?? []).filter((e) => e.status === 'active')
  }, [isAdmin, allEvents, assignedEvents])

  const isLoading = isAdmin ? loadingEvents : loadingAssigned

  // Derive selected event ID: use explicit selection or default to first available
  const resolvedEventId = selectedEventId ?? availableEvents[0]?.id ?? null
  const selectedEvent = availableEvents.find((e) => e.id === resolvedEventId)

  const handleCheckinSuccess = (result: { contactName: string; eventName: string }) => {
    // QRScanner and NameSearchSheet both show their own toasts
  }

  if (!accessToken) {
    router.replace('/login')
    return null
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5 pb-10">
        <div>
          <h1 className="text-2xl font-bold">Scan Check-in</h1>
          <p className="text-sm text-muted-foreground mt-1">Memuat data event...</p>
        </div>
      </div>
    )
  }

  if (availableEvents.length === 0) {
    return (
      <div className="flex flex-col gap-5 pb-10">
        <div>
          <h1 className="text-2xl font-bold">Scan Check-in</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin
              ? 'Tidak ada event aktif untuk check-in.'
              : 'Anda belum ditugaskan ke event aktif. Hubungi admin untuk penugasan.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Scan Check-in</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Scan QR peserta atau cari nama untuk check-in manual
        </p>
      </div>

      {/* Current event info */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <BadgeCheck className="h-4 w-4 text-green-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedEvent?.name}</p>
              <p className="text-xs text-muted-foreground">
                {selectedEvent?.eventDate
                  ? new Date(selectedEvent.eventDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                  : ''}
              </p>
            </div>
            <Badge className="bg-green-100 text-green-700 shrink-0">Berlangsung</Badge>
          </div>
          {availableEvents.length > 1 && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                <Select value={resolvedEventId ?? ''} onValueChange={setSelectedEventId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Ganti event..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEvents.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync status for selected event */}
      {resolvedEventId && (
        <ParticipantSyncStatus eventId={resolvedEventId} />
      )}

      {/* Scan area */}
      {resolvedEventId && (
        <>
          <div className="relative rounded-xl overflow-hidden border border-border bg-black aspect-square max-w-md mx-auto">
            <QRScanner eventId={resolvedEventId} />
          </div>

          {/* Stats bar */}
          <ScanStatsBar
            eventId={resolvedEventId}
            capacity={selectedEvent?.capacity ?? 0}
            lastScan={null}
          />

          {/* Manual check-in button */}
          <Button
            onClick={() => setSearchOpen(true)}
            variant="outline"
            className="w-full gap-2"
          >
            <Search className="h-4 w-4" />
            Check-in Manual (Cari Nama)
          </Button>

          {/* Manual check-in sheet */}
          <ManualCheckinSheet
            open={searchOpen}
            onClose={() => setSearchOpen(false)}
            eventId={resolvedEventId}
            onCheckinSuccess={handleCheckinSuccess}
          />
        </>
      )}
    </div>
  )
}
