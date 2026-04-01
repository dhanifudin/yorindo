'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Send } from 'lucide-react'
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
  const queryClient = useQueryClient()

  // ── State blast dialog ────────────────────────────────────────────────────
  const [blastOpen, setBlastOpen] = useState(false)
  const [eventLink, setEventLink] = useState('')
  const [linkError, setLinkError] = useState('')
  const [isBlasting, setIsBlasting] = useState(false)

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

  const blastLabel = selectedIds.length > 0
    ? `Blast ${selectedIds.length} kontak →`
    : `Blast Segmen · ${total} kontak →`

  // ── Validasi & kirim blast ────────────────────────────────────────────────
  const handleOpenBlast = () => {
    setEventLink('')
    setLinkError('')
    setBlastOpen(true)
  }

  const handleCloseBlast = () => {
    setBlastOpen(false)
    setEventLink('')
    setLinkError('')
  }

  const handleBlast = async () => {
    // Validasi link
    const trimmed = eventLink.trim()
    if (!trimmed) {
      setLinkError('Link event wajib diisi')
      return
    }
    try {
      const url = new URL(trimmed)
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error()
    } catch {
      setLinkError('Masukkan link yang valid, contoh: https://event.yorindo.com/xyz')
      return
    }

    setIsBlasting(true)
    try {
      const isSelectedMode = selectedIds.length > 0
      const body = isSelectedMode
        ? { contactIds: selectedIds, eventLink: trimmed }
        : { segmentParams: Object.fromEntries(searchParams), eventLink: trimmed, total }

      const res = await fetch('/api/contacts/blast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error?.message ?? 'Blast gagal')
      }

      const count = isSelectedMode ? selectedIds.length : total
      toast.success(`Blast berhasil dikirim ke ${count} kontak!`, {
        description: trimmed,
      })
      handleCloseBlast()
      if (isSelectedMode) onClearSelection()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Blast gagal, coba lagi')
    } finally {
      setIsBlasting(false)
    }
  }

  return (
    <>
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
                  onClick={() => bulkFlagMutation.mutate({ ids: selectedIds, flagCategory: 'invalid-data' })}
                >
                  Tandai Data Invalid
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={bulkFlagMutation.isPending}
                  onClick={() => bulkFlagMutation.mutate({ ids: selectedIds, flagCategory: 'duplicate' })}
                >
                  Tandai Duplikat
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

            {/* Tombol blast — sekarang buka dialog, bukan langsung navigate */}
            <Button size="sm" onClick={handleOpenBlast} className="gap-2">
              <Send className="w-3.5 h-3.5" />
              {blastLabel}
            </Button>
          </div>
        </div>
      </Card>

      {/* ── Blast Event Dialog ──────────────────────────────────────────────── */}
      <Dialog open={blastOpen} onOpenChange={handleCloseBlast}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              Blast Event
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Info penerima */}
            <div className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              {selectedIds.length > 0 ? (
                <span>
                  Kirim ke{' '}
                  <span className="font-medium text-foreground">{selectedIds.length} kontak</span>
                  {' '}yang dipilih
                </span>
              ) : (
                <span>
                  Kirim ke seluruh segmen —{' '}
                  <span className="font-medium text-foreground">{total} kontak</span>
                </span>
              )}
            </div>

            {/* Input link */}
            <div className="space-y-2">
              <Label htmlFor="event-link">Link Event</Label>
              <Input
                id="event-link"
                type="url"
                placeholder="https://event.yorindo.com/..."
                value={eventLink}
                autoFocus
                onChange={(e) => {
                  setEventLink(e.target.value)
                  if (linkError) setLinkError('')
                }}
                className={linkError ? 'border-destructive focus-visible:ring-destructive' : ''}
                onKeyDown={(e) => e.key === 'Enter' && handleBlast()}
              />
              {linkError && (
                <p className="text-xs text-destructive">{linkError}</p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCloseBlast} disabled={isBlasting}>
              Batal
            </Button>
            <Button onClick={handleBlast} disabled={isBlasting} className="gap-2">
              <Send className="w-3.5 h-3.5" />
              {isBlasting ? 'Mengirim…' : `Blast ${selectedIds.length > 0 ? selectedIds.length : total} Kontak`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}