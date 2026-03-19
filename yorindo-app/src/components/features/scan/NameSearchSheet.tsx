'use client'

import { useState, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface Participant {
  id: string
  name: string
  phone: string
  ticketToken: string
  status: string
}

interface NameSearchSheetProps {
  open: boolean
  onClose: () => void
  eventId: string
  onSuccess: (result: { contactName: string; eventName: string }) => void
}

export function NameSearchSheet({ open, onClose, eventId, onSuccess }: NameSearchSheetProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Participant[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [overrideTarget, setOverrideTarget] = useState<Participant | null>(null)
  const [reason, setReason] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleQueryChange = (val: string) => {
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      if (val.length < 2) { setResults([]); return }
      setIsSearching(true)
      try {
        const res = await fetch(`/api/events/${eventId}/participants?name=${encodeURIComponent(val)}`)
        const data = await res.json()
        setResults(data.data ?? [])
      } catch {
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }, 400)
  }

  const overrideMutation = useMutation({
    mutationFn: async ({ registrationId, reason }: { registrationId: string; reason: string }) => {
      const res = await fetch('/api/scan/manual-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId, reason }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data?.error?.message ?? 'Manual check-in gagal')
      }
      return res.json()
    },
    onSuccess: (data) => {
      onSuccess(data.registration)
      toast.success(`Manual check-in: ${data.registration.contactName}`)
      setOverrideTarget(null)
      setReason('')
      onClose()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Gagal'),
  })

  const handleClose = () => {
    onClose()
    setQuery('')
    setResults([])
    setOverrideTarget(null)
    setReason('')
  }

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
        <SheetContent side="bottom" className="pb-8 max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Cari Peserta</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <Input
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Ketik nama peserta..."
              className="h-12 text-base"
              autoFocus
            />
            {isSearching && <p className="text-sm text-muted-foreground">Mencari…</p>}
            {!isSearching && query.length >= 2 && !results.length && (
              <p className="text-sm text-muted-foreground text-center py-4">Peserta tidak ditemukan</p>
            )}
            {results.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between px-4 py-3 rounded-lg border bg-card"
              >
                <div>
                  <p className="font-medium text-sm">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.phone}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-muted text-muted-foreground text-xs">{p.status}</Badge>
                  <Button
                    size="sm"
                    className="h-8"
                    onClick={() => setOverrideTarget(p)}
                  >
                    Check-in
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Override reason dialog */}
      <Dialog open={!!overrideTarget} onOpenChange={(v) => !v && setOverrideTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manual Check-in</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Check-in manual untuk <strong>{overrideTarget?.name}</strong>.
            Masukkan alasan override yang akan dicatat dalam audit trail.
          </p>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Contoh: QR rusak, peserta lupa bawa HP"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideTarget(null)}>Batal</Button>
            <Button
              onClick={() =>
                overrideTarget && overrideMutation.mutate({ registrationId: overrideTarget.id, reason })
              }
              disabled={!reason.trim() || overrideMutation.isPending}
            >
              Konfirmasi Check-in
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
