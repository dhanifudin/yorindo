'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'
import { FlaggedRecordsTable, type FlaggedRecord } from '@/components/features/contacts/FlaggedRecordsTable'

export default function FlaggedRecordsPage() {
  const [statusFilter, setStatusFilter] = useState('pending')

  const { data, isLoading } = useQuery<{ data: FlaggedRecord[]; pagination: { total: number } }>({
    queryKey: ['contacts-flagged', statusFilter],
    queryFn: () =>
      fetch(`/api/contacts/flagged?status=${statusFilter}&pageSize=50`).then((r) => r.json()),
  })

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app/contacts" className="text-muted-foreground hover:text-foreground text-sm">
          ← Kembali ke Kontak
        </Link>
      </div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Record Bermasalah</h1>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
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
          {!data?.data.length && (
            <p className="text-muted-foreground text-center py-12">
              Tidak ada record dengan status {statusFilter}
            </p>
          )}
          {data?.data && data.data.length > 0 && (
            <FlaggedRecordsTable records={data.data} />
          )}
        </>
      )}
    </div>
  )
}
