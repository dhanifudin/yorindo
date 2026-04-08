'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EventCloneDialog } from '@/components/features/events/EventCloneDialog'
import type { Event } from '@/types/api'

interface EventHubLayoutProps {
  event?: Event
  isLoading: boolean
  onEdit: () => void
  onAction: (action: LifecycleAction) => void
  isActionPending: boolean
  pendingStatus?: Event['status'] | null
}

export interface LifecycleAction {
  label: string
  nextStatus: Event['status']
  hint: string
  variant?: 'default' | 'outline' | 'destructive'
  disabled?: boolean
  requireConfirm?: boolean
}

const STATUS_BADGE: Record<string, string> = {
  draft:     'bg-muted text-muted-foreground',
  published: 'bg-blue-100 text-blue-700',
  active:    'bg-green-100 text-green-700',
  completed: 'bg-purple-100 text-purple-700',
  cancelled: 'bg-destructive/10 text-destructive',
  archived:  'bg-muted text-muted-foreground',
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  conference: 'Conference',
  workshop: 'Workshop',
  networking: 'Networking',
  seminar: 'Seminar',
  webinar: 'Webinar',
}

export function getLifecycleActions(
  status: Event['status'],
  eventDate: string
): LifecycleAction[] {
  const actions: LifecycleAction[] = []

  switch (status) {
    case 'draft':
      actions.push({ label: 'Publikasikan', nextStatus: 'published', hint: 'Buka pendaftaran untuk peserta' })
      actions.push({ label: 'Batalkan', nextStatus: 'cancelled', hint: 'Batalkan rencana event ini', variant: 'outline', requireConfirm: true })
      break
    case 'published':
      actions.push({ label: 'Mulai Live', nextStatus: 'active', hint: 'Aktifkan event dan buka fitur check-in' })
      actions.push({ label: 'Batalkan', nextStatus: 'cancelled', hint: 'Batalkan event yang sudah dipublikasi', variant: 'outline', requireConfirm: true })
      break
    case 'active': {
      const eventPassed = new Date(eventDate) <= new Date()
      actions.push({
        label: 'Selesaikan',
        nextStatus: 'completed',
        hint: eventPassed ? 'Tandai event sebagai selesai' : 'Hanya tersedia setelah tanggal event berlalu',
        disabled: !eventPassed,
      })
      actions.push({ label: 'Batalkan', nextStatus: 'cancelled', hint: 'Batalkan event yang sedang berjalan', variant: 'outline', requireConfirm: true })
      break
    }
    case 'completed':
      actions.push({ label: 'Arsipkan', nextStatus: 'archived', hint: 'Pindahkan ke arsip riwayat', variant: 'outline' })
      break
    case 'cancelled':
      actions.push({ label: 'Arsipkan', nextStatus: 'archived', hint: 'Pindahkan ke arsip riwayat', variant: 'outline' })
      break
  }

  return actions
}

export function EventHubLayout({
  event,
  isLoading,
  onEdit,
  onAction,
  isActionPending,
  pendingStatus,
}: EventHubLayoutProps) {
  if (isLoading || !event) {
    return (
      <div className="px-6 py-4 border-b border-border bg-background">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    )
  }

  const lifecycleActions = getLifecycleActions(event.status, event.eventDate)
  const isEditable = ['draft', 'published', 'cancelled'].includes(event.status)

  return (
    <div className="px-6 py-4 border-b border-border bg-background">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-2xl font-bold truncate">{event.name}</h1>
            <Badge className={STATUS_BADGE[event.status] ?? 'bg-muted text-muted-foreground'}>
              {event.status}
            </Badge>
            {event.eventType && (
              <Badge variant="outline" className="text-xs">
                {EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}
              </Badge>
            )}
            {event.industryTags?.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {new Date(event.eventDate).toLocaleDateString('id-ID', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
            {event.venue && <span className="ml-2">· {event.venue}</span>}
            {event.capacity && (
              <span className="ml-2">
                · {event.registeredCount ?? 0}/{event.capacity} kapasitas
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <EventCloneDialog event={event} />
          {isEditable && (
            <Button
              size="sm"
              variant="outline"
              className="border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400"
              onClick={onEdit}
            >
              Edit Event
            </Button>
          )}
          {lifecycleActions.map((action) => (
            <Button
              key={action.nextStatus}
              size="sm"
              variant={action.variant ?? 'default'}
              onClick={() => onAction(action)}
              disabled={isActionPending || action.disabled}
              title={action.hint}
            >
              {isActionPending && pendingStatus === action.nextStatus
                ? 'Memproses…'
                : action.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
