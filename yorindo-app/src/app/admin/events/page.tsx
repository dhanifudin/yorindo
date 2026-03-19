'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEvents } from '@/hooks/useEvents'
import { useEventStore } from '@/store/eventStore'
import { EventCreateForm } from '@/components/features/events/EventCreateForm'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { Event } from '@/types/api'
import { useRouter } from 'next/navigation'

const STATUS_BADGE: Record<Event['status'], { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  published: { label: 'Dipublikasi', className: 'bg-blue-100 text-blue-700' },
  active: { label: 'Berlangsung', className: 'bg-green-100 text-green-700' },
  completed: { label: 'Selesai', className: 'bg-purple-100 text-purple-700' },
  cancelled: { label: 'Dibatalkan', className: 'bg-destructive/10 text-destructive' },
  archived: { label: 'Diarsipkan', className: 'bg-muted text-muted-foreground' },
}

interface DeletedEvent extends Event {
  deletedAt: string
}

export default function EventsPage() {
  const [showForm, setShowForm] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null)
  const { data, isLoading } = useEvents()
  const { setSelectedEvent } = useEventStore()
  const queryClient = useQueryClient()
  const router = useRouter()

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
      const res = await fetch(`/api/events/${id}/restore`, { method: 'PATCH' })
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
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {data?.data.map((event) => {
            const badge = STATUS_BADGE[event.status] ?? STATUS_BADGE.draft
            return (
              <Card key={event.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4 flex items-center justify-between">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => {
                      setSelectedEvent(event.id)
                      router.push(`/admin/events/${event.id}`)
                    }}
                  >
                    <h3 className="font-medium">{event.name}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {new Date(event.eventDate).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: event.timezone,
                      })}
                      {event.capacity && ` · Kapasitas: ${event.capacity}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={badge.className}>{badge.label}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteTarget(event)
                      }}
                    >
                      Hapus
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
