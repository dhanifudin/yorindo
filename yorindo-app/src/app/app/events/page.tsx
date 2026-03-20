'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useEvents } from '@/hooks/useEvents'
import { useEventStore } from '@/store/eventStore'
import { EventCreateForm } from '@/components/features/events/EventCreateForm'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { toast } from 'sonner'
import type { Event } from '@/types/api'

const STATUS_BADGE: Record<Event['status'], { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  published: { label: 'Dipublikasi', className: 'bg-blue-100 text-blue-700' },
  active: { label: 'Berlangsung', className: 'bg-green-100 text-green-700' },
  completed: { label: 'Selesai', className: 'bg-purple-100 text-purple-700' },
  cancelled: { label: 'Dibatalkan', className: 'bg-destructive/10 text-destructive' },
  archived: { label: 'Diarsipkan', className: 'bg-muted text-muted-foreground' },
}

const UPCOMING_STATUSES: Event['status'][] = ['draft', 'published', 'active']
const HISTORY_STATUSES: Event['status'][] = ['completed', 'cancelled', 'archived']

type TabValue = 'upcoming' | 'history'

interface DeletedEvent extends Event {
  deletedAt: string
}

export default function EventsPage() {
  const [showForm, setShowForm] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null)
  const [detailEvent, setDetailEvent] = useState<Event | null>(null)
  const { data, isLoading } = useEvents()
  const { setSelectedEvent } = useEventStore()
  const queryClient = useQueryClient()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // URL-driven state
  const activeTab = (searchParams.get('tab') as TabValue) || 'upcoming'
  const activeStatus = searchParams.get('status') as Event['status'] | null
  const searchQuery = searchParams.get('search') || ''

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      }
      // Remove default tab from URL
      if (params.get('tab') === 'upcoming') params.delete('tab')
      const qs = params.toString()
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
    },
    [searchParams, pathname, router],
  )

  const setTab = useCallback(
    (tab: TabValue) => {
      // Switching tabs clears status filter and search
      updateParams({ tab: tab === 'upcoming' ? null : tab, status: null, search: null })
    },
    [updateParams],
  )

  const setStatusFilter = useCallback(
    (status: Event['status'] | null) => {
      updateParams({ status })
    },
    [updateParams],
  )

  const setSearch = useCallback(
    (value: string) => {
      updateParams({ search: value || null })
    },
    [updateParams],
  )

  // Derived data
  const allEvents = data?.data ?? []

  const { upcomingEvents, historyEvents } = useMemo(() => {
    const upcoming = allEvents.filter((e) => UPCOMING_STATUSES.includes(e.status))
    const history = allEvents.filter((e) => HISTORY_STATUSES.includes(e.status))
    return { upcomingEvents: upcoming, historyEvents: history }
  }, [allEvents])

  const tabStatuses = activeTab === 'upcoming' ? UPCOMING_STATUSES : HISTORY_STATUSES
  const tabEvents = activeTab === 'upcoming' ? upcomingEvents : historyEvents

  const filteredEvents = useMemo(() => {
    let events = tabEvents

    // Status filter
    if (activeStatus && tabStatuses.includes(activeStatus)) {
      events = events.filter((e) => e.status === activeStatus)
    }

    // Text search
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      events = events.filter((e) => e.name.toLowerCase().includes(q))
    }

    // Sort: upcoming = ascending by date, history = descending
    return [...events].sort((a, b) => {
      const diff = new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
      return activeTab === 'upcoming' ? diff : -diff
    })
  }, [tabEvents, activeStatus, searchQuery, tabStatuses, activeTab])

  // Status counts for chips
  const statusCounts = useMemo(() => {
    const counts: Partial<Record<Event['status'], number>> = {}
    for (const status of tabStatuses) {
      counts[status] = tabEvents.filter((e) => e.status === status).length
    }
    return counts
  }, [tabEvents, tabStatuses])

  const { data: deletedData } = useQuery<{ data: DeletedEvent[] }>({
    queryKey: ['events-deleted'],
    queryFn: () => fetch('/api/events?deleted=true').then((r) => r.json()),
    enabled: showDeleted,
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/events/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Hapus gagal')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['events-deleted'] })
      toast.success('Event dipindahkan ke tempat sampah')
      setDeleteTarget(null)
    },
    onError: () => toast.error('Gagal menghapus event'),
  })

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/events/${id}/restore`, { method: 'POST' })
      if (!res.ok) throw new Error('Restore gagal')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['events-deleted'] })
      toast.success('Event berhasil dipulihkan')
    },
    onError: () => toast.error('Gagal memulihkan event'),
  })

  const emptyMessage =
    activeTab === 'upcoming' ? 'Tidak ada event mendatang' : 'Belum ada riwayat event'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Manajemen Event</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeleted((v) => !v)}
          >
            {showDeleted ? 'Aktif' : 'Terhapus'} ({deletedData?.data.length ?? 0})
          </Button>
          {!showDeleted && <Button onClick={() => setShowForm(true)}>+ Event Baru</Button>}
        </div>
      </div>

      {showForm && !showDeleted && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-4">Buat Event Baru</h2>
            <EventCreateForm
              onSuccess={() => setShowForm(false)}
              onCancel={() => setShowForm(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Event</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Anda akan menghapus event <strong>{deleteTarget?.name}</strong>.{' '}
            Event akan masuk ke tempat sampah dan dapat dipulihkan dalam 30 hari.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Batal</Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event detail sheet (mobile) */}
      <Sheet open={!!detailEvent} onOpenChange={(v) => !v && setDetailEvent(null)}>
        <SheetContent side="bottom" className="max-h-[60vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{detailEvent?.name}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 mt-4 text-sm">
            <div>
              <span className="text-muted-foreground">Status: </span>
              {detailEvent && (
                <Badge className={STATUS_BADGE[detailEvent.status].className}>
                  {STATUS_BADGE[detailEvent.status].label}
                </Badge>
              )}
            </div>
            <div>
              <span className="text-muted-foreground">Tanggal: </span>
              {detailEvent && new Date(detailEvent.eventDate).toLocaleDateString('id-ID', {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit', timeZone: detailEvent.timezone,
              })}
            </div>
            {detailEvent?.capacity && (
              <div>
                <span className="text-muted-foreground">Kapasitas: </span>
                {detailEvent.capacity}
              </div>
            )}
            {detailEvent?.description && (
              <div>
                <span className="text-muted-foreground">Deskripsi: </span>
                {detailEvent.description}
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-6">
            <Button
              size="sm"
              onClick={() => {
                if (detailEvent) {
                  setSelectedEvent(detailEvent.id)
                  router.push(`/app/events/${detailEvent.id}`)
                }
                setDetailEvent(null)
              }}
            >
              Lihat Detail
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                if (detailEvent) setDeleteTarget(detailEvent)
                setDetailEvent(null)
              }}
            >
              Hapus
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {showDeleted ? (
        <div>
          <h2 className="text-lg font-semibold mb-4">Event Terhapus</h2>
          {!deletedData?.data.length ? (
            <p className="text-muted-foreground text-center py-12">Tidak ada event yang terhapus</p>
          ) : (
            <div className="space-y-3">
              {deletedData.data.map((event) => (
                <Card key={event.id}>
                  <CardContent className="py-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{event.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Dihapus: {new Date(event.deletedAt).toLocaleDateString('id-ID')} ·
                        Pulihkan sebelum {new Date(new Date(event.deletedAt).getTime() + 30 * 86400000).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => restoreMutation.mutate(event.id)}
                      disabled={restoreMutation.isPending}
                    >
                      Pulihkan
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Tab navigation */}
          <div className="flex items-center gap-1 border-b mb-4">
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'upcoming'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setTab('upcoming')}
            >
              Mendatang
              <Badge variant="secondary" className="ml-2 text-xs">
                {upcomingEvents.length}
              </Badge>
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'history'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setTab('history')}
            >
              Riwayat
              <Badge variant="secondary" className="ml-2 text-xs">
                {historyEvents.length}
              </Badge>
            </button>
          </div>

          {/* Filters: search + status chips */}
          <div className="space-y-3 mb-4">
            <Input
              type="search"
              placeholder="Cari nama event..."
              value={searchQuery}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <div className="flex flex-wrap gap-2">
              {tabStatuses.map((status) => {
                const isActive = activeStatus === status
                const badge = STATUS_BADGE[status]
                const count = statusCounts[status] ?? 0
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(isActive ? null : status)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      isActive
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${badge.className.split(' ')[0]}`}
                    />
                    {badge.label}
                    <span className="text-muted-foreground">({count})</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Events table / cards */}
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : !filteredEvents.length ? (
            <p className="text-center text-muted-foreground py-8">
              {searchQuery || activeStatus ? 'Tidak ada event yang cocok dengan filter' : emptyMessage}
            </p>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden space-y-2">
                {filteredEvents.map((event) => {
                  const badge = STATUS_BADGE[event.status] ?? STATUS_BADGE.draft
                  return (
                    <div
                      key={event.id}
                      className="rounded-lg border border-border bg-card p-3 cursor-pointer active:bg-muted/50"
                      onClick={() => setDetailEvent(event)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{event.name}</span>
                        <Badge className={badge.className}>{badge.label}</Badge>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <div className="text-xs text-muted-foreground">
                          {new Date(event.eventDate).toLocaleDateString('id-ID', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            timeZone: event.timezone,
                          })}
                          {event.capacity != null && ` · Kapasitas: ${event.capacity}`}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive -mr-2 h-7 px-2"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteTarget(event)
                          }}
                        >
                          Hapus
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Desktop table */}
              <Card className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Event</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Kapasitas</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvents.map((event) => {
                      const badge = STATUS_BADGE[event.status] ?? STATUS_BADGE.draft
                      return (
                        <TableRow
                          key={event.id}
                          className="cursor-pointer"
                          onClick={() => setDetailEvent(event)}
                        >
                          <TableCell
                            className="font-medium"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedEvent(event.id)
                              router.push(`/app/events/${event.id}`)
                            }}
                          >
                            {event.name}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Badge className={badge.className}>{badge.label}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm" onClick={(e) => e.stopPropagation()}>
                            {new Date(event.eventDate).toLocaleDateString('id-ID', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              timeZone: event.timezone,
                            })}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm" onClick={(e) => e.stopPropagation()}>
                            {event.capacity ?? '\u2014'}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(event)}
                            >
                              Hapus
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  )
}
