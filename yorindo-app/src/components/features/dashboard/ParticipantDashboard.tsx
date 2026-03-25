'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import QRCode from 'react-qr-code'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { formatIndonesianDate } from '@/lib/dateUtils'

type ParticipantRegistration = {
  id: string
  eventId: string
  eventName: string
  eventDate: string
  venue: string
  status: 'approved' | 'pending' | 'waitlisted' | 'cancelled'
  ticketToken: string
}

const STATUS_LABELS: Record<ParticipantRegistration['status'], string> = {
  approved: 'Disetujui',
  pending: 'Menunggu',
  waitlisted: 'Antrean',
  cancelled: 'Dibatalkan',
}

const STATUS_VARIANTS: Record<
  ParticipantRegistration['status'],
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  approved: 'default',
  pending: 'secondary',
  waitlisted: 'outline',
  cancelled: 'destructive',
}

function useParticipantRegistrations() {
  return useQuery<ParticipantRegistration[]>({
    queryKey: ['participant', 'registrations'],
    queryFn: () =>
      fetch('/api/participants/me/registrations').then((r) => {
        if (!r.ok) throw new Error('fetch registrations failed')
        return r.json()
      }),
  })
}

function useCancelRegistration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/registrations/${id}/cancel`, { method: 'POST' }).then((r) => {
        if (!r.ok) throw new Error('cancel failed')
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participant', 'registrations'] })
      toast.success('Pendaftaran dibatalkan.')
    },
    onError: () => {
      toast.error('Gagal membatalkan pendaftaran. Coba lagi.')
    },
  })
}

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-6 w-20 rounded-full" />
      <Skeleton className="h-8 w-24 rounded-md" />
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-3 w-32" />
      <Skeleton className="h-32 w-32 mx-auto" />
    </div>
  )
}

export function ParticipantDashboard() {
  const user = useAuthStore((s) => s.user)
  const greeting = user?.name || user?.email || 'Peserta'

  const { data, isLoading } = useParticipantRegistrations()
  const cancelMutation = useCancelRegistration()

  const [cancelTarget, setCancelTarget] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('upcoming')

  const today = new Date().toISOString().split('T')[0]

  const upcoming =
    data?.filter(
      (r) =>
        (r.status === 'approved' || r.status === 'pending' || r.status === 'waitlisted') &&
        r.eventDate.slice(0, 10) >= today
    ).sort((a, b) => a.eventDate.localeCompare(b.eventDate)) ?? []

  const tickets = data?.filter((r) => r.status === 'approved') ?? []

  const handleCancelConfirm = () => {
    if (cancelTarget) {
      cancelMutation.mutate(cancelTarget)
      setCancelTarget(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold">Hai, {greeting}!</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {formatIndonesianDate(new Date())}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="upcoming" className="flex-1">
            Mendatang
            {!isLoading && upcoming.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center size-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                {upcoming.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="tickets" className="flex-1">
            Tiket Saya
            {!isLoading && tickets.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center size-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                {tickets.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Mendatang tab */}
        <TabsContent value="upcoming" className="mt-4">
          {isLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)}
            </div>
          ) : upcoming.length === 0 ? (
            <p className="text-center text-muted-foreground py-12 text-sm">
              Tidak ada pendaftaran aktif.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {upcoming.map((reg) => (
                <div key={reg.id} className="py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-medium text-sm leading-snug">{reg.eventName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(reg.eventDate).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}{' '}
                      · {reg.venue}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={STATUS_VARIANTS[reg.status]}>
                      {STATUS_LABELS[reg.status]}
                    </Badge>
                    {reg.status === 'approved' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTab('tickets')}
                      >
                        Lihat Tiket
                      </Button>
                    )}
                    {(reg.status === 'approved' || reg.status === 'pending') && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:border-destructive"
                        onClick={() => setCancelTarget(reg.id)}
                        disabled={cancelMutation.isPending && cancelTarget === reg.id}
                      >
                        Batalkan
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tiket Saya tab */}
        <TabsContent value="tickets" className="mt-4">
          {isLoading ? (
            <div className="grid gap-4">
              {Array.from({ length: 2 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : tickets.length === 0 ? (
            <p className="text-center text-muted-foreground py-12 text-sm">
              Belum ada tiket.
            </p>
          ) : (
            <div className="grid gap-4">
              {tickets.map((reg) => (
                <div key={reg.id} className="rounded-xl border border-border p-5 space-y-4">
                  <div>
                    <p className="font-semibold">{reg.eventName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(reg.eventDate).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}{' '}
                      · {reg.venue}
                    </p>
                    <div className="mt-1">
                      <Badge variant={STATUS_VARIANTS[reg.status]}>
                        {STATUS_LABELS[reg.status]}
                      </Badge>
                    </div>
                  </div>
                  {reg.ticketToken ? (
                    <>
                      <div className="flex justify-center p-4 bg-white rounded-lg">
                        <QRCode value={reg.ticketToken} size={160} />
                      </div>
                      <p className="text-center text-[10px] text-muted-foreground font-mono break-all">
                        {reg.ticketToken}
                      </p>
                    </>
                  ) : (
                    <p className="text-center text-sm text-muted-foreground py-4">Tiket belum tersedia.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Cancellation confirmation dialog */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan Pendaftaran?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Anda akan keluar dari daftar peserta event ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Ya, Batalkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
