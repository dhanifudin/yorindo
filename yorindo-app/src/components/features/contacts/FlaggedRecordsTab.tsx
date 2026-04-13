'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FlaggedRecordsTable, type FlaggedRecord } from './FlaggedRecordsTable'

export function FlaggedRecordsTab() {
  const [statusFilter, setStatusFilter] = useState('pending')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery<{ data: FlaggedRecord[]; pagination: { total: number; page: number; pageSize: number; totalPages: number } }>({
    queryKey: ['contacts-flagged', statusFilter, page],
    queryFn: () =>
      fetch(`/api/contacts/flagged?status=${statusFilter}&page=${page}&pageSize=20`).then((r) => r.json()),
  })

  const pagination = data?.pagination
  const totalPages = pagination?.totalPages ?? 1

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Tinjau dan selesaikan kontak dengan data bermasalah
        </p>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="resolved">Disetujui</SelectItem>
            <SelectItem value="discarded">Dibuang</SelectItem>
            <SelectItem value="all">Semua</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          {(!data?.data || data.data.length === 0) && (
            <p className="text-muted-foreground text-center py-12">
              Tidak ada record dengan status {statusFilter}
            </p>
          )}
          {data?.data && data.data.length > 0 && (
            <FlaggedRecordsTable records={data.data} />
          )}
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Halaman {page} dari {totalPages}
            {pagination && <span> · {pagination.total} record</span>}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              Sebelumnya
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Berikutnya
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
