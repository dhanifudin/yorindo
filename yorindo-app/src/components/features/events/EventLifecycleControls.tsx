'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Info } from 'lucide-react'
import { toast } from 'sonner'
import type { Event } from '@/types/api'

const AUTO_DURATION_MS = 4 * 60 * 60 * 1000 // 4 hours default duration
const POLL_INTERVAL_MS = 60 * 1000 // check every 60 seconds

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

const STATUS_LABEL: Record<Event['status'], string> = {
  draft: 'Draft',
  published: 'Dipublikasi',
  active: 'Berlangsung',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
  archived: 'Diarsipkan',
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

  // --- Auto lifecycle transitions ---
  const autoTransitionRef = useRef(false) // guard against concurrent auto-transitions

  const getAutoTransition = useCallback((): Event['status'] | null => {
    const now = Date.now()
    const eventTime = new Date(event.eventDate).getTime()

    if (event.status === 'published' && eventTime <= now) {
      return 'active'
    }
    if (event.status === 'active' && eventTime + AUTO_DURATION_MS <= now) {
      return 'completed'
    }
    return null
  }, [event.status, event.eventDate])

  const autoMutation = useMutation({
    mutationFn: async (newStatus: Event['status']) => {
      const res = await fetch(`/api/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Auto-transition failed')
      return res.json()
    },
    onSuccess: (updated: Event) => {
      queryClient.setQueryData(['events', event.id], updated)
      queryClient.invalidateQueries({ queryKey: ['events'] })
      toast.info(`Event otomatis berubah ke "${STATUS_LABEL[updated.status]}"`)
      autoTransitionRef.current = false
    },
    onError: () => {
      autoTransitionRef.current = false
    },
  })

  useEffect(() => {
    const check = () => {
      const target = getAutoTransition()
      if (target && !autoTransitionRef.current && !autoMutation.isPending) {
        autoTransitionRef.current = true
        autoMutation.mutate(target)
      }
    }

    // Check on mount
    check()

    // Poll every 60 seconds
    const interval = setInterval(check, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [getAutoTransition, autoMutation])

  // Compute auto-transition info message
  const autoTransitionInfo = (() => {
    if (event.status === 'published') {
      const d = new Date(event.eventDate)
      return `Akan aktif otomatis pada ${d.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: event.timezone })}`
    }
    if (event.status === 'active') {
      const d = new Date(new Date(event.eventDate).getTime() + AUTO_DURATION_MS)
      return `Akan selesai otomatis pada ${d.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: event.timezone })}`
    }
    return null
  })()

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

      {/* Auto-transition info banner */}
      {autoTransitionInfo && (
        <div className="flex items-start gap-2 mt-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{autoTransitionInfo}</span>
        </div>
      )}

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
