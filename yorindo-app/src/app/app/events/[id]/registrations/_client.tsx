'use client'

import { use, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { Flag, X } from 'lucide-react'
import Link from 'next/link'
import type { Registration, RegistrationWithContact } from '@/types/api'

interface RegistrationsPageProps {
  params: Promise<{ id: string }>
}

const STATUS_TABS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Disetujui' },
  { value: 'rejected', label: 'Ditolak' },
  { value: 'waitlisted', label: 'Waitlist' },
  { value: 'attended', label: 'Hadir' },
]

const STATUS_BADGE: Record<Registration['status'], string> = {
  pending: 'bg-orange-100 text-orange-700',
  confirmed: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-destructive/10 text-destructive',
  waitlisted: 'bg-muted text-muted-foreground',
  attended: 'bg-purple-100 text-purple-700',
  cancelled: 'bg-muted text-muted-foreground',
}

function scoreBadgeClass(score: number) {
  if (score >= 70) return 'bg-green-100 text-green-700'
  if (score >= 40) return 'bg-yellow-100 text-yellow-700'
  return 'bg-red-100 text-red-700'
}

export default function RegistrationsPage({ params }: RegistrationsPageProps) {
  const { id } = use(params)
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('pending')
  const [detailReg, setDetailReg] = useState<RegistrationWithContact | null>(null)

  const { data, isLoading } = useQuery<{ data: RegistrationWithContact[]; pagination: { total: number } }>({
    queryKey: ['event-registrations', id, activeTab],
    queryFn: () =>
      fetch(`/api/events/${id}/registrations?status=${activeTab}&pageSize=50`).then((r) => r.json()),
  })

  const statusMutation = useMutation({
    mutationFn: async ({ regId, status, notes }: { regId: string; status: Registration['status']; notes?: string }) => {
      const res = await fetch(`/api/registrations/${regId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes }),
      })
      if (!res.ok) throw new Error('Gagal memperbarui status')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-registrations', id] })
      toast.success('Status registrasi diperbarui')
    },
    onError: () => toast.error('Gagal memperbarui status'),
  })

  const clearFlagMutation = useMutation({
    mutationFn: async (regId: string) => {
      const res = await fetch(`/api/registrations/${regId}/clear-flag`, { method: 'POST' })
      if (!res.ok) throw new Error('Gagal menghapus flag')
      return res.json() as Promise<RegistrationWithContact>
    },
    onMutate: async (regId) => {
      await queryClient.cancelQueries({ queryKey: ['event-registrations', id, activeTab] })
      const previous = queryClient.getQueryData(['event-registrations', id, activeTab])
      queryClient.setQueryData(
        ['event-registrations', id, activeTab],
        (old: { data: RegistrationWithContact[]; pagination: { total: number } } | undefined) => ({
          ...old,
          data: (old?.data ?? []).map((r) => r.id === regId ? { ...r, flagOverride: true } : r),
        })
      )
      return { previous }
    },
    onError: (_err, _regId, context) => {
      queryClient.setQueryData(['event-registrations', id, activeTab], context?.previous)
      toast.error('Gagal menghapus flag')
    },
  })

  const sortedData = activeTab === 'pending'
    ? [...(data?.data ?? [])].sort((a, b) => b.aiScore - a.aiScore)
    : (data?.data ?? [])

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/app/events/${id}`} className="text-muted-foreground hover:text-foreground text-sm">
          ← Kembali ke Event
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-6">Manajemen Registrasi</h1>

      {/* Status tabs */}
      <div className="flex gap-1 mb-4 border-b">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.value
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Registration detail sheet */}
      <Sheet open={!!detailReg} onOpenChange={(v) => !v && setDetailReg(null)}>
        <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detail Registrasi</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 mt-4 text-sm">
            <div><span className="text-muted-foreground">Nama: </span><span className="font-medium">{detailReg?.contactName}</span></div>
            <div><span className="text-muted-foreground">Email: </span>{detailReg?.contactEmail}</div>
            <div><span className="text-muted-foreground">Telepon: </span>{detailReg?.contactPhone}</div>
            <div>
              <span className="text-muted-foreground">Skor AI: </span>
              {detailReg && (
                <Badge className={`${scoreBadgeClass(detailReg.aiScore)} text-xs ml-1`}>{detailReg.aiScore}</Badge>
              )}
            </div>
            <div className="border-t pt-3">
              <div><span className="text-muted-foreground">ID: </span><span className="font-mono text-xs">{detailReg?.id}</span></div>
              <div className="mt-2">
                <span className="text-muted-foreground">Status: </span>
                {detailReg && <Badge className={STATUS_BADGE[detailReg.status]}>{detailReg.status}</Badge>}
              </div>
              <div className="mt-2">
                <span className="text-muted-foreground">Terdaftar: </span>
                {detailReg && new Date(detailReg.createdAt).toLocaleString('id-ID')}
              </div>
              {detailReg?.attendedAt && (
                <div className="mt-2"><span className="text-muted-foreground">Hadir: </span>{new Date(detailReg.attendedAt).toLocaleString('id-ID')}</div>
              )}
            </div>
            {Object.keys(detailReg?.surveyAnswers ?? {}).length > 0 && (
              <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground uppercase font-medium mb-2">Jawaban Survey</p>
                {Object.entries(detailReg?.surveyAnswers ?? {}).map(([key, value]) => (
                  <div key={key}><span className="text-muted-foreground capitalize">{key}: </span>{String(value)}</div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden md:table-cell w-10">#</TableHead>
                <TableHead>Peserta</TableHead>
                <TableHead className="w-16">Skor AI</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Terdaftar</TableHead>
                {activeTab === 'waitlisted' && <TableHead className="hidden md:table-cell w-16">Posisi</TableHead>}
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!sortedData.length ? (
                <TableRow>
                  <TableCell colSpan={activeTab === 'waitlisted' ? 7 : 6} className="text-center text-muted-foreground py-8">
                    Tidak ada registrasi dengan status {activeTab}
                  </TableCell>
                </TableRow>
              ) : (
                sortedData.map((reg, idx) => (
                  <TableRow key={reg.id} className="cursor-pointer" onClick={() => setDetailReg(reg)}>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-xs" onClick={(e) => e.stopPropagation()}>{idx + 1}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">{reg.contactName}</span>
                        <span className="text-xs text-muted-foreground">{reg.contactEmail}</span>
                        {(reg.contactFlagCategory === 'spam' || reg.contactFlagCategory === 'not-potential') && !reg.flagOverride && (
                          <button
                            onClick={(e) => { e.stopPropagation(); clearFlagMutation.mutate(reg.id) }}
                            title="Klik untuk hapus flag"
                            className="self-start mt-0.5"
                          >
                            <Badge className="bg-orange-100 text-orange-700 text-xs gap-1 cursor-pointer hover:bg-orange-200">
                              <Flag className="h-3 w-3" />
                              {reg.contactFlagCategory}
                              <X className="h-3 w-3" />
                            </Badge>
                          </button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Badge className={`${scoreBadgeClass(reg.aiScore)} text-xs`}>{reg.aiScore}</Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Badge className={STATUS_BADGE[reg.status]}>{reg.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-xs" onClick={(e) => e.stopPropagation()}>
                      {new Date(reg.createdAt).toLocaleDateString('id-ID')}
                    </TableCell>
                    {activeTab === 'waitlisted' && (
                      <TableCell className="hidden md:table-cell text-muted-foreground" onClick={(e) => e.stopPropagation()}>#{idx + 1}</TableCell>
                    )}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        {activeTab === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => statusMutation.mutate({ regId: reg.id, status: 'approved' })}
                              disabled={statusMutation.isPending}
                            >
                              Setuju
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-destructive"
                              onClick={() => statusMutation.mutate({ regId: reg.id, status: 'rejected' })}
                              disabled={statusMutation.isPending}
                            >
                              Tolak
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => statusMutation.mutate({ regId: reg.id, status: 'waitlisted' })}
                              disabled={statusMutation.isPending}
                            >
                              Waitlist
                            </Button>
                          </>
                        )}
                        {activeTab === 'rejected' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => statusMutation.mutate({ regId: reg.id, status: 'pending' })}
                            disabled={statusMutation.isPending}
                          >
                            Re-queue
                          </Button>
                        )}
                        {activeTab === 'waitlisted' && (
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => statusMutation.mutate({ regId: reg.id, status: 'approved' })}
                            disabled={statusMutation.isPending}
                          >
                            Promosikan
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
