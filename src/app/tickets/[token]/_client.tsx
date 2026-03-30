'use client'

import { use, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import QRCode from 'react-qr-code'

interface TicketPageProps {
  params: Promise<{ token: string }>
}

interface TicketData {
  token: string
  participantName: string
  eventName: string
  eventDate: string
  eventLocation: string
  registrationId: string
}

export default function TicketPage({ params }: TicketPageProps) {
  const { token } = use(params)
  const printRef = useRef<HTMLDivElement>(null)

  const { data: ticket, isLoading, isError } = useQuery<TicketData>({
    queryKey: ['ticket', token],
    queryFn: async () => {
      const res = await fetch(`/api/tickets/${token}`)
      if (!res.ok) throw new Error('Tiket tidak ditemukan')
      return res.json()
    },
    retry: false,
  })

  const handleDownload = () => {
    window.print()
  }

  if (isLoading) {
    return (
      <div className="max-w-sm mx-auto px-4 py-12">
        <div className="h-64 bg-muted rounded-xl animate-pulse" />
      </div>
    )
  }

  if (isError || !ticket) {
    return (
      <div className="max-w-sm mx-auto px-4 py-12 text-center">
        <Card>
          <CardContent className="pt-8 pb-8 space-y-3">
            <div className="text-4xl">❌</div>
            <h2 className="text-xl font-bold">Tiket Tidak Ditemukan</h2>
            <p className="text-muted-foreground text-sm">
              Link tiket ini tidak valid atau sudah kadaluarsa.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-8">
      <div ref={printRef}>
        <Card className="overflow-hidden">
          <div className="bg-primary px-6 py-4">
            <h1 className="text-primary-foreground font-bold text-lg">{ticket.eventName}</h1>
            <p className="text-primary-foreground/80 text-sm mt-0.5">
              {new Date(ticket.eventDate).toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <CardContent className="pt-6 pb-6 space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-white rounded-lg border">
                <QRCode value={ticket.token} size={180} />
              </div>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">{ticket.participantName}</p>
              <p className="text-sm text-muted-foreground mt-0.5">📍 {ticket.eventLocation}</p>
            </div>
            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground text-center font-mono">
                {ticket.token}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <Button className="w-full" onClick={handleDownload}>
          Unduh Tiket (Print)
        </Button>
      </div>
    </div>
  )
}
