'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronUp } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { toast } from 'sonner'
import { FlaggedRecordsTable, type FlaggedRecord } from './FlaggedRecordsTable'
import type { ContactsHealth, Contact } from '@/types/api'

// ─── Duplicate Triage Table ───────────────────────────────────────────────────

interface DuplicatePair {
  id: string
  primary: Contact
  duplicate: Contact
  matchScore: number
  matchReasons: string[]
}

type FieldSource = 'primary' | 'duplicate'
type FieldSelections = Record<string, FieldSource>

const MERGE_FIELDS: { key: keyof Contact; label: string }[] = [
  { key: 'name', label: 'Nama' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Telepon' },
  { key: 'city', label: 'Kota' },
  { key: 'company', label: 'Perusahaan' },
  { key: 'department', label: 'Departemen' },
  { key: 'jobTitle', label: 'Jabatan' },
  { key: 'serviceType', label: 'Jenis Layanan' },
]

function buildDefaultSelections(pair: DuplicatePair): FieldSelections {
  const selections: FieldSelections = {}
  for (const { key } of MERGE_FIELDS) {
    const primaryVal = pair.primary[key]
    const dupVal = pair.duplicate[key]
    // Prefer primary; but if primary is empty and duplicate has a value, default to duplicate
    selections[key] = !primaryVal && dupVal ? 'duplicate' : 'primary'
  }
  return selections
}

function MergeDiffSheet({
  pair,
  onClose,
  onMerge,
  onNotDup,
  isPending,
}: {
  pair: DuplicatePair
  onClose: () => void
  onMerge: (id: string, fieldSelections: FieldSelections) => void
  onNotDup: (id: string) => void
  isPending: boolean
}) {
  const [selections, setSelections] = useState<FieldSelections>(() => buildDefaultSelections(pair))
  const [prevPairId, setPrevPairId] = useState(pair.id)
  if (prevPairId !== pair.id) {
    setPrevPairId(pair.id)
    setSelections(buildDefaultSelections(pair))
  }

  const toggle = (field: string) => {
    setSelections((prev) => ({ ...prev, [field]: prev[field] === 'primary' ? 'duplicate' : 'primary' }))
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground pb-1 border-b">
        <span className="flex-1 font-medium text-center">Kontak 1</span>
        <span className="w-8" />
        <span className="flex-1 font-medium text-center">Kontak 2</span>
      </div>

      <div className="space-y-1">
        {MERGE_FIELDS.map(({ key, label }) => {
          const primaryVal = String(pair.primary[key] ?? '') || '—'
          const dupVal = String(pair.duplicate[key] ?? '') || '—'
          const isDiff = primaryVal !== dupVal
          const chosen = selections[key] ?? 'primary'

          return (
            <div
              key={key}
              className={`grid grid-cols-[1fr_auto_1fr] gap-2 items-center rounded-md px-2 py-1.5 text-sm ${isDiff ? 'bg-amber-50 border border-amber-100' : ''}`}
            >
              <button
                type="button"
                onClick={() => isDiff && setSelections((prev) => ({ ...prev, [key]: 'primary' }))}
                className={`text-left rounded px-2 py-1 transition-all ${chosen === 'primary' ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-muted'} ${!isDiff ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <span className="block text-[10px] text-muted-foreground font-normal mb-0.5">{label}</span>
                <span className="block truncate">{primaryVal}</span>
              </button>

              <button
                type="button"
                onClick={() => isDiff && toggle(key)}
                disabled={!isDiff}
                className={`flex items-center justify-center w-6 h-6 rounded-full text-xs border transition-colors ${isDiff ? 'border-amber-300 bg-white hover:bg-amber-50 cursor-pointer' : 'border-transparent cursor-default opacity-30'}`}
                title={isDiff ? 'Klik untuk pilih' : 'Nilai sama'}
              >
                ⇄
              </button>

              <button
                type="button"
                onClick={() => isDiff && setSelections((prev) => ({ ...prev, [key]: 'duplicate' }))}
                className={`text-left rounded px-2 py-1 transition-all ${chosen === 'duplicate' ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-muted'} ${!isDiff ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <span className="block text-[10px] text-muted-foreground font-normal mb-0.5">{label}</span>
                <span className="block truncate">{dupVal}</span>
              </button>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Klik nilai yang ingin disimpan. Nilai yang disorot <span className="bg-primary text-primary-foreground rounded px-1">biru</span> akan digunakan pada kontak hasil gabungan.
      </p>

      <div className="flex gap-2 pt-2 border-t">
        <Button
          size="sm"
          onClick={() => onMerge(pair.primary.id, selections)}
          disabled={isPending}
        >
          Gabung
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onNotDup(pair.id)}
          disabled={isPending}
        >
          Bukan Duplikat
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose} disabled={isPending}>
          Batal
        </Button>
      </div>
    </div>
  )
}

function DuplicateTriageTable({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [diffPair, setDiffPair] = useState<DuplicatePair | null>(null)

  const { data, isLoading } = useQuery<{ data: DuplicatePair[] }>({
    queryKey: ['triage-duplicates'],
    queryFn: () => fetch('/api/contacts/duplicates?pageSize=20').then((r) => { if (!r.ok) throw new Error('Failed'); return r.json() }),
  })

  const mergeMutation = useMutation({
    mutationFn: async ({ id, fieldSelections }: { id: string; fieldSelections: FieldSelections }) => {
      const res = await fetch(`/api/contacts/${id}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldSelections }),
      })
      if (!res.ok) throw new Error('Gagal menggabungkan')
      return res.json()
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['contacts-health'] })
      const prev = queryClient.getQueryData<ContactsHealth>(['contacts-health'])
      queryClient.setQueryData<ContactsHealth>(['contacts-health'], (old) =>
        old ? { ...old, duplicates: Math.max(0, old.duplicates - 1) } : old
      )
      return { prev }
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(['contacts-health'], context.prev)
      toast.error('Perubahan dibatalkan — terjadi kesalahan')
    },
    onSuccess: () => {
      const current = queryClient.getQueryData<ContactsHealth>(['contacts-health'])
      const remaining = current?.duplicates ?? 0
      if (remaining === 0) {
        toast.success('Semua duplikat diselesaikan')
        onClose()
      } else {
        toast.success(`Kontak digabungkan · ${remaining} duplikat tersisa`)
      }
      queryClient.invalidateQueries({ queryKey: ['triage-duplicates'] })
      setDiffPair(null)
    },
  })

  const notDupMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/contacts/duplicates/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal')
      return id
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['contacts-health'] })
      const prev = queryClient.getQueryData<ContactsHealth>(['contacts-health'])
      queryClient.setQueryData<ContactsHealth>(['contacts-health'], (old) =>
        old ? { ...old, duplicates: Math.max(0, old.duplicates - 1) } : old
      )
      return { prev }
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(['contacts-health'], context.prev)
      toast.error('Perubahan dibatalkan — terjadi kesalahan')
    },
    onSuccess: () => {
      const current = queryClient.getQueryData<ContactsHealth>(['contacts-health'])
      const remaining = current?.duplicates ?? 0
      if (remaining === 0) {
        toast.success('Semua duplikat diselesaikan')
        onClose()
      } else {
        toast.success(`Ditandai bukan duplikat · ${remaining} tersisa`)
      }
      queryClient.invalidateQueries({ queryKey: ['triage-duplicates'] })
      setDiffPair(null)
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  const pairs = data?.data ?? []

  if (pairs.length === 0) {
    return <p className="text-muted-foreground text-center py-8">Tidak ada duplikat ditemukan</p>
  }

  const isPending = mergeMutation.isPending || notDupMutation.isPending

  return (
    <>
      <Sheet open={!!diffPair} onOpenChange={(v) => !v && setDiffPair(null)}>
        <SheetContent side="right" className="sm:max-w-lg w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Pilih Data yang Disimpan</SheetTitle>
          </SheetHeader>
          {diffPair && (
            <MergeDiffSheet
              pair={diffPair}
              onClose={() => setDiffPair(null)}
              onMerge={(id, fieldSelections) => mergeMutation.mutate({ id, fieldSelections })}
              onNotDup={(id) => notDupMutation.mutate(id)}
              isPending={isPending}
            />
          )}
        </SheetContent>
      </Sheet>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kontak 1</TableHead>
            <TableHead>Kontak 2</TableHead>
            <TableHead>Skor Kemiripan</TableHead>
            <TableHead>Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pairs.map((pair) => (
            <TableRow key={pair.id}>
              <TableCell className="text-sm font-medium">{pair.primary.name}</TableCell>
              <TableCell className="text-sm">{pair.duplicate.name}</TableCell>
              <TableCell>
                <Badge className="bg-orange-100 text-orange-700">
                  {Math.round(pair.matchScore * 100)}%
                </Badge>
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setDiffPair(pair)}
                >
                  Lihat Perbedaan
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}

// ─── TriagePanel ──────────────────────────────────────────────────────────────

interface TriagePanelProps {
  mode: 'flagged' | 'duplicates' | null
  onClose: () => void
}

export function TriagePanel({ mode, onClose }: TriagePanelProps) {
  const firstButtonRef = useRef<HTMLButtonElement>(null)
  const lastStatTypeRef = useRef<'flagged' | 'duplicates' | null>(null)

  // Track last opened stat type for focus return
  useEffect(() => {
    if (mode !== null) {
      lastStatTypeRef.current = mode
      const timer = setTimeout(() => {
        firstButtonRef.current?.focus()
      }, 150)
      return () => clearTimeout(timer)
    } else if (lastStatTypeRef.current) {
      const trigger = document.querySelector<HTMLButtonElement>(
        `[data-stat-trigger="${lastStatTypeRef.current}"]`
      )
      trigger?.focus()
    }
  }, [mode])

  const title = mode === 'flagged' ? 'Catatan Bermasalah' : mode === 'duplicates' ? 'Duplikat Kontak' : ''

  // Fetch flagged records for the flagged triage table
  const { data: flaggedData, isLoading: flaggedLoading } = useQuery<{
    data: FlaggedRecord[]
    pagination: { total: number }
  }>({
    queryKey: ['triage-flagged'],
    queryFn: () => fetch('/api/contacts/flagged?status=pending&pageSize=20').then((r) => r.json()),
    enabled: mode === 'flagged',
  })

  return (
    <Collapsible
      open={mode !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      className="mb-4"
    >
      {mode !== null && (
        <Card>
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">{title}</h2>
              <CollapsibleTrigger asChild>
                <Button
                  ref={firstButtonRef}
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  aria-label="Tutup panel"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          <CollapsibleContent className="overflow-hidden motion-safe:data-[state=open]:animate-collapsible-down motion-safe:data-[state=closed]:animate-collapsible-up">
            <CardContent className="px-4 pb-4 pt-0">
              {mode === 'flagged' && (
                flaggedLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <FlaggedRecordsTable
                    records={flaggedData?.data ?? []}
                    optimisticHealthUpdate={true}
                    onAllResolved={onClose}
                  />
                )
              )}
              {mode === 'duplicates' && (
                <DuplicateTriageTable onClose={onClose} />
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      )}
    </Collapsible>
  )
}
