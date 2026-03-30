'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { EmergencyBlastBody, EmergencyBlastResponse } from '@/types/api'

interface EmergencyBlastSheetProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  eventId: string
  approvedCount: number
}

const MAX_MESSAGE_LENGTH = 500

const selectClassName =
  'h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

export function EmergencyBlastSheet({ open, onOpenChange, eventId, approvedCount }: EmergencyBlastSheetProps) {
  const [message, setMessage] = useState('')
  const [channel, setChannel] = useState<'whatsapp' | 'email'>('whatsapp')
  const [confirmed, setConfirmed] = useState(false)
  const [messageError, setMessageError] = useState('')

  const mutation = useMutation({
    mutationFn: async (body: EmergencyBlastBody) => {
      const res = await fetch(`/api/events/${eventId}/blast/emergency`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Gagal mengirim pemberitahuan darurat')
      return res.json() as Promise<EmergencyBlastResponse>
    },
    onSuccess: (data) => {
      toast.success(`Pemberitahuan darurat dikirim ke ${data.recipientCount} peserta`)
      handleClose()
    },
    onError: () => toast.error('Gagal mengirim pemberitahuan darurat'),
  })

  function handleClose() {
    setMessage('')
    setChannel('whatsapp')
    setConfirmed(false)
    setMessageError('')
    onOpenChange(false)
  }

  function handlePreview() {
    if (!message.trim()) {
      setMessageError('Pesan wajib diisi')
      return
    }
    setMessageError('')
    setConfirmed(true)
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <SheetContent side="bottom" className="flex flex-col max-h-[80vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Pemberitahuan Darurat</SheetTitle>
          <SheetDescription>
            Kirim pesan mendesak ke peserta yang telah disetujui
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 space-y-4">
          {!confirmed ? (
            // Step 1: Compose
            <>
              <div className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800">
                ⚠️ Pesan ini akan dikirim ke semua peserta yang disetujui. Pastikan konten sudah benar sebelum mengirim.
              </div>

              <div>
                <Label htmlFor="emergency-message">Pesan</Label>
                <Textarea
                  id="emergency-message"
                  value={message}
                  onChange={(e) => {
                    if (e.target.value.length <= MAX_MESSAGE_LENGTH) {
                      setMessage(e.target.value)
                      if (messageError) setMessageError('')
                    }
                  }}
                  rows={4}
                  placeholder="Contoh: Lokasi acara berubah ke Ballroom Lt. 3. Mohon hadir 15 menit lebih awal."
                  aria-invalid={!!messageError}
                />
                <div className="flex justify-between mt-1">
                  {messageError ? (
                    <p className="text-xs text-destructive">{messageError}</p>
                  ) : (
                    <span />
                  )}
                  <p className="text-xs text-muted-foreground">{message.length} / {MAX_MESSAGE_LENGTH}</p>
                </div>
              </div>

              <div>
                <Label htmlFor="emergency-channel">Kanal</Label>
                <select
                  id="emergency-channel"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as 'whatsapp' | 'email')}
                  className={selectClassName}
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={handleClose}>Batal</Button>
                <Button onClick={handlePreview}>Preview &amp; Kirim</Button>
              </div>
            </>
          ) : (
            // Step 2: Confirm with message preview
            <>
              <div>
                <p className="text-sm font-medium mb-1.5">Pratinjau pesan:</p>
                <div className="rounded-md border border-border bg-muted/50 p-3 text-sm whitespace-pre-wrap">
                  {message}
                </div>
              </div>

              <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                <p className="font-medium">Kirim ke <span className="text-primary">{approvedCount} peserta</span> yang disetujui via {channel === 'whatsapp' ? 'WhatsApp' : 'Email'}?</p>
                <p className="text-xs text-muted-foreground mt-0.5">Tindakan ini tidak dapat dibatalkan setelah dikirim.</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setConfirmed(false)}>Kembali</Button>
                <Button
                  variant="destructive"
                  onClick={() => mutation.mutate({ message, channel })}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? 'Mengirim…' : 'Ya, Kirim Sekarang'}
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
