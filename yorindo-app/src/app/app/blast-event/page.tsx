'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { getUserFriendlyError } from '@/lib/error-messages'
import Link from 'next/link'
import { CalendarDays, MapPin, Users, CheckCircle2, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

// Adjust Event type fields to match your actual API shape
interface EventItem {
  id: string
  name: string
  date: string
  location?: string
  registeredCount?: number
  status: 'ongoing' | 'upcoming' | 'ended'
}

export default function BlastEventPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // contactIds passed via query string: ?contactIds=id1,id2,id3
  const contactIdsParam = searchParams.get('contactIds') ?? ''
  const contactIds = contactIdsParam ? contactIdsParam.split(',').filter(Boolean) : []

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery<{ data: EventItem[] }>({
    queryKey: ['events-active'],
    queryFn: () =>
      fetch('/api/events?status=ongoing,upcoming&pageSize=50').then((r) => r.json()),
  })

  const blastMutation = useMutation({
    mutationFn: async ({ eventId, contactIds }: { eventId: string; contactIds: string[] }) => {
      const res = await fetch(`/api/events/${eventId}/blast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body?.error?.message ?? 'Blast gagal')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success(`Berhasil assign ${contactIds.length} kontak ke event`)
      router.push('/app/contacts')
    },
    onError: (err: Error) => {
      toast.error(getUserFriendlyError(err))
    },
  })

  const STATUS_LABEL: Record<EventItem['status'], string> = {
    ongoing: 'Sedang Berlangsung',
    upcoming: 'Akan Datang',
    ended: 'Selesai',
  }

  const STATUS_BADGE: Record<EventItem['status'], string> = {
    ongoing: 'bg-green-100 text-green-700',
    upcoming: 'bg-blue-100 text-blue-700',
    ended: 'bg-muted text-muted-foreground',
  }

  const filteredEvents = (data?.data ?? []).filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  )

  const selectedEvent = filteredEvents.find((e) => e.id === selectedEventId)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Back nav */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/app/contacts"
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          ← Kembali ke Kontak
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Blast ke Event</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Pilih event untuk assign{' '}
          <span className="font-semibold text-foreground">{contactIds.length} kontak</span>{' '}
          yang dipilih
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari event..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Event list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          Tidak ada event yang ditemukan
        </p>
      ) : (
        <div className="space-y-3 mb-8">
          {filteredEvents.map((event) => {
            const isSelected = selectedEventId === event.id
            return (
              <Card
                key={event.id}
                onClick={() => setSelectedEventId(isSelected ? null : event.id)}
                className={`cursor-pointer transition-all border-2 ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <CardContent className="py-4 px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-semibold truncate">{event.name}</p>
                        <Badge className={`text-xs shrink-0 ${STATUS_BADGE[event.status]}`}>
                          {STATUS_LABEL[event.status]}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {new Date(event.date).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </span>
                        )}
                        {event.registeredCount != null && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {event.registeredCount} terdaftar
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Confirm bar */}
      {selectedEventId && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t px-4 py-4 flex items-center justify-between gap-4 z-50">
          <div className="text-sm">
            <p className="font-medium truncate max-w-[200px] sm:max-w-xs">
              {selectedEvent?.name}
            </p>
            <p className="text-muted-foreground">{contactIds.length} kontak akan di-assign</p>
          </div>
          <Button
            onClick={() =>
              blastMutation.mutate({ eventId: selectedEventId, contactIds })
            }
            disabled={blastMutation.isPending}
            className="shrink-0"
          >
            {blastMutation.isPending ? 'Memproses…' : `Blast ${contactIds.length} Kontak →`}
          </Button>
        </div>
      )}
    </div>
  )
}