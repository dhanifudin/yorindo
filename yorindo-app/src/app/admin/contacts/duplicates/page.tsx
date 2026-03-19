'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  { key: 'industryId', label: 'Industri' },
  { key: 'companySize', label: 'Ukuran Perusahaan' },
]

export default function DuplicatesPage() {
  const queryClient = useQueryClient()
  const [selections, setSelections] = useState<Record<string, Record<string, 'primary' | 'duplicate'>>>({})

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

  const MATCH_REASON_LABEL: Record<string, string> = {
    same_phone: 'Telepon sama',
    same_email: 'Email sama',
    similar_name: 'Nama mirip',
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/contacts" className="text-muted-foreground hover:text-foreground text-sm">
          ← Kembali ke Kontak
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-6">Profil Duplikat</h1>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {!data?.data.length && (
            <p className="text-muted-foreground text-center py-12">Tidak ada profil duplikat yang terdeteksi</p>
          )}
          {data?.data.map((group) => (
            <Card key={group.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex gap-2 flex-wrap">
                    {group.matchReasons.map((r) => (
                      <Badge key={r} className="bg-orange-100 text-orange-700 text-xs">
                        {MATCH_REASON_LABEL[r] ?? r}
                      </Badge>
                    ))}
                  </div>
                  <Badge className="bg-muted text-muted-foreground">
                    Kecocokan: {Math.round(group.matchScore * 100)}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-4 text-muted-foreground w-32">Field</th>
                        <th className="text-left py-2 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Utama</span>
                            <Badge className="text-xs bg-blue-100 text-blue-700">{group.primary.id.slice(-6)}</Badge>
                          </div>
                        </th>
                        <th className="text-left py-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Duplikat</span>
                            <Badge className="text-xs bg-muted text-muted-foreground">{group.duplicate.id.slice(-6)}</Badge>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {FIELDS.map(({ key, label }) => {
                        const primVal = String(group.primary[key] ?? '')
                        const dupVal = String(group.duplicate[key] ?? '')
                        const isDiff = primVal !== dupVal
                        const choice = getChoice(group.id, key)
                        return (
                          <tr key={key} className={`border-b last:border-0 ${isDiff ? 'bg-orange-50/30' : ''}`}>
                            <td className="py-2 pr-4 text-muted-foreground font-medium">{label}</td>
                            <td className="py-2 pr-4">
                              {isDiff ? (
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`${group.id}-${key}`}
                                    checked={choice === 'primary'}
                                    onChange={() => setFieldChoice(group.id, key, 'primary')}
                                    className="accent-primary"
                                  />
                                  <span className={choice === 'primary' ? 'font-semibold' : ''}>{primVal || '—'}</span>
                                </label>
                              ) : (
                                <span>{primVal || '—'}</span>
                              )}
                            </td>
                            <td className="py-2">
                              {isDiff ? (
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`${group.id}-${key}`}
                                    checked={choice === 'duplicate'}
                                    onChange={() => setFieldChoice(group.id, key, 'duplicate')}
                                    className="accent-primary"
                                  />
                                  <span className={choice === 'duplicate' ? 'font-semibold' : ''}>{dupVal || '—'}</span>
                                </label>
                              ) : (
                                <span>{dupVal || '—'}</span>
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
                        groupId: group.id,
                        primaryId: group.primary.id,
                        fieldSelections: selections[group.id] ?? {},
                      })
                    }
                    disabled={mergeMutation.isPending}
                  >
                    Gabungkan Profil
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
