'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronUp, X } from 'lucide-react'
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

function DuplicateTriageTable({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [diffPair, setDiffPair] = useState<DuplicatePair | null>(null)

  const { data, isLoading } = useQuery<{ data: DuplicatePair[] }>({
    queryKey: ['triage-duplicates'],
    queryFn: () => fetch('/api/contacts/duplicates?pageSize=20').then((r) => r.json()),
  })

  const mergeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/contacts/${id}/merge`, { method: 'POST' })
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

  return (
    <>
      <Sheet open={!!diffPair} onOpenChange={(v) => !v && setDiffPair(null)}>
        <SheetContent side="right" className="sm:max-w-lg w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Lihat Perbedaan</SheetTitle>
          </SheetHeader>
          {diffPair && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-xs text-muted-foreground uppercase mb-2">Kontak 1</p>
                  <div className="space-y-1">
                    <p><span className="text-muted-foreground">Nama:</span> {diffPair.primary.name}</p>
                    <p><span className="text-muted-foreground">Email:</span> {diffPair.primary.email || '—'}</p>
                    <p><span className="text-muted-foreground">Telepon:</span> {diffPair.primary.phone}</p>
                    <p><span className="text-muted-foreground">Kota:</span> {diffPair.primary.city}</p>
                  </div>
                </div>
                <div>
                  <p className="font-medium text-xs text-muted-foreground uppercase mb-2">Kontak 2</p>
                  <div className="space-y-1">
                    <p><span className="text-muted-foreground">Nama:</span> {diffPair.duplicate.name}</p>
                    <p><span className="text-muted-foreground">Email:</span> {diffPair.duplicate.email || '—'}</p>
                    <p><span className="text-muted-foreground">Telepon:</span> {diffPair.duplicate.phone}</p>
                    <p><span className="text-muted-foreground">Kota:</span> {diffPair.duplicate.city}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => mergeMutation.mutate(diffPair.primary.id)}
                  disabled={mergeMutation.isPending || notDupMutation.isPending}
                >
                  Gabung
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => notDupMutation.mutate(diffPair.id)}
                  disabled={mergeMutation.isPending || notDupMutation.isPending}
                >
                  Bukan Duplikat
                </Button>
              </div>
            </div>
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
