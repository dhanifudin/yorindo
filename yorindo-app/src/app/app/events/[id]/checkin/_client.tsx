'use client'

import { use, useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Search, CheckCircle, Clock, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { RegistrationWithContact } from '@/types/api'

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
  const [search, setSearch] = useState('')

  const { data: stats, isLoading: statsLoading } = useQuery<CheckinStats>({
    queryKey: ['checkin-stats', id],
    queryFn: () => fetch(`/api/events/${id}/checkin/stats`).then((r) => r.json()),
    refetchInterval: 15_000,
  })

  const { data: approvedData, isLoading: approvedLoading } = useQuery<{ data: RegistrationWithContact[] }>({
    queryKey: ['event-registrations', id, 'approved'],
    queryFn: () =>
      fetch(`/api/registrations?eventId=${id}&status=approved&pageSize=500`).then((r) => r.json()),
  })

  const { data: attendedData, isLoading: attendedLoading } = useQuery<{ data: RegistrationWithContact[] }>({
    queryKey: ['event-registrations', id, 'attended'],
    queryFn: () =>
      fetch(`/api/registrations?eventId=${id}&status=attended&pageSize=500`).then((r) => r.json()),
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

  const allApproved = approvedData?.data ?? []
  const recentAttended = (attendedData?.data ?? []).slice().reverse().slice(0, 20)

  const searchResults = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    return allApproved.filter(
      (r) =>
        r.contactName.toLowerCase().includes(q) ||
        r.contactPhone?.toLowerCase().includes(q) ||
        r.ticketToken?.toLowerCase().includes(q)
    )
  }, [search, allApproved])

  const isLoading = statsLoading || approvedLoading || attendedLoading

  const checkedInPct = stats
    ? stats.total > 0
      ? Math.round((stats.attended / stats.total) * 100)
      : 0
    : 0

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
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

      {/* Manual check-in search */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Check-in Manual</CardTitle>
          <p className="text-xs text-muted-foreground">Cari peserta by nama, telepon, atau kode tiket</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Cari peserta..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {search.trim() && (
            <div className="space-y-2">
              {isLoading ? (
                <Skeleton className="h-12 w-full" />
              ) : searchResults.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Tidak ada peserta ditemukan atau sudah check-in
                </p>
              ) : (
                searchResults.map((reg) => (
                  <div
                    key={reg.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{reg.contactName}</p>
                      <p className="text-xs text-muted-foreground">{reg.contactPhone}</p>
                      {reg.ticketToken && (
                        <p className="text-xs text-muted-foreground font-mono">{reg.ticketToken.slice(0, 12)}…</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => checkinMutation.mutate(reg.id)}
                      disabled={checkinMutation.isPending}
                    >
                      Check-in
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent check-ins */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Baru Hadir</CardTitle>
          <p className="text-xs text-muted-foreground">20 peserta terakhir yang check-in</p>
        </CardHeader>
        <CardContent>
          {attendedLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : recentAttended.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Belum ada peserta yang check-in
            </p>
          ) : (
            <div className="divide-y">
              {recentAttended.map((reg) => (
                <div key={reg.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">{reg.contactName}</p>
                    <p className="text-xs text-muted-foreground">{reg.contactPhone}</p>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-green-100 text-green-700 text-xs">Hadir</Badge>
                    {reg.attendedAt && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Intl.DateTimeFormat('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        }).format(new Date(reg.attendedAt))}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
