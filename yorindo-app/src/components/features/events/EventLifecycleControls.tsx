'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { Event } from '@/types/api'

// Valid transitions per status
const TRANSITIONS: Record<Event['status'], { status: Event['status']; label: string; variant: 'default' | 'outline' | 'destructive'; confirm?: boolean }[]> = {
  draft: [
    { status: 'published', label: 'Publikasikan', variant: 'default' },
  ],
  published: [
    { status: 'active', label: 'Mulai Event', variant: 'default' },
    { status: 'cancelled', label: 'Batalkan', variant: 'destructive', confirm: true },
  ],
  active: [
    { status: 'completed', label: 'Selesaikan', variant: 'default' },
    { status: 'cancelled', label: 'Batalkan', variant: 'destructive', confirm: true },
  ],
  completed: [
    { status: 'archived', label: 'Arsipkan', variant: 'outline' },
  ],
  cancelled: [],
  archived: [],
}

interface EventLifecycleControlsProps {
  event: Event
}

export function EventLifecycleControls({ event }: EventLifecycleControlsProps) {
  const queryClient = useQueryClient()
  const [confirmTarget, setConfirmTarget] = useState<Event['status'] | null>(null)

  const patchMutation = useMutation({
    mutationFn: async (newStatus: Event['status']) => {
      const res = await fetch(`/api/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data?.error?.message ?? 'Gagal mengubah status')
      }
      return res.json()
    },
    onSuccess: (updated: Event) => {
      queryClient.setQueryData(['events', event.id], updated)
      queryClient.invalidateQueries({ queryKey: ['events'] })
      toast.success(`Status event diubah ke "${STATUS_LABEL[updated.status]}"`)
      setConfirmTarget(null)
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Gagal mengubah status')
      setConfirmTarget(null)
    },
  })

  const STATUS_LABEL: Record<Event['status'], string> = {
    draft: 'Draft',
    published: 'Dipublikasi',
    active: 'Berlangsung',
    completed: 'Selesai',
    cancelled: 'Dibatalkan',
    archived: 'Diarsipkan',
  }

  const transitions = TRANSITIONS[event.status] ?? []

  const handleClick = (t: (typeof transitions)[number]) => {
    if (t.confirm) {
      setConfirmTarget(t.status)
    } else {
      patchMutation.mutate(t.status)
    }
  }

  if (!transitions.length) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Event dalam status final — tidak ada transisi lebih lanjut.
      </p>
    )
  }

  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase font-medium mb-2">Lifecycle</p>
      <div className="flex gap-2 flex-wrap">
        {transitions.map((t) => (
          <Button
            key={t.status}
            variant={t.variant}
            size="sm"
            onClick={() => handleClick(t)}
            disabled={patchMutation.isPending}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {/* Confirmation dialog for destructive actions */}
      <Dialog open={!!confirmTarget} onOpenChange={(v) => !v && setConfirmTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Pembatalan</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Anda akan membatalkan event <strong>{event.name}</strong>. Semua peserta yang sudah disetujui akan
            mendapatkan notifikasi pembatalan. Tindakan ini tidak dapat dibatalkan.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmTarget(null)}>Batal</Button>
            <Button
              variant="destructive"
              onClick={() => confirmTarget && patchMutation.mutate(confirmTarget)}
              disabled={patchMutation.isPending}
            >
              Ya, Batalkan Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
