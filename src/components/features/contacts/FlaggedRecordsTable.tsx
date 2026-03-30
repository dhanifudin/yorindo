'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import type { ContactsHealth } from '@/types/api'

export interface FlaggedRecord {
  id: string
  status: 'pending' | 'resolved' | 'discarded'
  rawData: Record<string, string>
  flags: string[]
  createdAt: string
}

type EditState = {
  [recordId: string]: Record<string, string>
}

const FLAG_LABEL: Record<string, string> = {
  LOW_CONFIDENCE_INDUSTRY: 'Industri tidak yakin',
  PHONE_FORMAT_INVALID: 'Format telepon tidak valid',
  EMAIL_UNVERIFIABLE: 'Email tidak dapat diverifikasi',
  NAME_INCOMPLETE: 'Nama tidak lengkap',
  CITY_UNRECOGNIZED: 'Kota tidak dikenali',
}

export const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  resolved: 'bg-green-100 text-green-700',
  discarded: 'bg-destructive/10 text-destructive',
}

interface FlaggedRecordsTableProps {
  records: FlaggedRecord[]
  onCountChange?: (delta: -1) => void
  onAllResolved?: () => void
  /** If true, uses optimistic update on contacts-health cache */
  optimisticHealthUpdate?: boolean
}

export function FlaggedRecordsTable({
  records,
  onCountChange,
  onAllResolved,
  optimisticHealthUpdate = false,
}: FlaggedRecordsTableProps) {
  const queryClient = useQueryClient()
  const [editState, setEditState] = useState<EditState>({})
  const [detailRecord, setDetailRecord] = useState<FlaggedRecord | null>(null)

  const resolveMutation = useMutation({
    mutationFn: async ({
      id,
      action,
      resolvedData,
    }: {
      id: string
      action: 'approve' | 'discard'
      resolvedData?: Record<string, string>
    }) => {
      const res = await fetch(`/api/contacts/flagged/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, resolved_data: resolvedData }),
      })
      if (!res.ok) throw new Error('Gagal memproses record')
      return res.json()
    },

    onMutate: async () => {
      if (!optimisticHealthUpdate) return
      await queryClient.cancelQueries({ queryKey: ['contacts-health'] })
      const prev = queryClient.getQueryData<ContactsHealth>(['contacts-health'])
      queryClient.setQueryData<ContactsHealth>(['contacts-health'], (old) =>
        old ? { ...old, flagged: Math.max(0, old.flagged - 1) } : old
      )
      return { prev }
    },

    onError: (_err, _vars, context) => {
      if (optimisticHealthUpdate && context?.prev) {
        queryClient.setQueryData(['contacts-health'], context.prev)
      }
      toast.error('Perubahan dibatalkan — terjadi kesalahan')
    },

    onSuccess: (_, { action }) => {
      if (onCountChange) onCountChange(-1)

      if (optimisticHealthUpdate) {
        const current = queryClient.getQueryData<ContactsHealth>(['contacts-health'])
        const remaining = current?.flagged ?? 0
        if (remaining === 0) {
          toast.success('Semua catatan bermasalah diselesaikan')
          onAllResolved?.()
        } else {
          toast.success(`Catatan ${action === 'approve' ? 'disetujui' : 'dibuang'} · ${remaining} tersisa`)
        }
      } else {
        toast.success(action === 'approve' ? 'Record disetujui dan disimpan' : 'Record dibuang')
      }

      queryClient.invalidateQueries({ queryKey: ['contacts-flagged'] })
      queryClient.invalidateQueries({ queryKey: ['triage-flagged'] })
      setDetailRecord(null)
    },
  })

  const handleFieldEdit = (recordId: string, field: string, value: string) => {
    setEditState((prev) => ({
      ...prev,
      [recordId]: { ...prev[recordId], [field]: value },
    }))
  }

  const getFieldValue = (record: FlaggedRecord, field: string) =>
    editState[record.id]?.[field] ?? record.rawData[field] ?? ''

  if (records.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">Tidak ada record bermasalah</p>
    )
  }

  return (
    <>
      {/* Record detail / edit sheet */}
      <Sheet open={!!detailRecord} onOpenChange={(v) => !v && setDetailRecord(null)}>
        <SheetContent side="right" className="sm:max-w-lg w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detail Record</SheetTitle>
          </SheetHeader>
          {detailRecord && (
            <div className="mt-4">
              <div className="flex gap-2 flex-wrap mb-4">
                {detailRecord.flags.map((flag) => (
                  <Badge key={flag} className="bg-orange-100 text-orange-700 text-xs">
                    {FLAG_LABEL[flag] ?? flag}
                  </Badge>
                ))}
                <Badge className={STATUS_BADGE[detailRecord.status]}>{detailRecord.status}</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {Object.entries(detailRecord.rawData).map(([field, originalValue]) => (
                  <div key={field} className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase">{field}</label>
                    {detailRecord.status === 'pending' ? (
                      <Input
                        value={getFieldValue(detailRecord, field)}
                        onChange={(e) => handleFieldEdit(detailRecord.id, field, e.target.value)}
                        className="h-8 text-sm"
                        placeholder={originalValue}
                      />
                    ) : (
                      <p className="text-sm">{originalValue}</p>
                    )}
                  </div>
                ))}
              </div>
              {detailRecord.status === 'pending' && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      resolveMutation.mutate({
                        id: detailRecord.id,
                        action: 'approve',
                        resolvedData: { ...detailRecord.rawData, ...editState[detailRecord.id] },
                      })
                    }
                    disabled={resolveMutation.isPending}
                  >
                    Setujui
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    onClick={() => resolveMutation.mutate({ id: detailRecord.id, action: 'discard' })}
                    disabled={resolveMutation.isPending}
                  >
                    Buang
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Flag</TableHead>
              <TableHead className="hidden md:table-cell">Nilai Saat Ini</TableHead>
              <TableHead className="hidden md:table-cell">Status</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => {
              const name = record.rawData.name ?? record.rawData.nama ?? record.id.slice(-8)
              const flagLabels = record.flags.map((f) => FLAG_LABEL[f] ?? f).join(', ')
              const currentValues = Object.entries(record.rawData)
                .slice(0, 2)
                .map(([k, v]) => `${k}: ${v}`)
                .join(' · ')
              return (
                <TableRow
                  key={record.id}
                  className="cursor-pointer"
                  onClick={() => setDetailRecord(record)}
                >
                  <TableCell className="font-medium" onClick={(e) => e.stopPropagation()}>
                    {name}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <span className="text-xs text-orange-700">{flagLabels}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-xs" onClick={(e) => e.stopPropagation()}>
                    {currentValues}
                  </TableCell>
                  <TableCell className="hidden md:table-cell" onClick={(e) => e.stopPropagation()}>
                    <Badge className={STATUS_BADGE[record.status]}>{record.status}</Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {record.status === 'pending' ? (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() =>
                            resolveMutation.mutate({
                              id: record.id,
                              action: 'approve',
                              resolvedData: { ...record.rawData, ...editState[record.id] },
                            })
                          }
                          disabled={resolveMutation.isPending}
                        >
                          Setujui
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-destructive"
                          onClick={() => resolveMutation.mutate({ id: record.id, action: 'discard' })}
                          disabled={resolveMutation.isPending}
                        >
                          Buang
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>
    </>
  )
}
