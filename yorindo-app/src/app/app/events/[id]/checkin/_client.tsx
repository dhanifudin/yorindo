'use client'

import { use, useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Search, CheckCircle, Clock, Users, QrCode, UserCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TablePagination } from '@/components/ui/table-pagination'
import type { RegistrationWithContact } from '@/types/api'

const PAGE_SIZE = 20

interface CheckinAdminViewProps {
  params: Promise<{ id: string }>
}

interface CheckinStats {
  approved: number
  attended: number
  total: number
}

export function CheckinAdminView({ params }: CheckinAdminViewProps) {
  const { id } = use(params)
  const queryClient = useQueryClient()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [tab, setTab] = useState<'pending' | 'attended'>('pending')

  const { data: stats, isLoading: statsLoading } = useQuery<CheckinStats>({
    queryKey: ['checkin-stats', id],
    queryFn: () => fetch(`/api/events/${id}/checkin/stats`).then((r) => r.json()),
    refetchInterval: 15_000,
  })

  const { data: approvedData, isLoading: approvedLoading } = useQuery<{ data: RegistrationWithContact[] }>({
    queryKey: ['event-registrations', id, 'approved'],
    queryFn: () =>
      fetch(`/api/registrations?eventId=${id}&status=approved&pageSize=500`).then((r) => r.json()),
    staleTime: 30_000,
  })

  const { data: attendedData, isLoading: attendedLoading } = useQuery<{ data: RegistrationWithContact[] }>({
    queryKey: ['event-registrations', id, 'attended'],
    queryFn: () =>
      fetch(`/api/registrations?eventId=${id}&status=attended&pageSize=500`).then((r) => r.json()),
    staleTime: 30_000,
    refetchInterval: 15_000,
  })

  const checkinMutation = useMutation({
    mutationFn: async (regId: string) => {
      const res = await fetch(`/api/registrations/${regId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'attended' }),
      })
      if (!res.ok) throw new Error('Gagal check-in')
      return res.json() as Promise<RegistrationWithContact>
    },
    onSuccess: (updated) => {
      toast.success(`${updated.contactName} berhasil check-in`)
      queryClient.invalidateQueries({ queryKey: ['event-registrations', id, 'approved'] })
      queryClient.invalidateQueries({ queryKey: ['event-registrations', id, 'attended'] })
      queryClient.invalidateQueries({ queryKey: ['checkin-stats', id] })
    },
    onError: () => toast.error('Gagal melakukan check-in'),
  })

  // Combine and filter data based on active tab
  const allApproved = approvedData?.data ?? []
  const allAttended = attendedData?.data ?? []

  const filteredList = useMemo(() => {
    const list = tab === 'pending' ? allApproved : allAttended
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(
      (r) =>
        r.contactName.toLowerCase().includes(q) ||
        r.contactPhone?.toLowerCase().includes(q) ||
        r.contactEmail?.toLowerCase().includes(q) ||
        r.ticketToken?.toLowerCase().includes(q)
    )
  }, [search, tab, allApproved, allAttended])

  const pagedItems = filteredList.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const isLoading = statsLoading || approvedLoading || attendedLoading

  const checkedInPct = stats
    ? stats.total > 0
      ? Math.round((stats.attended / stats.total) * 100)
      : 0
    : 0

  return (
    <div className="space-y-4">
      {/* Scanner shortcut + Stats bar */}
      <div className="flex items-start justify-between gap-4">
        <div className="grid grid-cols-3 gap-3 flex-1">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                {statsLoading ? (
                  <Skeleton className="h-7 w-12" />
                ) : (
                  <p className="text-2xl font-bold text-green-700">{stats?.attended ?? 0}</p>
                )}
                <p className="text-xs text-muted-foreground">Hadir</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-full bg-orange-100 p-2">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                {statsLoading ? (
                  <Skeleton className="h-7 w-12" />
                ) : (
                  <p className="text-2xl font-bold text-orange-700">{stats?.approved ?? 0}</p>
                )}
                <p className="text-xs text-muted-foreground">Belum hadir</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                {statsLoading ? (
                  <Skeleton className="h-7 w-12" />
                ) : (
                  <p className="text-2xl font-bold">{checkedInPct}%</p>
                )}
                <p className="text-xs text-muted-foreground">Kehadiran</p>
              </div>
            </CardContent>
          </Card>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/app/scan?eventId=${id}`)}
          className="gap-2 shrink-0"
        >
          <QrCode className="h-4 w-4" />
          Scanner
        </Button>
      </div>

      {/* Progress bar */}
      {!statsLoading && stats && stats.total > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{stats.attended} hadir</span>
            <span>{stats.total} total peserta disetujui</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${checkedInPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Tabs + Search */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            {/* Tabs */}
            <div className="flex gap-1">
              <Button
                variant={tab === 'pending' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => { setTab('pending'); setPage(0); setSearch('') }}
              >
                <Clock className="h-3.5 w-3.5" />
                Belum Hadir ({allApproved.length})
              </Button>
              <Button
                variant={tab === 'attended' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => { setTab('attended'); setPage(0); setSearch('') }}
              >
                <UserCheck className="h-3.5 w-3.5" />
                Sudah Hadir ({allAttended.length})
              </Button>
            </div>

            <div className="flex-1 sm:max-w-sm sm:ml-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9 h-8 text-sm"
                  placeholder="Cari nama, telepon, email, atau tiket..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0) }}
                />
              </div>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : pagedItems.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {search.trim()
                ? 'Tidak ada peserta ditemukan'
                : tab === 'pending'
                  ? 'Semua peserta sudah check-in'
                  : 'Belum ada peserta yang check-in'}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Peserta</TableHead>
                    <TableHead>Telepon</TableHead>
                    {tab === 'attended' && <TableHead>Waktu Check-in</TableHead>}
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedItems.map((reg) => (
                    <TableRow key={reg.id}>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{reg.contactName}</p>
                          <p className="text-xs text-muted-foreground">{reg.contactEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {reg.contactPhone || '—'}
                      </TableCell>
                      {tab === 'attended' && (
                        <TableCell className="text-xs text-muted-foreground">
                          {reg.attendedAt
                            ? new Intl.DateTimeFormat('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              }).format(new Date(reg.attendedAt))
                            : '—'}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        {tab === 'pending' ? (
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => checkinMutation.mutate(reg.id)}
                            disabled={checkinMutation.isPending}
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1" />
                            Check-in
                          </Button>
                        ) : (
                          <Badge className="bg-green-100 text-green-700 text-xs">Hadir</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                page={page}
                pageSize={PAGE_SIZE}
                total={filteredList.length}
                onPrev={() => setPage((p) => Math.max(0, p - 1))}
                onNext={() => setPage((p) => p + 1)}
                onPageChange={(p) => setPage(p)}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

