'use client'

import { use, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface CancelPageProps {
  params: Promise<{ token: string }>
}

interface TicketData {
  token: string
  participantName: string
  eventName: string
  eventDate: string
  registrationId: string
}

export default function CancelPage({ params }: CancelPageProps) {
  const { token } = use(params)
  const [cancelled, setCancelled] = useState(false)

  const { data: ticket, isLoading, isError } = useQuery<TicketData>({
    queryKey: ['ticket-cancel', token],
    queryFn: async () => {
      const res = await fetch(`/api/tickets/${token}`)
      if (!res.ok) throw new Error('Tiket tidak valid')
      return res.json()
    },
    retry: false,
  })

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!ticket) throw new Error('No ticket')
      const res = await fetch(`/api/registrations/${ticket.registrationId}/cancel`, {
        method: 'POST',
      })
      if (!res.ok) {
        const body = await res.json()
        if (res.status === 403) throw new Error('deadline_passed')
        throw new Error(body?.error?.message ?? 'Pembatalan gagal')
      }
      return res.json()
    },
    onSuccess: () => setCancelled(true),
    onError: (err) => {
      if ((err as Error).message === 'deadline_passed') {
        // Handled in UI
      }
    },
  })

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="h-48 bg-muted rounded-xl animate-pulse" />
      </div>
    )
  }

  if (isError || !ticket) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <Card>
          <CardContent className="pt-8 pb-8 text-center space-y-3">
            <div className="text-4xl">❌</div>
            <h2 className="text-xl font-bold">Link Tidak Valid</h2>
            <p className="text-muted-foreground text-sm">
              Link pembatalan ini tidak valid atau sudah kadaluarsa.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (cancelled) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <Card>
          <CardContent className="pt-8 pb-8 text-center space-y-3">
            <div className="text-4xl">✅</div>
            <h2 className="text-xl font-bold">Pendaftaran Dibatalkan</h2>
            <p className="text-muted-foreground text-sm">
              Pendaftaran Anda untuk <strong>{ticket.eventName}</strong> telah berhasil dibatalkan.
              {' Slot Anda telah dikembalikan ke kapasitas event.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <Card>
        <CardContent className="pt-8 pb-8 space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">Batalkan Pendaftaran?</h2>
            <p className="text-muted-foreground text-sm">
              Anda akan membatalkan pendaftaran berikut:
            </p>
          </div>

          <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
            <p><span className="text-muted-foreground">Nama:</span> {ticket.participantName}</p>
            <p><span className="text-muted-foreground">Event:</span> {ticket.eventName}</p>
            <p>
              <span className="text-muted-foreground">Tanggal:</span>{' '}
              {new Date(ticket.eventDate).toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Setelah dibatalkan, slot Anda akan diberikan kepada peserta lain.
            Pembatalan tidak dapat dibatalkan kembali.
          </p>

          <Button
            variant="destructive"
            className="w-full"
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending ? 'Membatalkan…' : 'Ya, Batalkan Pendaftaran'}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Tutup halaman ini jika Anda tidak ingin membatalkan.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
