'use client'

import { useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { useContacts } from '@/hooks/useContacts'
import { useFilterStore } from '@/store/filterStore'
import type { Contact } from '@/types/api'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

// Columns hidden on mobile (< md)
const MOBILE_HIDDEN_COLS = new Set(['email', 'phone', 'city', 'companySize', 'completenessScore', 'createdAt'])

const columns: ColumnDef<Contact>[] = [
  { accessorKey: 'name', header: 'Nama' },
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

export function ContactsTable() {
  const { page } = useFilterStore()
  const { data, isLoading, isError } = useContacts()
  const [detailContact, setDetailContact] = useState<Contact | null>(null)

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
          </div>
        </SheetContent>
      </Sheet>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={MOBILE_HIDDEN_COLS.has(header.column.id) ? 'hidden md:table-cell' : ''}
                  >
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
                  {columns.map((col, j) => {
                    const colId = 'accessorKey' in col ? String(col.accessorKey) : ''
                    return (
                      <TableCell key={j} className={MOBILE_HIDDEN_COLS.has(colId) ? 'hidden md:table-cell' : ''}>
                        <div className="h-4 bg-muted rounded animate-pulse" />
                      </TableCell>
                    )
                  })}
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
                      className={[
                        'whitespace-nowrap',
                        MOBILE_HIDDEN_COLS.has(cell.column.id) ? 'hidden md:table-cell' : '',
                      ].join(' ')}
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
