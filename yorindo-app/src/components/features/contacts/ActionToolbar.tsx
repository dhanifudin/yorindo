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
import { Send, X } from 'lucide-react'
import type { FlagCategory } from '@/types/api'

interface Recipient {
  id: string
  name: string
}

interface ActionToolbarProps {
  total: number
  searchParams: URLSearchParams
  isVisible: boolean
  selectedIds: string[]
  selectedNames?: string[]
  onClearSelection: () => void
}

export function ActionToolbar({
  total,
  searchParams,
  isVisible,
  selectedIds,
  selectedNames = [],
  onClearSelection,
}: ActionToolbarProps) {
  const queryClient = useQueryClient()

  const [blastOpen, setBlastOpen] = useState(false)
  const [eventLink, setEventLink] = useState('')
  const [linkError, setLinkError] = useState('')
  const [isBlasting, setIsBlasting] = useState(false)
  const [recipients, setRecipients] = useState<Recipient[]>([])

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

  const isSelectedMode = selectedIds.length > 0

  const blastLabel = isSelectedMode
    ? `Blast ${selectedIds.length} kontak →`
    : `Blast Segmen · ${total} kontak →`

  const handleOpenBlast = () => {
    if (isSelectedMode) {
      const newRecipients = selectedIds.map((id, index) => ({
        id,
        name: selectedNames[index]?.trim() || `Kontak #${index + 1}`,
      }))
      setRecipients(newRecipients)
    } else {
      setRecipients([])
    }
    setEventLink('')
    setLinkError('')
    setBlastOpen(true)
  }

  const handleCloseBlast = () => {
    setBlastOpen(false)
    setEventLink('')
    setLinkError('')
    setRecipients([])
  }

  const removeRecipient = (id: string) => {
    setRecipients(prev => prev.filter(r => r.id !== id))
  }

  const restoreAllRecipients = () => {
    const newRecipients = selectedIds.map((id, index) => ({
      id,
      name: selectedNames[index]?.trim() || `Kontak #${index + 1}`,
    }))
    setRecipients(newRecipients)
  }

  const handleBlast = async () => {
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

    if (isSelectedMode && recipients.length === 0) {
      setLinkError('Minimal 1 penerima diperlukan')
      return
    }

    setIsBlasting(true)
    try {
      const effectiveIds = isSelectedMode ? recipients.map(r => r.id) : null

      const body = isSelectedMode
        ? { contactIds: effectiveIds, eventLink: trimmed }
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

      const count = isSelectedMode ? recipients.length : total
      toast.success(`Blast berhasil dikirim ke ${count} kontak!`, { description: trimmed })

      handleCloseBlast()
      if (isSelectedMode) onClearSelection()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Blast gagal')
    } finally {
      setIsBlasting(false)
    }
  }

  const effectiveCount = isSelectedMode ? recipients.length : total

  return (
    <>
      <Card className="sticky bottom-0 z-10 rounded-none border-t border-x-0 border-b-0 shadow-md">
        <div className="flex items-center justify-between px-4 py-3 gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">
              {isSelectedMode
                ? `${selectedIds.length} kontak terpilih di halaman ini`
                : `${total} kontak di segmen ini`}
            </span>
            {isSelectedMode && (
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
            {isSelectedMode && (
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
            <Button variant="outline" size="sm" onClick={() => toast.info('Export CSV belum tersedia')}>
              Export CSV
            </Button>

            <Button size="sm" onClick={handleOpenBlast} className="gap-2">
              <Send className="w-3.5 h-3.5" />
              {blastLabel}
            </Button>
          </div>
        </div>
      </Card>

      {/* Dialog Blast */}
      <Dialog open={blastOpen} onOpenChange={handleCloseBlast}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Blast Event
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {isSelectedMode && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Daftar Penerima</Label>
                  <span className="text-xs text-muted-foreground">
                    {recipients.length} dari {selectedIds.length} kontak
                  </span>
                </div>

                <div className="border border-input rounded-md bg-muted/30 max-h-[340px] overflow-y-auto p-3">
                  {recipients.length > 0 ? (
                    <div className="space-y-2">
                      {recipients.map((recipient, index) => (
                        <div
                          key={recipient.id}
                          className="group flex items-center justify-between bg-background border border-border rounded-lg px-4 py-3 hover:border-destructive/40"
                        >
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <span className="text-xs text-muted-foreground font-mono w-6 shrink-0">
                              {index + 1}.
                            </span>
                            <span className="text-sm font-medium break-words">
                              {recipient.name}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeRecipient(recipient.id)}
                            className="h-9 w-9 text-muted-foreground hover:text-destructive"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-10 text-center text-muted-foreground">
                      Tidak ada penerima
                    </div>
                  )}
                </div>

                {recipients.length < selectedIds.length && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={restoreAllRecipients}
                    className="w-full"
                  >
                    ↺ Kembalikan semua penerima
                  </Button>
                )}
              </div>
            )}

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
                className={linkError ? 'border-destructive' : ''}
                onKeyDown={(e) => e.key === 'Enter' && handleBlast()}
              />
              {linkError && <p className="text-xs text-destructive">{linkError}</p>}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCloseBlast} disabled={isBlasting}>
              Batal
            </Button>
            <Button
              onClick={handleBlast}
              disabled={isBlasting || (isSelectedMode && recipients.length === 0)}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              {isBlasting ? 'Mengirim…' : `Blast ${effectiveCount} Kontak`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}