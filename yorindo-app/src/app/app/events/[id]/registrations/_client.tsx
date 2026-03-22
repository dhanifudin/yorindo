'use client'

import { use, useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type ColumnDef,
  type ColumnFiltersState,
} from '@tanstack/react-table'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Flag, ChevronLeft, ChevronRight } from 'lucide-react'
import { BulkApproveBar } from '@/components/registrasi/BulkApproveBar'
import { AiScoreBadge } from '@/components/registrasi/AiScoreBadge'
import { ContactSheet } from '@/components/registrasi/ContactSheet'
import { RegistrationFilters } from '@/components/registrasi/RegistrationFilters'
import type { Event, Registration, RegistrationWithContact } from '@/types/api'

interface RegistrationsPageProps {
  params: Promise<{ id: string }>
}

const STATUS_BADGE_CLASS: Record<Registration['status'], string> = {
  pending: 'bg-orange-100 text-orange-700',
  confirmed: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-destructive/10 text-destructive',
  waitlisted: 'bg-muted text-muted-foreground',
  attended: 'bg-purple-100 text-purple-700',
  cancelled: 'bg-muted text-muted-foreground',
}

const STATUS_LABEL: Record<Registration['status'], string> = {
  pending: 'Pending',
  confirmed: 'Terkonfirmasi',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  waitlisted: 'Waitlist',
  attended: 'Hadir',
  cancelled: 'Dibatalkan',
}

async function patchRegistrationStatus(id: string, status: Registration['status']) {
  const res = await fetch(`/api/registrations/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) throw new Error('Gagal memperbarui status')
  return res.json() as Promise<RegistrationWithContact>
}

export default function RegistrationsPage({ params }: RegistrationsPageProps) {
  const { id } = use(params)
  const queryClient = useQueryClient()
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [sheetIndex, setSheetIndex] = useState<number | null>(null)
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const tableContainerRef = useRef<HTMLDivElement>(null)

  // Read event capacity from cache (loaded by layout)
  const event = queryClient.getQueryData<Event>(['events', id])
  const capacity = event?.capacity ?? null

  const { data: rawData, isLoading } = useQuery<{ data: RegistrationWithContact[]; pagination: { total: number } }>({
    queryKey: ['event-registrations', id],
    queryFn: () =>
      fetch(`/api/registrations?eventId=${id}&pageSize=500`).then((r) => r.json()),
    staleTime: 30_000,
  })

  const allRows = rawData?.data ?? []

  // Derive quota status from current data
  const approvedCount = allRows.filter(
    (r) => r.status === 'approved' || r.status === 'confirmed'
  ).length
  const quotaFull = capacity !== null && approvedCount >= capacity

  // Mutations — defined BEFORE columns so they can be captured in closures
  const approveMutation = useMutation({
    mutationFn: (regId: string) => patchRegistrationStatus(regId, 'approved'),
    onMutate: async (regId) => {
      await queryClient.cancelQueries({ queryKey: ['event-registrations', id] })
      const previous = queryClient.getQueryData(['event-registrations', id])
      queryClient.setQueryData(
        ['event-registrations', id],
        (old: { data: RegistrationWithContact[] } | undefined) => ({
          ...old,
          data: (old?.data ?? []).map((r) =>
            r.id === regId ? { ...r, status: 'approved' as const } : r
          ),
        })
      )
      return { previous }
    },
    onError: (_err, _regId, ctx) => {
      queryClient.setQueryData(['event-registrations', id], ctx?.previous)
      toast.error('Gagal menyetujui')
    },
    onSuccess: () => toast.success('Peserta disetujui', { duration: 4000 }),
  })

  const waitlistMutation = useMutation({
    mutationFn: (regId: string) => patchRegistrationStatus(regId, 'waitlisted'),
    onMutate: async (regId) => {
      await queryClient.cancelQueries({ queryKey: ['event-registrations', id] })
      const previous = queryClient.getQueryData(['event-registrations', id])
      queryClient.setQueryData(
        ['event-registrations', id],
        (old: { data: RegistrationWithContact[] } | undefined) => ({
          ...old,
          data: (old?.data ?? []).map((r) =>
            r.id === regId ? { ...r, status: 'waitlisted' as const } : r
          ),
        })
      )
      return { previous }
    },
    onError: (_err, _regId, ctx) => {
      queryClient.setQueryData(['event-registrations', id], ctx?.previous)
      toast.error('Gagal menambah ke waitlist')
    },
    onSuccess: () => toast.success('Peserta ditambahkan ke waitlist (kuota penuh)', { duration: 4000 }),
  })

  const rejectMutation = useMutation({
    mutationFn: (regId: string) => patchRegistrationStatus(regId, 'rejected'),
    onMutate: async (regId) => {
      await queryClient.cancelQueries({ queryKey: ['event-registrations', id] })
      const previous = queryClient.getQueryData(['event-registrations', id])
      queryClient.setQueryData(
        ['event-registrations', id],
        (old: { data: RegistrationWithContact[] } | undefined) => ({
          ...old,
          data: (old?.data ?? []).map((r) =>
            r.id === regId ? { ...r, status: 'rejected' as const } : r
          ),
        })
      )
      return { previous, regId }
    },
    onSuccess: (_data, regId) => {
      toast('Ditolak', {
        action: {
          label: 'Batalkan',
          onClick: () => patchRegistrationStatus(regId, 'pending').then(() =>
            queryClient.invalidateQueries({ queryKey: ['event-registrations', id] })
          ),
        },
        duration: 2000,
      })
    },
    onError: (_err, _regId, ctx) => {
      queryClient.setQueryData(['event-registrations', id], ctx?.previous)
      toast.error('Gagal menolak')
    },
  })

  const bulkApproveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch('/api/registrations/bulk-approve', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) throw new Error('Gagal bulk approve')
      return res.json()
    },
    onSuccess: (_data, ids) => {
      queryClient.setQueryData(
        ['event-registrations', id],
        (old: { data: RegistrationWithContact[] } | undefined) => ({
          ...old,
          data: (old?.data ?? []).map((r) =>
            ids.includes(r.id) ? { ...r, status: 'approved' as const } : r
          ),
        })
      )
      toast.success(`Menyetujui ${ids.length} pendaftar`, { duration: 4000 })
      setRowSelection({})
    },
    onError: () => toast.error('Gagal bulk approve'),
  })

  // Column definitions — mutations are available via closure
  const columns = useMemo<ColumnDef<RegistrationWithContact>[]>(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
          aria-label="Pilih semua"
          className="accent-primary"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Pilih ${row.original.contactName}`}
          className="accent-primary"
        />
      ),
    },
    {
      id: 'name',
      accessorKey: 'contactName',
      header: 'Peserta',
      cell: ({ row }) => {
        const reg = row.original
        const showFlag =
          !reg.flagOverride &&
          (reg.contactFlagCategory === 'spam' || reg.contactFlagCategory === 'not-potential')
        return (
          <div className="flex flex-col gap-0.5">
            <button
              className="text-sm font-medium text-left hover:underline"
              onClick={(e) => {
                e.stopPropagation()
                // row.index is the filtered row index (position in filteredRows)
                setSheetIndex(row.index)
              }}
            >
              {reg.contactName}
            </button>
            <span className="text-xs text-muted-foreground">{reg.contactEmail}</span>
            {showFlag && (
              <span className="inline-flex items-center gap-1 text-xs text-red-700">
                <Flag className="h-3 w-3" />
                {reg.contactFlagCategory}
              </span>
            )}
          </div>
        )
      },
    },
    {
      id: 'score',
      accessorKey: 'aiScore',
      header: 'Skor AI',
      cell: ({ row }) => <AiScoreBadge score={row.original.aiScore} />,
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      filterFn: (row, _id, filterValue) => {
        if (filterValue === 'all' || !filterValue) return true
        return row.original.status === filterValue
      },
      cell: ({ row }) => (
        <Badge className={`${STATUS_BADGE_CLASS[row.original.status]} text-xs`}>
          {STATUS_LABEL[row.original.status]}
        </Badge>
      ),
    },
    {
      id: 'flag',
      accessorFn: (row) => row.contactFlagCategory && !row.flagOverride,
      header: '',
      filterFn: (row, _id, filterValue) => {
        if (!filterValue) return true
        return (
          !row.original.flagOverride &&
          (row.original.contactFlagCategory === 'spam' || row.original.contactFlagCategory === 'not-potential')
        )
      },
      cell: () => null,
    },
    {
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => {
        const reg = row.original
        if (reg.status !== 'pending') return null
        return (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              className="h-7 text-xs"
              variant={quotaFull ? 'outline' : 'default'}
              onClick={() => {
                if (quotaFull) {
                  waitlistMutation.mutate(reg.id)
                } else {
                  approveMutation.mutate(reg.id)
                }
              }}
              disabled={approveMutation.isPending || waitlistMutation.isPending}
            >
              {quotaFull ? 'Waitlist' : 'Setujui'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs text-destructive"
              onClick={() => rejectMutation.mutate(reg.id)}
              disabled={rejectMutation.isPending}
            >
              Tolak
            </Button>
          </div>
        )
      },
    },
  ], [quotaFull]) // eslint-disable-line react-hooks/exhaustive-deps

  const table = useReactTable({
    data: allRows,
    columns,
    state: { columnFilters, rowSelection, pagination },
    onColumnFiltersChange: (updater) => {
      setColumnFilters(updater)
      setPagination((p) => ({ ...p, pageIndex: 0 })) // reset to page 1 on filter change
    },
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const filteredRows = table.getFilteredRowModel().rows
  const pageRows = table.getRowModel().rows

  // sheetIndex is an absolute index into filteredRows (across all pages)
  const sheetReg = sheetIndex !== null ? filteredRows[sheetIndex]?.original ?? null : null

  // AI recommendation: all pending rows with score >= 80, sorted by score desc
  const aiRecommendedIds = useMemo(
    () =>
      allRows
        .filter((r) => r.status === 'pending' && r.aiScore >= 80)
        .sort((a, b) => b.aiScore - a.aiScore)
        .map((r) => r.id),
    [allRows]
  )

  const selectedIds = table
    .getSelectedRowModel()
    .rows.map((r) => r.original.id)

  const total = rawData?.pagination?.total ?? allRows.length

  // Quota info banner
  const quotaBannerText = capacity !== null
    ? `${approvedCount} / ${capacity} kuota terisi${quotaFull ? ' — kuota penuh, pendaftar baru akan masuk waitlist' : ''}`
    : null

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Quota status banner */}
      {quotaBannerText && (
        <div className={`rounded-md border px-4 py-2 text-sm ${
          quotaFull
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-blue-50 border-blue-200 text-blue-700'
        }`}>
          {quotaBannerText}
        </div>
      )}

      <BulkApproveBar
        aiRecommendedCount={aiRecommendedIds.length}
        aiScoringStatus="complete"
        selectedCount={selectedIds.length}
        onBulkApprove={(ids) => bulkApproveMutation.mutate(ids)}
        aiRecommendedIds={aiRecommendedIds}
        selectedIds={selectedIds}
      />

      <RegistrationFilters
        columnFilters={columnFilters}
        onColumnFiltersChange={setColumnFilters}
      />

      <Card>
        <CardContent className="p-0">
          <div ref={tableContainerRef} className="overflow-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      header.column.id === 'flag' ? null : (
                        <TableHead key={header.id} className="text-xs">
                          {typeof header.column.columnDef.header === 'function'
                            ? header.column.columnDef.header(header.getContext())
                            : header.column.columnDef.header}
                        </TableHead>
                      )
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-sm">
                      Tidak ada data sesuai filter
                    </TableCell>
                  </TableRow>
                ) : (
                  pageRows.map((row) => {
                    // row.index is the row's position in filteredRows (absolute, not page-relative)
                    const filteredIndex = filteredRows.findIndex((fr) => fr.id === row.id)
                    return (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer"
                      onClick={() => setSheetIndex(filteredIndex)}
                    >
                      {row.getVisibleCells().map((cell) =>
                        cell.column.id === 'flag' ? null : (
                          <TableCell
                            key={cell.id}
                            className="py-2"
                            onClick={cell.column.id === 'select' || cell.column.id === 'actions' ? (e) => e.stopPropagation() : undefined}
                          >
                            {typeof cell.column.columnDef.cell === 'function'
                              ? cell.column.columnDef.cell(cell.getContext())
                              : null}
                          </TableCell>
                        )
                      )}
                    </TableRow>
                  )})
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination — hidden when ≤ 20 rows */}
      {filteredRows.length > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {pagination.pageIndex * pagination.pageSize + 1}–{Math.min((pagination.pageIndex + 1) * pagination.pageSize, filteredRows.length)} dari {filteredRows.length} registrasi · halaman {pagination.pageIndex + 1}/{table.getPageCount()}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <ContactSheet
        registration={sheetReg}
        currentIndex={sheetIndex ?? 0}
        total={filteredRows.length}
        onClose={() => setSheetIndex(null)}
        onNext={() => setSheetIndex((i) => Math.min((i ?? 0) + 1, filteredRows.length - 1))}
        onPrev={() => setSheetIndex((i) => Math.max((i ?? 0) - 1, 0))}
        onApprove={(regId) => {
          approveMutation.mutate(regId)
          setSheetIndex(null)
        }}
        onReject={(regId) => {
          rejectMutation.mutate(regId)
          setSheetIndex(null)
        }}
        isPending={approveMutation.isPending || rejectMutation.isPending}
      />
    </div>
  )
}
