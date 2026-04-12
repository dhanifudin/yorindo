'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Check, X, ChevronsLeftRight } from 'lucide-react'
import { toast } from 'sonner'

interface DuplicatePair {
  id: string
  primary: {
    id: string
    name: string
    email: string | null
    phone: string | null
    city: string | null
  }
  duplicate: {
    id: string
    name: string
    email: string | null
    phone: string | null
    city: string | null
  }
  matchScore: number
  matchReasons: string[]
}

interface DuplicateResponse {
  data: DuplicatePair[]
  pagination: { total: number; page: number; pageSize: number; totalPages: number }
}

async function fetchDuplicates(page = 1): Promise<DuplicateResponse> {
  const res = await fetch(`/api/contacts/duplicates?page=${page}&pageSize=20`)
  if (!res.ok) throw new Error('Gagal memuat duplikat')
  return res.json()
}

async function resolveDuplicate(primaryId: string, keepId: string) {
  const res = await fetch(`/api/contacts/${keepId}/merge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ otherId: primaryId === keepId ? '' : primaryId }),
  })
  if (!res.ok) throw new Error('Gagal menyelesaikan duplikat')
  return res.json()
}

async function dismissDuplicate(pairId: string) {
  const res = await fetch(`/api/contacts/duplicates/${pairId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Gagal mengabaikan duplikat')
}

export function DuplicateContactsTab() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery<DuplicateResponse>({
    queryKey: ['contacts-duplicates'],
    queryFn: () => fetchDuplicates(),
    staleTime: 60_000,
  })

  const resolveMutation = useMutation({
    mutationFn: ({ primaryId, keepId }: { primaryId: string; keepId: string }) =>
      resolveDuplicate(primaryId, keepId),
    onSuccess: () => {
      toast.success('Duplikat berhasil diselesaikan')
      queryClient.invalidateQueries({ queryKey: ['contacts-duplicates'] })
    },
    onError: () => toast.error('Gagal menyelesaikan duplikat'),
  })

  const dismissMutation = useMutation({
    mutationFn: dismissDuplicate,
    onSuccess: () => {
      toast.success('Duplikat diabaikan')
      queryClient.invalidateQueries({ queryKey: ['contacts-duplicates'] })
    },
    onError: () => toast.error('Gagal mengabaikan duplikat'),
  })

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Tinjau dan selesaikan kontak yang terdeteksi sebagai duplikat
      </p>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : !data?.data.length ? (
        <p className="text-muted-foreground text-center py-12">Tidak ada kontak duplikat</p>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Pasangan Duplikat</span>
              <Badge variant="secondary">{data.pagination.total} ditemukan</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kontak 1</TableHead>
                  <TableHead>Kontak 2</TableHead>
                  <TableHead>Kecocokan</TableHead>
                  <TableHead className="w-[200px] text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((pair) => (
                  <TableRow key={pair.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{pair.primary.name}</p>
                        <p className="text-xs text-muted-foreground">{pair.primary.email || pair.primary.phone}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{pair.duplicate.name}</p>
                        <p className="text-xs text-muted-foreground">{pair.duplicate.email || pair.duplicate.phone}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <Badge variant="outline" className="text-xs">{Math.round(pair.matchScore * 100)}%</Badge>
                        <p className="text-xs text-muted-foreground mt-1">{pair.matchReasons[0]}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => dismissMutation.mutate(pair.id)}
                          disabled={dismissMutation.isPending}
                          title="Abaikan"
                        >
                          <X className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resolveMutation.mutate({ primaryId: pair.primary.id, keepId: pair.primary.id })}
                          disabled={resolveMutation.isPending}
                          title="Gabungkan (simpan Kontak 1)"
                        >
                          <Check className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resolveMutation.mutate({ primaryId: pair.duplicate.id, keepId: pair.duplicate.id })}
                          disabled={resolveMutation.isPending}
                          title="Gabungkan (simpan Kontak 2)"
                        >
                          <ChevronsLeftRight className="w-4 h-4 text-blue-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
