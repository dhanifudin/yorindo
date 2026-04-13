'use client'

import { useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Search, Check, UserCheck, Loader2 } from 'lucide-react'

interface Participant {
  id: string
  name: string
  phone: string
  ticketToken: string
  status: string
}

interface ManualCheckinSheetProps {
  open: boolean
  onClose: () => void
  eventId: string
  onCheckinSuccess: (result: { contactName: string; eventName: string }) => void
}

export function ManualCheckinSheet({ open, onClose, eventId, onCheckinSuccess }: ManualCheckinSheetProps) {
  const [query, setQuery] = useState('')
  const [checkinTarget, setCheckinTarget] = useState<Participant | null>(null)
  const [justCheckedIn, setJustCheckedIn] = useState<Set<string>>(new Set())
  const queryClient = useQueryClient()

  // Fetch all approved participants when sheet opens
  const { data, isLoading, refetch } = useQuery<{ data: Participant[] }>({
    queryKey: ['manual-checkin-participants', eventId],
    queryFn: () => fetch(`/api/events/${eventId}/participants`).then((r) => r.json()),
    enabled: open,
    staleTime: 30_000,
  })

  // Filter client-side by search query
  const participants = useMemo(() => {
    const list = data?.data ?? []
    // Remove participants just checked in this session
    const activeList = list.filter((p) => !justCheckedIn.has(p.id))
    if (!query.trim()) return activeList
    const q = query.toLowerCase()
    return activeList.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.phone.includes(q)
    )
  }, [data, query, justCheckedIn])

  const allParticipants = data?.data ?? []
  const checkedInCount = allParticipants.length - participants.length + justCheckedIn.size

  const checkinMutation = useMutation({
    mutationFn: async (registrationId: string) => {
      const res = await fetch('/api/scan/manual-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data?.error?.message ?? 'Manual check-in gagal')
      }
      return res.json()
    },
    onSuccess: (data) => {
      if (checkinTarget) {
        setJustCheckedIn((prev) => new Set(prev).add(checkinTarget.id))
        onCheckinSuccess(data.registration)
        toast.success(`Check-in: ${data.registration.contactName}`)
      }
      setCheckinTarget(null)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Gagal'),
  })

  // Reset state when sheet closes
  const handleClose = () => {
    onClose()
    setQuery('')
    setCheckinTarget(null)
    setJustCheckedIn(new Set())
  }

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
        <SheetContent side="bottom" className="flex flex-col pb-8 max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              <span>Check-in Manual</span>
              {allParticipants.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {participants.length} belum hadir
                  {checkedInCount > 0 && (
                    <span className="text-muted-foreground ml-1">· {checkedInCount} sudah</span>
                  )}
                </Badge>
              )}
            </SheetTitle>
          </SheetHeader>

          {/* Search bar */}
          <div className="px-4 py-3 sticky top-0 bg-background z-10 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama atau telepon..."
                className="h-10 pl-9 text-sm"
                autoFocus
              />
            </div>
          </div>

          {/* Participant list */}
          <div className="px-4 space-y-2 mt-3">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Memuat peserta...</span>
              </div>
            )}

            {!isLoading && participants.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {query.trim()
                  ? 'Tidak ada peserta ditemukan'
                  : 'Semua peserta sudah check-in'}
              </div>
            )}

            {participants.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between px-4 py-3 rounded-lg border bg-card"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.phone || '—'}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <Button
                    size="sm"
                    className="h-8 gap-1 text-xs"
                    onClick={() => setCheckinTarget(p)}
                    disabled={checkinMutation.isPending}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Check-in
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirm manual check-in */}
      {checkinTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
          onClick={() => setCheckinTarget(null)}
        >
          <div
            className="bg-background rounded-xl p-6 mx-4 max-w-sm w-full space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <UserCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Check-in Peserta</h3>
                <p className="text-sm text-muted-foreground">
                  Check-in manual untuk <strong>{checkinTarget.name}</strong>?
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setCheckinTarget(null)}>Batal</Button>
              <Button onClick={() => checkinMutation.mutate(checkinTarget.id)}>Konfirmasi</Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
