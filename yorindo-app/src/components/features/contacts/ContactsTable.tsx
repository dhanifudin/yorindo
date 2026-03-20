'use client'

import { useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useContacts } from '@/hooks/useContacts'
import { useFilterStore } from '@/store/filterStore'
import type { Contact, FlagCategory } from '@/types/api'
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { toast } from 'sonner'

const FLAG_LABELS: Record<NonNullable<FlagCategory>, { label: string; className: string }> = {
  spam: { label: 'Spam', className: 'bg-red-100 text-red-700' },
  'not-potential': { label: 'Tidak Potensial', className: 'bg-orange-100 text-orange-700' },
  'invalid-data': { label: 'Data Invalid', className: 'bg-yellow-100 text-yellow-700' },
  duplicate: { label: 'Duplikat', className: 'bg-gray-100 text-gray-700' },
}

const columns: ColumnDef<Contact>[] = [
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
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'phone', header: 'Telepon' },
  { accessorKey: 'industryId', header: 'Industri' },
  { accessorKey: 'city', header: 'Kota' },
  { accessorKey: 'companySize', header: 'Ukuran Perusahaan' },
  {
    accessorKey: 'completenessScore',
    header: 'Kelengkapan',
    cell: ({ getValue }) => `${Math.round((getValue() as number) * 100)}%`,
  },
  {
    accessorKey: 'createdAt',
    header: 'Dibuat',
    cell: ({ getValue }) =>
      new Date(getValue() as string).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
  },
]

const SKELETON_ROWS = 8

const FLAG_FILTER_OPTIONS = [
  { value: '', label: 'Semua' },
  { value: 'flagged', label: 'Ditandai' },
  { value: 'unflagged', label: 'Tidak Ditandai' },
] as const

export function ContactsTable() {
  const { page, flagFilter, setFilter } = useFilterStore()
  const { data, isLoading, isError } = useContacts()
  const [detailContact, setDetailContact] = useState<Contact | null>(null)
  const queryClient = useQueryClient()

  const flagMutation = useMutation({
    mutationFn: async ({ id, flagCategory }: { id: string; flagCategory: FlagCategory }) => {
      const res = await fetch(`/api/contacts/${id}`, {
        method: 'PATCH',
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

  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    pageCount: data?.pagination.totalPages ?? -1,
    state: {
      pagination: { pageIndex: page - 1, pageSize: 20 },
    },
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualFiltering: true,
  })

  if (isError) {
    return (
      <p className="text-center py-8 text-destructive">
        Gagal memuat data kontak. Silakan coba lagi.
      </p>
    )
  }

  return (
    <>
      {/* Contact detail sheet (mobile) */}
      <Sheet open={!!detailContact} onOpenChange={(v) => !v && setDetailContact(null)}>
        <SheetContent side="bottom" className="max-h-[65vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{detailContact?.name}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 mt-4 text-sm">
            <div><span className="text-muted-foreground">Email: </span>{detailContact?.email}</div>
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
          {/* Flag actions in detail sheet */}
          <div className="mt-4 space-y-2">
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
        </SheetContent>
      </Sheet>

      {/* Flag filter */}
      <div className="flex gap-2 mb-3">
        {FLAG_FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setFilter({ flagFilter: opt.value as typeof flagFilter, page: 1 })}
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

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {isLoading ? (
          Array.from({ length: SKELETON_ROWS }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-3">
              <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
              <div className="h-3 bg-muted rounded animate-pulse w-1/2 mt-2" />
            </div>
          ))
        ) : (data?.data ?? []).length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">Tidak ada data kontak.</p>
        ) : (
          (data?.data ?? []).map((contact) => (
            <div
              key={contact.id}
              className="rounded-lg border border-border bg-card p-3 cursor-pointer active:bg-muted/50"
              onClick={() => setDetailContact(contact)}
            >
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
          ))
        )}
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
                  className="cursor-pointer"
                  onClick={() => setDetailContact(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
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
