'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import Link from 'next/link'

interface FlaggedRecord {
  id: string
  status: 'pending' | 'resolved' | 'discarded'
  rawData: Record<string, string>
  flags: string[]
  createdAt: string
}

interface EditState {
  [recordId: string]: Record<string, string>
}

const FLAG_LABEL: Record<string, string> = {
  LOW_CONFIDENCE_INDUSTRY: 'Industri tidak yakin',
  PHONE_FORMAT_INVALID: 'Format telepon tidak valid',
  EMAIL_UNVERIFIABLE: 'Email tidak dapat diverifikasi',
  NAME_INCOMPLETE: 'Nama tidak lengkap',
  CITY_UNRECOGNIZED: 'Kota tidak dikenali',
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  resolved: 'bg-green-100 text-green-700',
  discarded: 'bg-destructive/10 text-destructive',
}

export default function FlaggedRecordsPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('pending')
  const [editState, setEditState] = useState<EditState>({})
  const [detailRecord, setDetailRecord] = useState<FlaggedRecord | null>(null)

  const { data, isLoading } = useQuery<{ data: FlaggedRecord[]; pagination: { total: number } }>({
    queryKey: ['contacts-flagged', statusFilter],
    queryFn: () =>
      fetch(`/api/contacts/flagged?status=${statusFilter}&pageSize=50`).then((r) => r.json()),
  })

  const resolveMutation = useMutation({
    mutationFn: async ({ id, action, resolvedData }: { id: string; action: 'approve' | 'discard'; resolvedData?: Record<string, string> }) => {
      const res = await fetch(`/api/contacts/flagged/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, resolved_data: resolvedData }),
      })
      if (!res.ok) throw new Error('Gagal memproses record')
      return res.json()
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['contacts-flagged'] })
      toast.success(action === 'approve' ? 'Record disetujui dan disimpan' : 'Record dibuang')
      setDetailRecord(null)
    },
    onError: () => toast.error('Terjadi kesalahan'),
  })

  const handleFieldEdit = (recordId: string, field: string, value: string) => {
    setEditState((prev) => ({
      ...prev,
      [recordId]: { ...prev[recordId], [field]: value },
    }))
  }

  const getFieldValue = (record: FlaggedRecord, field: string) =>
    editState[record.id]?.[field] ?? record.rawData[field] ?? ''

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

      {/* Record detail / edit sheet */}
      <Sheet open={!!detailRecord} onOpenChange={(v) => !v && setDetailRecord(null)}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
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

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {!data?.data.length && (
            <p className="text-muted-foreground text-center py-12">Tidak ada record dengan status {statusFilter}</p>
          )}
          {data?.data && data.data.length > 0 && (
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
                  {data.data.map((record) => {
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
          )}
        </>
      )}
    </div>
  )
}
