'use client'

import { useState, useEffect } from 'react'
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
import { Send, X, Calendar, Eye } from 'lucide-react'
import type { FlagCategory } from '@/types/api'

interface Recipient {
  id: string
  name: string
}

interface OngoingEvent {
  id: string
  name: string
  link: string
  date: string
  emailSubject: string
  emailPreview: string
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

  const [ongoingEvents] = useState<OngoingEvent[]>([
    {
      id: '1',
      name: 'Webinar Digital Marketing 2026',
      link: 'https://event.yorindo.com/webinar-dm-2026',
      date: '15 April 2026',
      emailSubject: 'Undangan Webinar: Strategi Digital Marketing Terbaru 2026',
      emailPreview: 'Halo {nama},\n\nKami mengundang Anda untuk bergabung dalam webinar eksklusif kami tentang strategi Digital Marketing yang sedang tren di tahun 2026.\n\nApa yang akan Anda dapatkan:\n• Teknik lead generation terbaru\n• Strategi konten yang konversi tinggi\n• Studi kasus sukses dari brand lokal\n\nJangan lewatkan kesempatan ini!',
    },
    {
      id: '2',
      name: 'Workshop Sales Mastery',
      link: 'https://event.yorindo.com/sales-mastery',
      date: '20 April 2026',
      emailSubject: 'Workshop Sales Mastery - Tingkatkan Closing Rate Tim Anda',
      emailPreview: 'Hai {nama},\n\nApakah tim sales Anda sudah siap menghadapi persaingan tahun ini?\n\nWorkshop Sales Mastery ini akan membekali Anda dengan teknik closing modern, handling objection, dan membangun rapport yang kuat.\n\nTempat terbatas!',
    },
    {
      id: '3',
      name: 'Seminar Properti Investment',
      link: 'https://event.yorindo.com/properti-investment',
      date: '25 April 2026',
      emailSubject: 'Seminar Gratis: Cara Investasi Properti yang Menguntungkan di 2026',
      emailPreview: 'Yth. {nama},\n\nAnda ingin tahu cara berinvestasi properti yang aman dan menguntungkan di tahun 2026?\n\nBergabunglah dengan seminar kami bersama para pakar properti ternama.',
    },
  ])

  const [selectedEvent, setSelectedEvent] = useState<OngoingEvent | null>(null)

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
      if (updated === 0) toast.warning('Tidak ada kontak yang diperbarui')
      else toast.success(`${updated} kontak berhasil ditandai`)
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
      setRecipients(
        selectedIds.map((id, i) => ({
          id,
          name: selectedNames[i]?.trim() || `Kontak #${i + 1}`,
        }))
      )
    } else {
      setRecipients([])
    }
    setEventLink('')
    setLinkError('')
    setSelectedEvent(null)
    setBlastOpen(true)
  }

  const handleCloseBlast = () => {
    setBlastOpen(false)
    setEventLink('')
    setLinkError('')
    setRecipients([])
    setSelectedEvent(null)
  }

  const removeRecipient = (id: string) => {
    setRecipients(prev => prev.filter(r => r.id !== id))
  }

  const restoreAllRecipients = () => {
    setRecipients(
      selectedIds.map((id, i) => ({
        id,
        name: selectedNames[i]?.trim() || `Kontak #${i + 1}`,
      }))
    )
  }

  const handleSelectEvent = (event: OngoingEvent) => {
    setSelectedEvent(event)
    setEventLink(event.link)
    setLinkError('')
    toast.success(`Event "${event.name}" dipilih`, { duration: 2000 })
  }

  const handleBlast = async () => {
    if (!eventLink) {
      setLinkError('Silakan pilih event terlebih dahulu')
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
        ? { contactIds: effectiveIds, eventLink }
        : { segmentParams: Object.fromEntries(searchParams), eventLink, total }

      const res = await fetch('/api/contacts/blast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error('Blast gagal')

      const count = isSelectedMode ? recipients.length : total
      toast.success(`Blast berhasil dikirim ke ${count} kontak!`)

      handleCloseBlast()
      if (isSelectedMode) onClearSelection()
    } catch (err) {
      toast.error('Blast gagal, coba lagi')
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
              {isSelectedMode ? `${selectedIds.length} kontak terpilih di halaman ini` : `${total} kontak di segmen ini`}
            </span>
            {isSelectedMode && (
              <>
                <Badge variant="secondary">{selectedIds.length} terpilih</Badge>
                <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={onClearSelection}>
                  × Batalkan
                </button>
              </>
            )}
          </div>

          <Button size="sm" onClick={handleOpenBlast} className="gap-2">
            <Send className="w-3.5 h-3.5" />
            {blastLabel}
          </Button>
        </div>
      </Card>

      {/* Dialog Blast - Layout Lebih Besar & Nyaman */}
      <Dialog open={blastOpen} onOpenChange={handleCloseBlast}>
        <DialogContent className="sm:max-w-xl max-h-[95vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Send className="w-5 h-5" />
              Blast Event
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* Daftar Penerima */}
            {isSelectedMode && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-base font-medium">Daftar Penerima</Label>
                  <span className="text-sm text-muted-foreground">
                    {recipients.length} dari {selectedIds.length}
                  </span>
                </div>
                <div className="border rounded-xl bg-muted/50 max-h-64 overflow-y-auto p-4 space-y-2 text-sm">
                  {recipients.length > 0 ? (
                    recipients.map((r, i) => (
                      <div key={r.id} className="flex justify-between items-center bg-white border rounded-lg px-4 py-3">
                        <span className="font-medium">{i + 1}. {r.name}</span>
                        <Button variant="ghost" size="sm" onClick={() => removeRecipient(r.id)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-6 text-muted-foreground">Tidak ada penerima</p>
                  )}
                </div>
              </div>
            )}

            {/* Daftar Event */}
            <div className="space-y-3">
              <Label className="text-base font-medium flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Pilih Event yang Sedang Berlangsung
              </Label>

              <div className="space-y-2">
                {ongoingEvents.map((event) => (
                  <Button
                    key={event.id}
                    variant={selectedEvent?.id === event.id ? "default" : "outline"}
                    className="w-full justify-start h-auto py-4 px-5 text-left"
                    onClick={() => handleSelectEvent(event)}
                  >
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-base">{event.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">{event.date}</p>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {/* Link Event (Read Only) */}
            <div className="space-y-2">
              <Label className="text-base font-medium">Link Event</Label>
              <Input
                type="url"
                value={eventLink}
                readOnly
                className="bg-muted/50 cursor-default"
                placeholder="Pilih event di atas untuk mengisi link"
              />
            </div>

            {/* Preview Email */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                <Label className="text-base font-medium">Preview Email yang akan dikirim</Label>
              </div>

              <div className="border rounded-2xl overflow-hidden bg-white shadow-sm">
                <div className="bg-gray-100 px-5 py-4 font-medium text-sm border-b">
                  {selectedEvent ? selectedEvent.emailSubject : 'Subject akan muncul di sini'}
                </div>
                <div className="p-5 whitespace-pre-wrap text-sm leading-relaxed text-gray-700 min-h-[180px]">
                  {selectedEvent ? (
                    selectedEvent.emailPreview.replace(/{nama}/g, 'Budi Santoso')
                  ) : (
                    'Silakan pilih salah satu event di atas untuk melihat preview email yang akan dikirim ke kontak.'
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-5 border-t bg-gray-50">
            <Button variant="outline" onClick={handleCloseBlast} disabled={isBlasting} className="px-8">
              Batal
            </Button>
            <Button
              onClick={handleBlast}
              disabled={isBlasting || !eventLink || (isSelectedMode && recipients.length === 0)}
              className="gap-2 px-8"
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