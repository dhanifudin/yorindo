'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import type { Event } from '@/types/api'

interface EventCloneDialogProps {
  event: Event
}

export function EventCloneDialog({ event }: EventCloneDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const router = useRouter()

  const cloneMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/events/${event.id}/clone`, { method: 'POST' })
      if (!res.ok) throw new Error('Clone gagal')
      return res.json() as Promise<Event>
    },
    onSuccess: (cloned) => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      toast.success(`Event berhasil disalin: ${cloned.name}`)
      setOpen(false)
      router.push(`/admin/events/${cloned.id}`)
    },
    onError: () => toast.error('Gagal menyalin event'),
  })

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Salin Event
      </Button>

      <Dialog open={open} onOpenChange={(v) => !v && setOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salin Event</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Anda akan menyalin event <strong>{event.name}</strong>. Event baru akan dibuat dalam status{' '}
            <strong>Draft</strong> dengan semua konfigurasi yang sama.
          </p>
          <p className="text-sm text-muted-foreground">
            Data peserta dan kehadiran <strong>tidak</strong> akan disalin.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={() => cloneMutation.mutate()} disabled={cloneMutation.isPending}>
              {cloneMutation.isPending ? 'Menyalin…' : 'Ya, Salin Event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
