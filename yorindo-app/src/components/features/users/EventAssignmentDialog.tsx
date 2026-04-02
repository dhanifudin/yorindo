'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import type { User, Event } from '@/types/api'
import { fetchUserAssignedEvents } from '@/hooks/useUsers'

interface EventAssignmentDialogProps {
  user: User
  open: boolean
  onClose: () => void
}

export function EventAssignmentDialog({ user, open, onClose }: EventAssignmentDialogProps) {
  const queryClient = useQueryClient()
  const [pending, setPending] = useState<Set<string>>(new Set())
  const [syncedAssignment, setSyncedAssignment] = useState<typeof assignmentData>(undefined)
  const [search, setSearch] = useState('')

  const { data: eventsData } = useQuery<{ data: Event[] }>({
    queryKey: ['events'],
    queryFn: () => fetch('/api/events?pageSize=200').then((r) => r.json()),
    enabled: open,
  })

  const { data: assignmentData } = useQuery<{ data: Event[] }>({
    queryKey: ['user-events', user.id],
    queryFn: () => fetchUserAssignedEvents(user.id),
    enabled: open,
  })

  // Sync pending from server data when assignmentData arrives or changes
  // (React-approved pattern: setState during render triggers an immediate re-render with new state)
  if (assignmentData !== syncedAssignment) {
    setSyncedAssignment(assignmentData)
    setPending(new Set(assignmentData?.data?.map((event) => event.id) ?? []))
  }

  const assignMutation = useMutation({
    mutationFn: (eventId: string) =>
      fetch(`/api/users/${user.id}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-events', user.id] }),
  })

  const removeMutation = useMutation({
    mutationFn: (eventId: string) =>
      fetch(`/api/users/${user.id}/events/${eventId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-events', user.id] }),
  })

  const toggleEvent = (eventId: string) => {
    const next = new Set(pending)
    if (next.has(eventId)) {
      next.delete(eventId)
    } else {
      next.add(eventId)
    }
    setPending(next)
  }

  const handleSave = async () => {
    const current = new Set((assignmentData?.data ?? []).map((event) => event.id))
    const toAdd = [...pending].filter((id) => !current.has(id))
    const toRemove = [...current].filter((id) => !pending.has(id))

    try {
      await Promise.all([
        ...toAdd.map((id) => assignMutation.mutateAsync(id)),
        ...toRemove.map((id) => removeMutation.mutateAsync(id)),
      ])
      toast.success(`Assignment untuk ${user.name} disimpan`)
      onClose()
    } catch {
      toast.error('Gagal menyimpan assignment. Beberapa perubahan mungkin tidak tersimpan.')
    }
  }

  const events = useMemo(() => {
    const allEvents = eventsData?.data ?? []
    const q = search.trim().toLowerCase()
    return q ? allEvents.filter((e) => e.name.toLowerCase().includes(q)) : allEvents
  }, [eventsData?.data, search])

  const STATUS_LABEL: Record<string, string> = {
    draft: 'Draft',
    published: 'Dipublikasi',
    active: 'Berlangsung',
    completed: 'Selesai',
    cancelled: 'Dibatalkan',
    archived: 'Diarsipkan',
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setPending(new Set()); setSyncedAssignment(undefined); setSearch(''); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Event — {user.name}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-3">
          Centang event yang dapat diakses oleh <strong>{user.role}</strong> ini.
        </p>
        <Input
          placeholder="Cari event..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2"
        />
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {events.map((event) => {
            const checked = pending.has(event.id)
            return (
              <label
                key={event.id}
                className="flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleEvent(event.id)}
                  className="accent-primary"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{event.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(event.eventDate).toLocaleDateString('id-ID')}
                  </p>
                </div>
                <Badge className="shrink-0 text-xs">{STATUS_LABEL[event.status] ?? event.status}</Badge>
              </label>
            )
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSave}>Simpan Assignment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
