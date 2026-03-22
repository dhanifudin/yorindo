'use client'

import { use } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { BlockerStrip } from '@/components/hub/BlockerStrip'
import { cn } from '@/lib/utils'
import type { Event } from '@/types/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface HubLayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS = [
  { label: 'Overview',    key: 'overview',       href: '' },
  { label: 'Undangan',    key: 'blast',          href: '/blast',         disabledOnDraft: true },
  { label: 'Registrasi',  key: 'registrations',  href: '/registrations' },
  { label: 'Konfirmasi',  key: 'confirmation',   href: '/confirmation',  disabledOnDraft: true },
  { label: 'Check-in',    key: 'checkin',        href: '/checkin',       disabledOnDraft: true },
  { label: 'Laporan',     key: 'report',         href: '/report' },
] as const

// ─── Status badge colors ──────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  draft:     'bg-muted text-muted-foreground',
  published: 'bg-blue-100 text-blue-700',
  active:    'bg-green-100 text-green-700',
  completed: 'bg-purple-100 text-purple-700',
  cancelled: 'bg-destructive/10 text-destructive',
  archived:  'bg-muted text-muted-foreground',
}

// ─── Quick-action button config ───────────────────────────────────────────────

function getQuickAction(status: Event['status']): { label: string; nextStatus: Event['status'] } | null {
  switch (status) {
    case 'draft':     return { label: 'Publikasikan', nextStatus: 'published' }
    case 'published': return { label: 'Mulai Live',   nextStatus: 'active' }
    case 'active':    return { label: 'Selesaikan',   nextStatus: 'completed' }
    case 'completed': return { label: 'Arsipkan',     nextStatus: 'archived' }
    default:          return null
  }
}

// ─── Tab key detection ────────────────────────────────────────────────────────

function getActiveTab(pathname: string, baseHref: string): string {
  if (pathname.endsWith('/blast')) return 'blast'
  if (pathname.includes('/registrations')) return 'registrations'
  if (pathname.endsWith('/confirmation')) return 'confirmation'
  if (pathname.endsWith('/checkin')) return 'checkin'
  if (pathname.endsWith('/report')) return 'report'
  return 'overview'
}

// ─── Hub Layout ───────────────────────────────────────────────────────────────

export default function EventHubLayout({ children, params }: HubLayoutProps) {
  const { id } = use(params)
  const pathname = usePathname()
  const queryClient = useQueryClient()

  const baseHref = `/app/events/${id}`
  const activeTab = getActiveTab(pathname, baseHref)

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

  const quickAction = event ? getQuickAction(event.status) : null
  const isDraft = event?.status === 'draft'

  const statusMutation = useMutation({
    mutationFn: async (nextStatus: Event['status']) => {
      const res = await fetch(`/api/events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (!res.ok) throw new Error('Gagal mengubah status')
      return res.json()
    },
    onSuccess: (updated: Event) => {
      queryClient.setQueryData(['events', id], updated)
      queryClient.invalidateQueries({ queryKey: ['events'] })
      toast.success(`Status diubah ke "${updated.status}"`)
    },
    onError: () => toast.error('Gagal mengubah status event'),
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
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold truncate">{event.name}</h1>
                  <Badge className={STATUS_BADGE[event.status] ?? 'bg-muted text-muted-foreground'}>
                    {event.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {new Date(event.eventDate).toLocaleDateString('id-ID', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                  })}
                  {event.capacity && (
                    <span className="ml-2">
                      · {registrationStats?.pagination.total ?? '—'}/{event.capacity} kapasitas
                    </span>
                  )}
                </p>
              </div>
              {quickAction && (
                <Button
                  size="sm"
                  onClick={() => statusMutation.mutate(quickAction.nextStatus)}
                  disabled={statusMutation.isPending}
                >
                  {statusMutation.isPending ? 'Memproses…' : quickAction.label}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Tab bar */}
        <nav className="flex border-b border-border bg-background px-6 overflow-x-auto">
          {TABS.map((tab) => {
            const isDisabled = isDraft && ('disabledOnDraft' in tab && tab.disabledOnDraft)
            const isActive = activeTab === tab.key
            const href = `${baseHref}${tab.href}`

            if (isDisabled) {
              return (
                <Tooltip key={tab.key}>
                  <TooltipTrigger asChild>
                    <span
                      aria-disabled="true"
                      className="inline-flex items-center px-4 py-3 text-sm font-medium border-b-2 border-transparent opacity-50 cursor-not-allowed text-muted-foreground whitespace-nowrap"
                    >
                      {tab.label}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Tersedia setelah event dipublikasikan</TooltipContent>
                </Tooltip>
              )
            }

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
