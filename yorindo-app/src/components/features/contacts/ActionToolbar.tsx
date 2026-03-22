'use client'

import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { FlagCategory } from '@/types/api'

function buildBlastUrl(searchParams: URLSearchParams, total: number): string {
  const segmentParts: string[] = []
  const industry = searchParams.get('industry')
  const city = searchParams.get('city')
  const companySize = searchParams.get('companySize')
  if (industry) segmentParts.push(industry)
  if (city) segmentParts.push(city)
  if (companySize) segmentParts.push(companySize)

  const params = new URLSearchParams()
  if (segmentParts.length) params.set('segment', segmentParts.join(','))
  params.set('count', String(total))
  return `/app/blasts/new?${params.toString()}`
}

interface ActionToolbarProps {
  total: number
  searchParams: URLSearchParams
  isVisible: boolean
  selectedIds: string[]
  onClearSelection: () => void
}

export function ActionToolbar({ total, searchParams, isVisible, selectedIds, onClearSelection }: ActionToolbarProps) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const bulkFlagMutation = useMutation({
    mutationFn: async ({ ids, flagCategory }: { ids: string[]; flagCategory: FlagCategory | null }) => {
      const res = await fetch('/api/contacts/bulk-flag', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, flagCategory }),
      })
      if (!res.ok) throw new Error('Bulk flag gagal')
      return res.json() as Promise<{ updated: number }>
    },
    onSuccess: ({ updated }) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['contacts-health'] })
      if (updated === 0) {
        toast.warning('Tidak ada kontak yang diperbarui')
      } else {
        toast.success(`${updated} kontak berhasil ditandai`)
      }
      onClearSelection()
    },
    onError: () => toast.error('Gagal menandai kontak'),
  })

  if (!isVisible) return null

  const blastUrl = selectedIds.length > 0
    ? `/app/blasts/new?selectedIds=${selectedIds.join(',')}&count=${selectedIds.length}`
    : buildBlastUrl(searchParams, total)

  const blastLabel = selectedIds.length > 0
    ? `Blast ${selectedIds.length} kontak →`
    : `Blast Segmen · ${total} kontak →`

  const handleBlast = () => {
    router.push(blastUrl)
  }

  return (
    <Card
      role="toolbar"
      aria-label="Aksi segmen"
      className="sticky bottom-0 z-10 rounded-none border-t border-x-0 border-b-0 shadow-md"
    >
      <div className="flex items-center justify-between px-4 py-3 gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">
            {selectedIds.length > 0
              ? `${selectedIds.length} kontak terpilih di halaman ini`
              : `${total} kontak di segmen ini`}
          </span>
          {selectedIds.length > 0 && (
            <>
              <Badge variant="secondary">{selectedIds.length} terpilih</Badge>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={onClearSelection}
              >
                × Batalkan
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {selectedIds.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={bulkFlagMutation.isPending}
                onClick={() => bulkFlagMutation.mutate({ ids: selectedIds, flagCategory: 'spam' })}
              >
                Tandai Spam
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={bulkFlagMutation.isPending}
                onClick={() => bulkFlagMutation.mutate({ ids: selectedIds, flagCategory: 'not-potential' })}
              >
                Tidak Potensial
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={bulkFlagMutation.isPending}
                onClick={() => bulkFlagMutation.mutate({ ids: selectedIds, flagCategory: null })}
              >
                Hapus Tanda
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info('Export CSV belum tersedia')}
          >
            Export CSV
          </Button>
          <Button size="sm" onClick={handleBlast}>
            {blastLabel}
          </Button>
        </div>
      </div>
    </Card>
  )
}
