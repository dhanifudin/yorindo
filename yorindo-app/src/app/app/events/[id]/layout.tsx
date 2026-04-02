'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { BlockerStrip } from '@/components/hub/BlockerStrip'
import { EventCreateForm } from '@/components/features/events/EventCreateForm'
import { EventCloneDialog } from '@/components/features/events/EventCloneDialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import type { Event, ApiError } from '@/types/api'

const EDITABLE_STATUSES: Event['status'][] = ['draft', 'published', 'cancelled']

const EVENT_TYPE_LABELS: Record<string, string> = {
  conference: 'Conference',
  workshop: 'Workshop',
  networking: 'Networking',
  seminar: 'Seminar',
  webinar: 'Webinar',
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface HubLayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS: { label: string; key: string; href: string; visibleOn: Event['status'][] }[] = [
  { label: 'Overview',          key: 'overview',          href: '',                   visibleOn: ['draft', 'published', 'active', 'completed', 'cancelled', 'archived'] },
  { label: 'Undangan',          key: 'blast',             href: '/blast',             visibleOn: ['published', 'active'] },
  { label: 'Registrasi',        key: 'registrations',     href: '/registrations',     visibleOn: ['draft', 'published', 'active', 'completed', 'cancelled', 'archived'] },
  { label: 'Konfirmasi',        key: 'confirmation',      href: '/confirmation',      visibleOn: ['published', 'active'] },
  { label: 'Check-in',          key: 'checkin',           href: '/checkin',           visibleOn: ['active'] },
  { label: 'Survey Builder',    key: 'builder',           href: '/builder',           visibleOn: ['draft', 'published', 'active', 'completed', 'cancelled', 'archived'] },
  { label: 'Respons Survei',    key: 'survey-responses',  href: '/survey-responses',  visibleOn: ['published', 'active', 'completed', 'archived'] },
  { label: 'Laporan',           key: 'report',            href: '/report',            visibleOn: ['completed', 'archived'] },
]

// ─── Status badge colors ──────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  draft:     'bg-muted text-muted-foreground',
  published: 'bg-blue-100 text-blue-700',
  active:    'bg-green-100 text-green-700',
  completed: 'bg-purple-100 text-purple-700',
  cancelled: 'bg-destructive/10 text-destructive',
  archived:  'bg-muted text-muted-foreground',
}

// ─── Lifecycle action config ──────────────────────────────────────────────────

interface LifecycleAction {
  label: string
  nextStatus: Event['status']
  hint: string
  variant?: 'default' | 'outline' | 'destructive'
  disabled?: boolean
  requireConfirm?: boolean
}

function getLifecycleActions(
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

// ─── Tab key detection ────────────────────────────────────────────────────────

function getActiveTab(pathname: string): string {
  if (pathname.endsWith('/blast')) return 'blast'
  if (pathname.includes('/registrations')) return 'registrations'
  if (pathname.endsWith('/confirmation')) return 'confirmation'
  if (pathname.endsWith('/checkin')) return 'checkin'
  if (pathname.endsWith('/builder')) return 'builder'
  if (pathname.endsWith('/survey-responses')) return 'survey-responses'
  if (pathname.endsWith('/report')) return 'report'
  return 'overview'
}

// ─── Hub Layout ───────────────────────────────────────────────────────────────

export default function EventHubLayout({ children, params }: HubLayoutProps) {
  const { id } = use(params)
  const pathname = usePathname()
  const queryClient = useQueryClient()

  const baseHref = `/app/events/${id}`
  const activeTab = getActiveTab(pathname)

  const { data: event, isLoading } = useQuery<Event>({
    queryKey: ['events', id],
    queryFn: () => fetch(`/api/events/${id}`).then(r => r.json()),
    staleTime: 60_000,
  })

  const { data: registrationStats } = useQuery<{ pagination: { total: number } }>({
    queryKey: ['event-registrations', id, 'pending'],
    queryFn: () => fetch(`/api/events/${id}/registrations?status=pending&pageSize=1`).then(r => r.json()),
    enabled: !!id,
  })
  const pendingCount = registrationStats?.pagination.total ?? 0

  const [showEditSheet, setShowEditSheet] = useState(false)
  const [confirmStatus, setConfirmStatus] = useState<Event['status'] | null>(null)
  
  const lifecycleActions = event ? getLifecycleActions(event.status, event.eventDate) : []
  const isEditable = event ? EDITABLE_STATUSES.includes(event.status) : false
  const visibleTabs = event ? TABS.filter((tab) => tab.visibleOn.includes(event.status)) : TABS

  const statusMutation = useMutation({
    mutationFn: async (nextStatus: Event['status']) => {
      const res = await fetch(`/api/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (!res.ok) {
        const errorData = await res.json() as ApiError
        throw new Error(errorData.error.message || 'Gagal mengubah status')
      }
      return res.json()
    },
    onSuccess: (updated: Event) => {
      queryClient.setQueryData(['events', id], updated)
      queryClient.invalidateQueries({ queryKey: ['events'] })
      toast.success(`Status diubah ke "${updated.status}"`)
      setConfirmStatus(null)
    },
    onError: (err: Error) => toast.error(err.message || 'Gagal mengubah status event'),
  })

  // Blocker strip items
  const blockerItems = []
  if (pendingCount > 0) {
    blockerItems.push({
      id: 'pending',
      label: `${pendingCount} pendaftar menunggu persetujuan`,
      onClick: () => { window.location.href = `${baseHref}/registrations` },
      urgency: pendingCount > 20 ? 'warning' : 'default',
    } as const)
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Edit event sheet */}
      <Sheet open={showEditSheet} onOpenChange={setShowEditSheet}>
        <SheetContent side="right" className="flex flex-col w-full sm:max-w-lg overflow-y-auto max-h-screen">
          <SheetHeader>
            <SheetTitle>Edit Event</SheetTitle>
          </SheetHeader>
          <div className="flex-1 px-4 overflow-y-auto">
            {event && showEditSheet && (
              <EventCreateForm
                event={event}
                onSuccess={() => setShowEditSheet(false)}
                onCancel={() => setShowEditSheet(false)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Confirm status change dialog */}
      <AlertDialog open={!!confirmStatus} onOpenChange={(open) => !open && setConfirmStatus(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Perubahan Status</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin mengubah status event ini menjadi <strong>{confirmStatus}</strong>?
              {confirmStatus === 'cancelled' && ' Tindakan ini akan membatalkan seluruh agenda event.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => confirmStatus && statusMutation.mutate(confirmStatus)}
              className={confirmStatus === 'cancelled' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              Lanjutkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div>
        {/* Event header */}
        <div className="px-6 py-4 border-b border-border bg-background">
          {isLoading || !event ? (
            <div className="space-y-2">
              <Skeleton className="h-7 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
          ) : (
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
                      · {registrationStats?.pagination.total ?? '—'}/{event.capacity} kapasitas
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
                    onClick={() => setShowEditSheet(true)}
                  >
                    Edit Event
                  </Button>
                )}
                {lifecycleActions.map((action) => (
                  <div key={action.nextStatus} className="flex flex-col items-end gap-0.5">
                    <Button
                      size="sm"
                      variant={action.variant ?? 'default'}
                      onClick={() => {
                        if (action.requireConfirm) {
                          setConfirmStatus(action.nextStatus)
                        } else {
                          statusMutation.mutate(action.nextStatus)
                        }
                      }}
                      disabled={statusMutation.isPending || action.disabled}
                      title={action.hint}
                    >
                      {statusMutation.isPending && (statusMutation.variables === action.nextStatus) 
                        ? 'Memproses…' 
                        : action.label}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tab bar */}
        <nav className="flex border-b border-border bg-background px-6 overflow-x-auto">
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.key
            const href = `${baseHref}${tab.href}`
            return (
              <Link
                key={tab.key}
                href={href}
                className={cn(
                  'inline-flex items-center px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                  isActive
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>

        {/* Blocker strip */}
        <BlockerStrip items={blockerItems} />
      </div>

      {/* Tab content */}
      <div className="flex-1 p-6">
        {children}
      </div>
    </div>
  )
}
