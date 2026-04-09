'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { BlockerStrip } from '@/components/hub/BlockerStrip'
import { EventHubLayout, LifecycleAction } from '@/components/hub/EventHubLayout'
import { EventCreateForm } from '@/components/features/events/EventCreateForm'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { Event, ApiError } from '@/types/api'

interface EventOverviewResponse {
  pendingApprovals?: number
  daysUntilEvent?: number
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface HubLayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

type TabConfig = {
  label: string
  key: string
  href: string
  disabledOnDraft?: boolean
}

const TABS: EventTab[] = [
  { label: 'Overview',   key: 'overview',       href: '' },
  { label: 'Undangan',   key: 'blast',          href: '/blast',          disabledOnDraft: true },
  { label: 'Registrasi', key: 'registrations',  href: '/registrations' },
  { label: 'Tiket', key: 'confirmation',   href: '/confirmation',   disabledOnDraft: true },
  { label: 'Check-in',   key: 'checkin',        href: '/checkin',        disabledOnDraft: true },
  { label: 'Laporan',    key: 'report',         href: '/report' },
]

// ─── Tab key detection ────────────────────────────────────────────────────────

function getActiveTab(pathname: string): string {
  if (pathname.endsWith('/blast')) return 'blast'
  if (pathname.includes('/registrations')) return 'registrations'
  if (pathname.endsWith('/confirmation')) return 'confirmation'
  if (pathname.endsWith('/checkin')) return 'checkin'
  if (pathname.endsWith('/report')) return 'report'
  return 'overview'
}

// ─── Hub Layout ───────────────────────────────────────────────────────────────

export default function EventHubShellLayout({ children, params }: HubLayoutProps) {
  const { id } = use(params)
  const pathname = usePathname()
  const queryClient = useQueryClient()

  const baseHref = `/app/events/${id}`
  const activeTab = getActiveTab(pathname)
  const isCheckinTab = activeTab === 'checkin'

  const { data: event, isLoading } = useQuery<Event>({
    queryKey: ['events', id],
    queryFn: () => fetch(`/api/events/${id}`).then(r => r.json()),
    staleTime: 60_000,
  })

  // Shared blockerState query
  const { data: blockerState } = useQuery<EventOverviewResponse>({
    queryKey: ['event', id, 'blockerState'],
    queryFn: () => fetch(`/api/events/${id}/overview`).then(r => r.json()),
    staleTime: 60_000,
    enabled: !!id,
  })

  // FIXED: Gunakan blockerState.pendingApprovals
  const pendingCount = blockerState?.pendingApprovals ?? 0

  const [showEditSheet, setShowEditSheet] = useState(false)
  const [confirmStatus, setConfirmStatus] = useState<Event['status'] | null>(null)

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

  const handleAction = (action: LifecycleAction) => {
    if (action.requireConfirm) {
      setConfirmStatus(action.nextStatus)
    } else {
      statusMutation.mutate(action.nextStatus)
    }
  }

  // Blocker strip items
  const blockerItems: Array<{
    id: string
    label: string
    onClick: () => void
    urgency?: 'default' | 'warning'
  }> = []

  if (pendingCount > 0) {
    blockerItems.push({
      id: 'pending',
      label: `${pendingCount} pendaftar menunggu persetujuan`,
      onClick: () => { window.location.href = `${baseHref}/registrations` },
      urgency: pendingCount > 20 ? 'warning' : 'default',
    })
  }

  const isDraftEvent = event?.status === 'draft'

  return (
    <div className="flex flex-col min-h-screen">
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

      {/* Admin Chrome — hidden on mobile for Check-in tab */}
      <div className={cn(isCheckinTab ? 'hidden lg:block' : 'block')}>
        <EventHubLayout
          event={event}
          isLoading={isLoading}
          onEdit={() => setShowEditSheet(true)}
          onAction={handleAction}
          isActionPending={statusMutation.isPending}
          pendingStatus={statusMutation.variables}
        />

        {/* Tab bar */}
        <TooltipProvider>
          <nav className="flex border-b border-border bg-background px-6 overflow-x-auto">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key
              const isDisabled = isDraftEvent && !!tab.disabledOnDraft
              const href = `${baseHref}${tab.href}`

              const TabLink = (
                <Link
                  key={tab.key}
                  href={isDisabled ? '#' : href}
                  className={cn(
                    'inline-flex items-center px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                    isActive
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                    isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                  aria-disabled={isDisabled}
                  onClick={(e) => isDisabled && e.preventDefault()}
                >
                  {tab.label}
                </Link>
              )

              if (isDisabled) {
                return (
                  <Tooltip key={tab.key}>
                    <TooltipTrigger asChild>
                      <span className="cursor-not-allowed">{TabLink}</span>
                    </TooltipTrigger>
                    <TooltipContent>Tersedia setelah event dipublikasikan</TooltipContent>
                  </Tooltip>
                )
              }

              return TabLink
            })}
          </nav>
        </TooltipProvider>

        <BlockerStrip items={blockerItems} />
      </div>

      {/* Mobile-only full-screen check-in mode placeholder */}
      {isCheckinTab && (
        <div className="block lg:hidden bg-background">
          {/* Mobile check-in content renders via children below, but chrome is hidden */}
        </div>
      )}

      {/* Tab content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}