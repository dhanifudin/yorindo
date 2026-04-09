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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
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
  rowSelection: RowSelectionState
  onRowSelectionChange: (updater: RowSelectionState | ((old: RowSelectionState) => RowSelectionState)) => void
  onToggleSelectMode: () => void
  selectMode: boolean
  selectedIds: string[]
}

export function ContactsTable({
  rowSelection,
  onRowSelectionChange,
  onToggleSelectMode,
  selectMode,
  selectedIds,
}: ContactsTableProps) {
  const searchParams = useSearchParams()
  const { flagFilter, setFilter } = useFilterStore()
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const { data, isLoading, isError } = useContacts()
  const [detailContact, setDetailContact] = useState<Contact | null>(null)
  const [eventsExpanded, setEventsExpanded] = useState(false)
  const [selectedKeepId, setSelectedKeepId] = useState<string>('')
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

  type DuplicateGroup = {
    id: string
    primary: Contact
    duplicate: Contact
    matchScore: number
    matchReasons: string[]
  }

  const { data: duplicateGroups, isLoading: duplicateLoading } = useQuery<{
    data: DuplicateGroup[]
  }>({
    queryKey: ['contacts-duplicates', detailContact?.id],
    queryFn: async () => {
      const res = await fetch('/api/contacts/duplicates?pageSize=100')
      if (!res.ok) {
        throw new Error('Gagal memuat duplikat')
      }
      return res.json()
    },
    enabled: !!detailContact && detailContact.flagCategory === 'duplicate',
    placeholderData: keepPreviousData => keepPreviousData,
  })

  const duplicateGroup = useMemo(() => {
    if (!duplicateGroups?.data || !detailContact) return null
    return duplicateGroups.data.find(
      (group) =>
        group.primary.id === detailContact.id || group.duplicate.id === detailContact.id,
    ) ?? null
  }, [duplicateGroups?.data, detailContact])

  const duplicatePartner = useMemo(() => {
    if (!duplicateGroup || !detailContact) return null
    return duplicateGroup.primary.id === detailContact.id
      ? duplicateGroup.duplicate
      : duplicateGroup.primary
  }, [duplicateGroup, detailContact])

  const mergeMutation = useMutation({
    mutationFn: async ({ keepId, removeId }: { keepId: string; removeId: string }) => {
      const res = await fetch(`/api/contacts/${keepId}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mergeIntoId: keepId, removeId }),
      })
      if (!res.ok) throw new Error('Merge gagal')
      return res.json()
    },
    onSuccess: (contact: Contact) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['contacts-duplicates'] })
      setDetailContact(contact)
      toast.success('Duplikat berhasil digabungkan')
    },
    onError: () => toast.error('Gagal menggabungkan duplikat'),
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

  const resolveDuplicatesMutation = useMutation({
    mutationFn: async ({ keepId, deleteIds }: { keepId: string; deleteIds: string[] }) => {
      const res = await fetch('/api/contacts/resolve-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keepId, deleteIds }),
      })
      if (!res.ok) throw new Error('Resolve duplikat gagal')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      setDetailContact(null)
      toast.success('Duplikat berhasil diselesaikan')
    },
    onError: () => toast.error('Gagal menyelesaikan duplikat'),
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
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ getValue }) => {
        const email = getValue() as string | null | undefined
        return <span className="text-muted-foreground">{email || '—'}</span>
      },
    },
    { accessorKey: 'serviceType', header: 'Industri' },
    {
      accessorKey: 'jobTitle',
      header: 'Jabatan',
      cell: ({ getValue }) => {
        const val = getValue() as string | null | undefined
        return <span className="text-muted-foreground">{val || '—'}</span>
      },
    },
    { accessorKey: 'city', header: 'Kota' },
    {
      accessorKey: 'completenessScore',
      header: 'Kelengkapan',
      cell: ({ getValue }) => `${Math.round((getValue() as number) * 100)}%`,
    },
  ]

  const handleResolveDuplicates = () => {
    if (!selectedKeepId || !detailContact || !duplicateGroups?.data) return
    const allDuplicates = [detailContact, ...(duplicateGroups.data.find(
      (g) => g.primary.id === detailContact.id || g.duplicate.id === detailContact.id,
    )?.primary.id === detailContact.id 
      ? [duplicateGroups.data.find((g) => g.primary.id === detailContact.id)?.duplicate] 
      : [duplicateGroups.data.find((g) => g.duplicate.id === detailContact.id)?.primary]
    ).filter(Boolean) as Contact[]]
    
    const deleteIds = allDuplicates.map((d) => d.id).filter(id => id !== selectedKeepId)
    resolveDuplicatesMutation.mutate({ keepId: selectedKeepId, deleteIds })
  }

  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    pageCount: data?.pagination.totalPages ?? -1,
    state: {
      pagination: { pageIndex: page - 1, pageSize: 20 },
      rowSelection,
    },
    onRowSelectionChange,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    manualPagination: true,
    manualFiltering: true,
  })

  // Set selectedKeepId when detailContact changes
  useEffect(() => {
    setSelectedKeepId(detailContact?.id || '')
  }, [detailContact])

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
                  <div><span className="text-muted-foreground">Industri: </span>{detailContact?.serviceType || '—'}</div>
                  <div><span className="text-muted-foreground">Jabatan: </span>{detailContact?.jobTitle || '—'}</div>
                  <div><span className="text-muted-foreground">Kota: </span>{detailContact?.city || '—'}</div>
                  <div><span className="text-muted-foreground">Perusahaan: </span>{detailContact?.company || '—'}</div>
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

                {/* Duplicate resolution */}
                {detailContact?.flagCategory === 'duplicate' && (
                  <>
                    <Separator className="my-4" />
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Selesaikan Duplikat</p>
                      <p className="text-xs">Kontak ini ditandai sebagai duplikat. Pilih kontak yang ingin disimpan. Kontak lainnya akan dihapus.</p>
                      {duplicateLoading ? (
                        <div className="space-y-2">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-8" />
                          ))}
                        </div>
                      ) : duplicateGroup ? (
                        <>
                          <p className="text-xs text-muted-foreground">Alasan duplikat: Data serupa ditemukan</p>
                          <RadioGroup value={selectedKeepId} onValueChange={setSelectedKeepId}>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value={detailContact.id} id={`keep-${detailContact.id}`} />
                              <Label htmlFor={`keep-${detailContact.id}`} className="text-xs cursor-pointer">
                                <p className="font-medium">{detailContact.name}</p>
                                <p className="text-muted-foreground">{detailContact.phone || '—'} · {detailContact.email || '—'}</p>
                              </Label>
                            </div>
                            {duplicatePartner && (
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value={duplicatePartner.id} id={`keep-${duplicatePartner.id}`} />
                                <Label htmlFor={`keep-${duplicatePartner.id}`} className="text-xs cursor-pointer">
                                  <p className="font-medium">{duplicatePartner.name}</p>
                                  <p className="text-muted-foreground">{duplicatePartner.phone || '—'} · {duplicatePartner.email || '—'}</p>
                                </Label>
                              </div>
                            )}
                          </RadioGroup>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={handleResolveDuplicates}
                              disabled={!selectedKeepId || resolveDuplicatesMutation.isPending}
                            >
                              {resolveDuplicatesMutation.isPending ? 'Menyelesaikan...' : 'Selesaikan'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (duplicatePartner) {
                                  resolveDuplicatesMutation.mutate({ keepId: '', deleteIds: [detailContact.id, duplicatePartner.id] })
                                }
                              }}
                              disabled={resolveDuplicatesMutation.isPending}
                            >
                              Hapus Semua
                            </Button>
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">Tidak ada duplikat ditemukan.</p>
                      )}
                    </div>
                  </>
                )}

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
                    <p className="mt-0.5">{detailContact?.serviceType || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase">Kota</p>
                    <p className="mt-0.5">{detailContact?.city || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase">Perusahaan</p>
                    <p className="mt-0.5">{detailContact?.company || '—'}</p>
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
                      {contact.jobTitle && <span>{contact.jobTitle}</span>}
                      {contact.jobTitle && contact.serviceType && <span> · </span>}
                      {contact.serviceType && <span>{contact.serviceType}</span>}
                      {(contact.jobTitle || contact.serviceType) && contact.email && <span> · </span>}
                      {contact.email && <span>{contact.email}</span>}
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
                    <TableCell key={cell.id} className="whitespace-nowrap">
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