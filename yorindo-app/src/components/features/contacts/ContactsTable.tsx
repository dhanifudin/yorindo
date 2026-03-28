'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type RowSelectionState,
} from '@tanstack/react-table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { useContacts, useRecommendedEvents } from '@/hooks/useContacts'
import { useFilterStore } from '@/store/filterStore'
import type { Contact, FlagCategory, ContactHistoryItem, ContactHistoryResponse } from '@/types/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

const FLAG_LABELS: Record<NonNullable<FlagCategory>, { label: string; className: string }> = {
  'invalid-data': { label: 'Data Invalid', className: 'bg-yellow-100 text-yellow-700' },
  duplicate: { label: 'Duplikat', className: 'bg-muted text-muted-foreground' },
}

const STATUS_BADGE: Record<ContactHistoryItem['status'], string> = {
  approved: 'bg-green-100 text-green-700',
  attended: 'bg-primary/10 text-primary',
  cancelled: 'bg-destructive/10 text-destructive',
  pending: 'bg-muted text-muted-foreground',
  rejected: 'bg-destructive/10 text-destructive',
  confirmed: 'bg-blue-100 text-blue-700',
  waitlisted: 'bg-orange-100 text-orange-700',
}

const STATUS_LABELS: Record<ContactHistoryItem['status'], string> = {
  approved: 'Disetujui',
  attended: 'Hadir',
  cancelled: 'Dibatalkan',
  pending: 'Menunggu',
  rejected: 'Ditolak',
  confirmed: 'Dikonfirmasi',
  waitlisted: 'Antrian',
}

const SKELETON_ROWS = 8

const FLAG_FILTER_OPTIONS = [
  { value: '', label: 'Semua' },
  { value: 'flagged', label: 'Ditandai' },
  { value: 'unflagged', label: 'Tidak Ditandai' },
] as const

interface ContactsTableProps {
  onSelectionChange: (ids: string[]) => void
  onToggleSelectMode: () => void
  selectMode: boolean
  selectedIds: string[]
}

export function ContactsTable({ onSelectionChange, onToggleSelectMode, selectMode, selectedIds }: ContactsTableProps) {
  const searchParams = useSearchParams()
  const { flagFilter, setFilter } = useFilterStore()
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const { data, isLoading, isError } = useContacts()
  const [detailContact, setDetailContact] = useState<Contact | null>(null)
  const [eventsExpanded, setEventsExpanded] = useState(false)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const queryClient = useQueryClient()

  const { data: recommendedEventsData, isLoading: eventsLoading } = useRecommendedEvents(
    detailContact?.id,
    eventsExpanded,
  )

  // History tab data
  const { data: historyData, isLoading: historyLoading } = useQuery<ContactHistoryResponse>({
    queryKey: ['contact-history', detailContact?.id],
    queryFn: () =>
      fetch(`/api/contacts/${detailContact!.id}/history`).then((r) => r.json()),
    enabled: !!detailContact,
  })

  const flagMutation = useMutation({
    mutationFn: async ({ id, flagCategory }: { id: string; flagCategory: FlagCategory }) => {
      const res = await fetch(`/api/contacts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flagCategory }),
      })
      if (!res.ok) throw new Error('Flag gagal')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      toast.success('Kontak berhasil ditandai')
    },
    onError: () => toast.error('Gagal menandai kontak'),
  })

  const columns: ColumnDef<Contact>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          aria-label="Pilih semua"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          onClick={(e) => e.stopPropagation()}
          aria-label="Pilih baris"
        />
      ),
      size: 40,
    },
    {
      accessorKey: 'name',
      header: 'Nama',
      cell: ({ row }) => {
        const contact = row.original
        return (
          <div className="flex items-center gap-2">
            <span>{contact.name}</span>
            {contact.flagCategory && (
              <Badge className={FLAG_LABELS[contact.flagCategory].className + ' text-[10px] px-1.5 py-0'}>
                {FLAG_LABELS[contact.flagCategory].label}
              </Badge>
            )}
          </div>
        )
      },
    },
    { accessorKey: 'phone', header: 'Telepon' },
    { accessorKey: 'industryId', header: 'Industri' },
    { accessorKey: 'city', header: 'Kota' },
    {
      accessorKey: 'completenessScore',
      header: 'Kelengkapan',
      cell: ({ getValue }) => `${Math.round((getValue() as number) * 100)}%`,
    },
  ]

  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    pageCount: data?.pagination.totalPages ?? -1,
    state: {
      pagination: { pageIndex: page - 1, pageSize: 20 },
      rowSelection,
    },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    manualPagination: true,
    manualFiltering: true,
  })

  // Derive stable selectedIds — useMemo with [rowSelection] avoids array reference churn
  const derivedSelectedIds = useMemo(
    () => table.getSelectedRowModel().rows.map((r) => r.original.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rowSelection],
  )

  useEffect(() => {
    onSelectionChange(derivedSelectedIds)
  }, [derivedSelectedIds, onSelectionChange])

  if (isError) {
    return (
      <p className="text-center py-8 text-destructive">
        Gagal memuat data kontak. Silakan coba lagi.
      </p>
    )
  }

  return (
    <>
      {/* Contact detail sheet */}
      <Sheet
        open={!!detailContact}
        onOpenChange={(v) => {
          if (!v) {
            setDetailContact(null)
            setEventsExpanded(false)
          }
        }}
      >
        <SheetContent side="right" className="flex flex-col sm:max-w-lg w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{detailContact?.name}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 px-4 overflow-y-auto">
          <Tabs defaultValue="info" className="mt-0">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">Info</TabsTrigger>
              <TabsTrigger value="riwayat">Riwayat</TabsTrigger>
              <TabsTrigger value="segmen">Segmen</TabsTrigger>
            </TabsList>

            {/* Info tab */}
            <TabsContent value="info" className="mt-4">
              <div className="space-y-3 text-sm">
                <div><span className="text-muted-foreground">Email: </span>{detailContact?.email || '—'}</div>
                <div><span className="text-muted-foreground">Telepon: </span>{detailContact?.phone}</div>
                <div><span className="text-muted-foreground">Industri: </span>{detailContact?.industryId}</div>
                <div><span className="text-muted-foreground">Kota: </span>{detailContact?.city}</div>
                <div><span className="text-muted-foreground">Ukuran Perusahaan: </span>{detailContact?.companySize}</div>
                <div>
                  <span className="text-muted-foreground">Kelengkapan: </span>
                  {detailContact && `${Math.round(detailContact.completenessScore * 100)}%`}
                </div>
                <div>
                  <span className="text-muted-foreground">Dibuat: </span>
                  {detailContact && new Date(detailContact.createdAt).toLocaleDateString('id-ID')}
                </div>
                {detailContact?.flagCategory && (
                  <div>
                    <span className="text-muted-foreground">Status: </span>
                    <Badge className={FLAG_LABELS[detailContact.flagCategory].className}>
                      {FLAG_LABELS[detailContact.flagCategory].label}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Flag actions */}
              <Separator className="my-4" />
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Tandai sebagai:</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(FLAG_LABELS) as NonNullable<FlagCategory>[]).map((cat) => (
                    <Button
                      key={cat}
                      variant="outline"
                      size="sm"
                      disabled={detailContact?.flagCategory === cat || flagMutation.isPending}
                      onClick={() => {
                        if (detailContact) {
                          flagMutation.mutate({ id: detailContact.id, flagCategory: cat })
                          setDetailContact({ ...detailContact, flagCategory: cat })
                        }
                      }}
                    >
                      {FLAG_LABELS[cat].label}
                    </Button>
                  ))}
                  {detailContact?.flagCategory && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={flagMutation.isPending}
                      onClick={() => {
                        if (detailContact) {
                          flagMutation.mutate({ id: detailContact.id, flagCategory: null })
                          setDetailContact({ ...detailContact, flagCategory: null })
                        }
                      }}
                    >
                      Hapus Tanda
                    </Button>
                  )}
                </div>
              </div>

              {/* Suggested Events section */}
              <Separator className="my-4" />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground font-medium">Event yang Disarankan</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto py-0.5 px-2 text-xs"
                    onClick={() => setEventsExpanded((v) => !v)}
                  >
                    {eventsExpanded ? 'Tutup' : 'Lihat'}
                  </Button>
                </div>
                {eventsExpanded && (
                  eventsLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-10 bg-muted rounded animate-pulse" />
                      ))}
                    </div>
                  ) : (recommendedEventsData?.recommendations ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">Tidak ada event yang cocok.</p>
                  ) : (
                    <div className="space-y-2">
                      {(recommendedEventsData?.recommendations ?? []).map((rec) => (
                        <div key={rec.eventId} className="rounded-md border p-2 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{rec.name}</span>
                            <Badge className={
                              rec.score >= 70 ? 'bg-green-100 text-green-700 text-[10px]' :
                              rec.score >= 40 ? 'bg-yellow-100 text-yellow-700 text-[10px]' :
                              'bg-red-100 text-red-700 text-[10px]'
                            }>
                              {rec.score}%
                            </Badge>
                          </div>
                          <p className="text-muted-foreground mt-0.5">
                            {new Date(rec.eventDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {' · '}{rec.status}
                          </p>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            </TabsContent>

            {/* Riwayat tab */}
            <TabsContent value="riwayat" className="mt-4">
              {historyLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : !historyData?.registrations.length ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Belum ada riwayat event
                </p>
              ) : (
                <div className="space-y-2">
                  {historyData.registrations.map((r) => (
                    <div
                      key={r.eventId}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium">{r.eventName}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(r.eventDate).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <Badge className={STATUS_BADGE[r.status]}>
                        {STATUS_LABELS[r.status]}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Segmen tab */}
            <TabsContent value="segmen" className="mt-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Industri</p>
                  <p className="mt-0.5">{detailContact?.industryId || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Kota</p>
                  <p className="mt-0.5">{detailContact?.city || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Ukuran Perusahaan</p>
                  <p className="mt-0.5">{detailContact?.companySize || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Kelengkapan</p>
                  <p className="mt-0.5 font-medium">
                    {detailContact ? `${Math.round(detailContact.completenessScore * 100)}%` : '—'}
                  </p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Status Tanda</p>
                {detailContact?.flagCategory ? (
                  <Badge className={FLAG_LABELS[detailContact.flagCategory].className}>
                    {FLAG_LABELS[detailContact.flagCategory].label}
                  </Badge>
                ) : (
                  <p className="text-muted-foreground">Tidak ada tanda</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
          </div>
        </SheetContent>
      </Sheet>

      {/* Flag filter */}
      <div className="flex gap-2 mb-3">
        {FLAG_FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setFilter({ flagFilter: opt.value as typeof flagFilter })}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              flagFilter === opt.value
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Mobile section */}
      <div className="md:hidden">
        {/* Mobile sticky select bar */}
        <div className="sticky top-0 z-10 bg-background border-b py-2 flex items-center justify-between mb-2">
          <button
            type="button"
            className="text-sm font-medium text-primary"
            onClick={onToggleSelectMode}
          >
            {selectMode ? 'Batal Pilih' : 'Pilih'}
          </button>
          {selectMode && selectedIds.length > 0 && (
            <span className="text-sm text-muted-foreground">{selectedIds.length} dipilih</span>
          )}
          {selectMode && (
            <button
              type="button"
              className="text-sm font-medium"
              onClick={() => table.toggleAllPageRowsSelected(true)}
            >
              Pilih Semua
            </button>
          )}
        </div>

        {/* Mobile cards */}
        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: SKELETON_ROWS }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-3">
                <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
                <div className="h-3 bg-muted rounded animate-pulse w-1/2 mt-2" />
              </div>
            ))
          ) : table.getRowModel().rows.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Tidak ada data kontak.</p>
          ) : (
            table.getRowModel().rows.map((row) => {
              const contact = row.original
              return (
                <div
                  key={contact.id}
                  className={`rounded-lg border border-border bg-card p-3 cursor-pointer active:bg-muted/50 flex items-center gap-2 ${
                    row.getIsSelected() ? 'bg-muted/30' : ''
                  }`}
                  onClick={() => {
                    if (selectMode) {
                      row.toggleSelected()
                    } else {
                      setDetailContact(contact)
                    }
                  }}
                >
                  {selectMode && (
                    <Checkbox
                      checked={row.getIsSelected()}
                      onCheckedChange={(v) => row.toggleSelected(!!v)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{contact.name}</span>
                      {contact.flagCategory && (
                        <Badge className={FLAG_LABELS[contact.flagCategory].className + ' text-[10px] px-1.5 py-0'}>
                          {FLAG_LABELS[contact.flagCategory].label}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {contact.industryId && <span>{contact.industryId}</span>}
                      {contact.industryId && contact.phone && <span> · </span>}
                      {contact.phone && <span>{contact.phone}</span>}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Desktop table */}
      <div className="rounded-md border hidden md:block">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 bg-muted rounded animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                  Tidak ada data kontak.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={`cursor-pointer ${row.getIsSelected() ? 'bg-muted/30' : ''}`}
                  onClick={() => setDetailContact(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="whitespace-nowrap"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
