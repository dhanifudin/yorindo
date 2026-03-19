'use client'

import { use, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import Link from 'next/link'
import type { Registration } from '@/types/api'

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

export default function RegistrationsPage({ params }: RegistrationsPageProps) {
  const { id } = use(params)
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('pending')

  const { data, isLoading } = useQuery<{ data: Registration[]; pagination: { total: number } }>({
    queryKey: ['event-registrations', id, activeTab],
    queryFn: () =>
      fetch(`/api/events/${id}/registrations?status=${activeTab}&pageSize=50`).then((r) => r.json()),
  })

  const statusMutation = useMutation({
    mutationFn: async ({ regId, status, notes }: { regId: string; status: Registration['status']; notes?: string }) => {
      const res = await fetch(`/api/registrations/${regId}/status`, {
        method: 'PATCH',
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

  const [registrations, setRegistrations] = useState<Registration[]>([])

  // Merge mock data with real data
  const displayData = data?.data ?? registrations

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/admin/events/${id}`} className="text-muted-foreground hover:text-foreground text-sm">
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
                <TableHead>#</TableHead>
                <TableHead>ID Registrasi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Terdaftar</TableHead>
                {activeTab === 'waitlisted' && <TableHead>Posisi</TableHead>}
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!displayData.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Tidak ada registrasi dengan status {activeTab}
                  </TableCell>
                </TableRow>
              ) : (
                displayData.map((reg, idx) => (
                  <TableRow key={reg.id}>
                    <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                    <TableCell className="font-mono text-xs">{reg.id}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_BADGE[reg.status]}>{reg.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(reg.createdAt).toLocaleDateString('id-ID')}
                    </TableCell>
                    {activeTab === 'waitlisted' && (
                      <TableCell className="text-muted-foreground">#{idx + 1}</TableCell>
                    )}
                    <TableCell>
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
