'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import Link from 'next/link'
import type { Contact } from '@/types/api'

interface DuplicateGroup {
  id: string
  primary: Contact
  duplicate: Contact
  matchScore: number
  matchReasons: string[]
}

const FIELDS: { key: keyof Contact; label: string }[] = [
  { key: 'name', label: 'Nama' },
  { key: 'phone', label: 'Telepon' },
  { key: 'email', label: 'Email' },
  { key: 'city', label: 'Kota' },
  { key: 'serviceType', label: 'Industri' },
  { key: 'jobTitle', label: 'Jabatan' },
]

const MATCH_REASON_LABEL: Record<string, string> = {
  same_phone: 'Telepon sama',
  same_email: 'Email sama',
  similar_name: 'Nama mirip',
}

export default function DuplicatesPage() {
  const queryClient = useQueryClient()
  const [selections, setSelections] = useState<Record<string, Record<string, 'primary' | 'duplicate'>>>({})
  const [detailGroup, setDetailGroup] = useState<DuplicateGroup | null>(null)

  const { data, isLoading } = useQuery<{ data: DuplicateGroup[]; pagination: { total: number } }>({
    queryKey: ['contacts-duplicates'],
    queryFn: () => fetch('/api/contacts/duplicates').then((r) => r.json()),
  })

  const mergeMutation = useMutation({
    mutationFn: async ({ groupId, primaryId, fieldSelections }: { groupId: string; primaryId: string; fieldSelections: Record<string, 'primary' | 'duplicate'> }) => {
      const res = await fetch(`/api/contacts/${primaryId}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mergeIntoId: primaryId, fieldSelections }),
      })
      if (!res.ok) throw new Error('Merge gagal')
      return { groupId }
    },
    onSuccess: ({ groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['contacts-duplicates'] })
      setSelections((prev) => {
        const next = { ...prev }
        delete next[groupId]
        return next
      })
      setDetailGroup(null)
      toast.success('Profil berhasil digabungkan')
    },
    onError: () => toast.error('Merge gagal'),
  })

  const setFieldChoice = (groupId: string, field: string, choice: 'primary' | 'duplicate') => {
    setSelections((prev) => ({
      ...prev,
      [groupId]: { ...prev[groupId], [field]: choice },
    }))
  }

  const getChoice = (groupId: string, field: string): 'primary' | 'duplicate' =>
    selections[groupId]?.[field] ?? 'primary'

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app/contacts" className="text-muted-foreground hover:text-foreground text-sm">
          ← Kembali ke Kontak
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-6">Profil Duplikat</h1>

      {/* Duplicate group detail sheet */}
      <Sheet open={!!detailGroup} onOpenChange={(v) => !v && setDetailGroup(null)}>
        <SheetContent side="bottom" className="flex flex-col max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Bandingkan & Gabungkan</SheetTitle>
          </SheetHeader>
          {detailGroup && (
            <div className="px-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex gap-2 flex-wrap">
                  {detailGroup.matchReasons.map((r) => (
                    <Badge key={r} className="bg-orange-100 text-orange-700 text-xs">
                      {MATCH_REASON_LABEL[r] ?? r}
                    </Badge>
                  ))}
                </div>
                <Badge className="bg-muted text-muted-foreground">
                  {Math.round(detailGroup.matchScore * 100)}%
                </Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 text-muted-foreground w-28">Field</th>
                      <th className="text-left py-2 pr-4">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Utama</span>
                          <Badge className="text-xs bg-blue-100 text-blue-700">{detailGroup.primary.id.slice(-6)}</Badge>
                        </div>
                      </th>
                      <th className="text-left py-2">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Duplikat</span>
                          <Badge className="text-xs bg-muted text-muted-foreground">{detailGroup.duplicate.id.slice(-6)}</Badge>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {FIELDS.map(({ key, label }) => {
                      const primVal = String(detailGroup.primary[key] ?? '')
                      const dupVal = String(detailGroup.duplicate[key] ?? '')
                      const isDiff = primVal !== dupVal
                      const choice = getChoice(detailGroup.id, key)
                      return (
                        <tr key={key} className={`border-b last:border-0 ${isDiff ? 'bg-orange-50/30' : ''}`}>
                          <td className="py-2 pr-4 text-muted-foreground font-medium text-xs">{label}</td>
                          <td className="py-2 pr-4">
                            {isDiff ? (
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`${detailGroup.id}-${key}`}
                                  checked={choice === 'primary'}
                                  onChange={() => setFieldChoice(detailGroup.id, key, 'primary')}
                                  className="accent-primary"
                                />
                                <span className={`text-sm ${choice === 'primary' ? 'font-semibold' : ''}`}>{primVal || '—'}</span>
                              </label>
                            ) : (
                              <span className="text-sm">{primVal || '—'}</span>
                            )}
                          </td>
                          <td className="py-2">
                            {isDiff ? (
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`${detailGroup.id}-${key}`}
                                  checked={choice === 'duplicate'}
                                  onChange={() => setFieldChoice(detailGroup.id, key, 'duplicate')}
                                  className="accent-primary"
                                />
                                <span className={`text-sm ${choice === 'duplicate' ? 'font-semibold' : ''}`}>{dupVal || '—'}</span>
                              </label>
                            ) : (
                              <span className="text-sm">{dupVal || '—'}</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-4">
                <Button
                  size="sm"
                  onClick={() =>
                    mergeMutation.mutate({
                      groupId: detailGroup.id,
                      primaryId: detailGroup.primary.id,
                      fieldSelections: selections[detailGroup.id] ?? {},
                    })
                  }
                  disabled={mergeMutation.isPending}
                >
                  Gabungkan Profil
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {!data?.data.length && (
            <p className="text-muted-foreground text-center py-12">Tidak ada profil duplikat yang terdeteksi</p>
          )}
          {data?.data && data.data.length > 0 && (
            <Card className="w-full overflow-hidden">
              <Table className="md:min-w-[640px] xl:min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>Record A</TableHead>
                    <TableHead className="hidden md:table-cell">Record B</TableHead>
                    <TableHead className="hidden md:table-cell">Kemiripan</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((group) => (
                    <TableRow
                      key={group.id}
                      className="cursor-pointer"
                      onClick={() => setDetailGroup(group)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div>
                          <p className="font-medium">{group.primary.name}</p>
                          <p className="text-xs text-muted-foreground">{group.primary.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell" onClick={(e) => e.stopPropagation()}>
                        <div>
                          <p className="font-medium">{group.duplicate.name}</p>
                          <p className="text-xs text-muted-foreground">{group.duplicate.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell" onClick={(e) => e.stopPropagation()}>
                        <Badge className="bg-muted text-muted-foreground">
                          {Math.round(group.matchScore * 100)}%
                        </Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDetailGroup(group)}
                        >
                          Bandingkan
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
