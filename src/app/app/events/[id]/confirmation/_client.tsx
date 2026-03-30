'use client'

import { use } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmationStats } from '@/components/konfirmasi/ConfirmationStats'
import { ConfirmationTable, type ConfirmationRegistration } from '@/components/konfirmasi/ConfirmationTable'

interface ConfirmationPageProps {
  params: Promise<{ id: string }>
}

interface ConfirmationData {
  stats: {
    ticketSent: number
    pendingConfirmation: number
    waitlisted: number
  }
  registrations: ConfirmationRegistration[]
}

export default function ConfirmationPage({ params }: ConfirmationPageProps) {
  const { id } = use(params)

  const { data, isLoading, refetch } = useQuery<ConfirmationData>({
    queryKey: ['event', id, 'confirmation'],
    queryFn: () => fetch(`/api/events/${id}/confirmation`).then((r) => r.json()),
    staleTime: 30_000,
  })

  const resendMutation = useMutation({
    mutationFn: async (regId: string) => {
      const res = await fetch(`/api/registrations/${regId}/resend-ticket`, { method: 'POST' })
      if (!res.ok) throw new Error('Gagal mengirim ulang tiket')
      return res.json()
    },
    onSuccess: () => toast.success('Tiket dikirim ulang', { duration: 4000 }),
    onError: () => toast.error('Gagal mengirim ulang tiket'),
  })

  const promoteMutation = useMutation({
    mutationFn: async (regId: string) => {
      const res = await fetch(`/api/registrations/${regId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      })
      if (!res.ok) throw new Error('Gagal promosi')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Peserta dipromosikan ke approved', { duration: 4000 })
      refetch()
    },
    onError: () => toast.error('Gagal promosi peserta'),
  })

  return (
    <div className="space-y-4">
      <ConfirmationStats
        ticketSent={data?.stats.ticketSent ?? 0}
        pendingConfirmation={data?.stats.pendingConfirmation ?? 0}
        waitlisted={data?.stats.waitlisted ?? 0}
        isLoading={isLoading}
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Daftar Peserta</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : (
            <ConfirmationTable
              registrations={data?.registrations ?? []}
              onResend={(regId) => resendMutation.mutate(regId)}
              onPromote={(regId) => promoteMutation.mutate(regId)}
              isPending={resendMutation.isPending || promoteMutation.isPending}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
