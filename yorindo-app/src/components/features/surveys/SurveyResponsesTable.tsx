'use client'

import React, { useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table'
import type { SurveyResponseRecord } from '@/types/surveys'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import { TablePagination } from '@/components/ui/table-pagination'

interface SurveyResponsesTableProps {
  responses: SurveyResponseRecord[]
  total: number
}

const columnHelper = createColumnHelper<SurveyResponseRecord>()

export function SurveyResponsesTable({ responses, total }: SurveyResponsesTableProps) {
  const [globalFilter, setGlobalFilter] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const columns = [
    columnHelper.display({
      id: 'expander',
      header: () => null,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation()
            setExpanded((prev) => ({ ...prev, [row.id]: !prev[row.id] }))
          }}
        >
          {expanded[row.id] ? (
            <ChevronDown size={14} className="text-violet-600" />
          ) : (
            <ChevronRight size={14} className="text-muted-foreground" />
          )}
        </Button>
      ),
    }),
    columnHelper.accessor('contactName', {
      header: 'Nama',
      cell: (info) => <span className="font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor('contactPhone', {
      header: 'Telepon',
      cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
    }),
    columnHelper.accessor('submittedAt', {
      header: 'Waktu Respons',
      cell: (info) => (
        <span className="text-xs text-muted-foreground">
          {new Date(info.getValue()).toLocaleString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'status',
      header: 'Status',
      cell: () => (
        <Badge className="bg-green-50 text-green-700 border-green-200 text-[10px]">
          Selesai
        </Badge>
      ),
    }),
  ]

  const table = useReactTable({
    data: responses,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  const { pageIndex, pageSize } = table.getState().pagination
  const filteredTotal = table.getFilteredRowModel().rows.length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-xs w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari responden..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <span className="text-sm text-muted-foreground shrink-0">
          {total} total respons
        </span>
      </div>

      <div className="rounded-xl border border-violet-100 overflow-hidden">
        <Table>
          <TableHeader className="bg-violet-50/40">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-violet-100">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-xs font-semibold text-violet-800 py-3">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground text-sm">
                  Tidak ada data ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  <TableRow
                    className="hover:bg-violet-50/30 border-violet-100 cursor-pointer"
                    onClick={() => setExpanded((prev) => ({ ...prev, [row.id]: !prev[row.id] }))}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-3 text-sm">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* Expanded Detail Row */}
                  {expanded[row.id] && (
                    <TableRow className="bg-violet-50/20 hover:bg-violet-50/20">
                      <TableCell colSpan={columns.length} className="px-6 py-4">
                        <div className="space-y-3">
                          <p className="text-xs font-semibold text-violet-700 uppercase tracking-wider">
                            Detail Jawaban
                          </p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {Object.entries(row.original.answers).map(([key, val]) => (
                              <div key={key} className="bg-white rounded-lg border border-violet-100 p-3">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                                  {key}
                                </p>
                                <p className="text-sm text-foreground">
                                  {Array.isArray(val) ? val.join(', ') : String(val)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        page={pageIndex}
        pageSize={pageSize}
        total={filteredTotal}
        onPrev={() => table.previousPage()}
        onNext={() => table.nextPage()}
      />
    </div>
  )
}
