'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FunnelVisualization } from '@/components/hub/FunnelVisualization'
import { ActionCard } from '@/components/hub/ActionCard'
import { SponsorPanel } from '@/components/features/vendors/SponsorPanel'
import { SurveyBuilder } from '@/components/features/events/SurveyBuilder'
import { getHealth } from '@/lib/benchmarks'
import Link from 'next/link'
import Image from 'next/image'
import type { Event } from '@/types/api'

interface OverviewMetrics {
  blastCount: number
  registrationCount: number
  approvedCount: number
  attendedCount: number
  lastBlastAt: string | null
  pendingApprovals: number
  seatsRemaining: number | null
  daysUntilEvent: number
}

interface EventDetailPageProps {
  params: Promise<{ id: string }>
}

function formatDaysUntil(days: number): { text: string; className: string } {
  if (days < 0) return { text: 'Event telah selesai', className: 'text-muted-foreground' }
  if (days === 0) return { text: 'Hari ini!', className: 'text-red-700 font-semibold' }
  if (days < 1) return { text: `${Math.round(days * 24)} jam lagi`, className: 'text-red-700 font-semibold' }
  if (days < 2) return { text: 'Besok', className: 'text-amber-700 font-semibold' }
  if (days < 7) return { text: `${days} hari lagi`, className: 'text-amber-700' }
  return { text: `${days} hari lagi`, className: 'text-muted-foreground' }
}

export default function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = use(params)
  const baseHref = `/app/events/${id}`

  const { data: event } = useQuery<Event>({
    queryKey: ['events', id],
    queryFn: () => fetch(`/api/events/${id}`).then(r => r.json()),
    staleTime: 60_000,
  })

  const { data: metrics, isLoading } = useQuery<OverviewMetrics>({
    queryKey: ['event', id, 'overview'],
    queryFn: () => fetch(`/api/events/${id}/overview`).then(r => r.json()),
    staleTime: 60_000,
    enabled: !!id,
  })

  if (isLoading || !metrics || !event) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <div className="grid lg:grid-cols-[2fr_1fr] gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    )
  }

  // Compute health for action card
  const blastToReg = metrics.blastCount > 0 ? metrics.registrationCount / metrics.blastCount : null
  const regToApproval = metrics.registrationCount > 0 ? metrics.approvedCount / metrics.registrationCount : null
  const blastHealth = metrics.blastCount === 0 ? 'bad' as const : blastToReg !== null ? getHealth(blastToReg, 'blastToRegistration') : 'pending' as const
  const regHealth = regToApproval !== null ? getHealth(regToApproval, 'registrationToApproval') : 'pending' as const

  const hasActionCard = metrics.blastCount === 0 || blastHealth === 'bad' || regHealth === 'bad'
  const daysUntil = formatDaysUntil(metrics.daysUntilEvent)

  return (
    <div className="space-y-4">
      {/* Banner image — Story 4.7 */}
      <div className="relative aspect-video lg:aspect-[21/9] w-full rounded-xl overflow-hidden border bg-muted">
        {event.bannerUrl ? (
          <Image
            src={event.bannerUrl}
            alt={event.name}
            fill
            unoptimized
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/10 via-muted to-primary/5 flex items-center justify-center">
            <span className="text-muted-foreground/50 font-medium">Brosur Event</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
        <div className="absolute bottom-4 left-6 right-6">
          <h1 className="text-3xl font-bold text-white drop-shadow-md">{event.name}</h1>
          <p className="text-white/80 line-clamp-1">{event.venue ?? 'Venue belum ditentukan'}</p>
        </div>
      </div>

      {/* Main funnel grid */}
      <div className="grid lg:grid-cols-[2fr_1fr] gap-4">
        {/* Left: Funnel visualization */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pipeline Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <FunnelVisualization
              blastCount={metrics.blastCount}
              registrationCount={metrics.registrationCount}
              approvedCount={metrics.approvedCount}
              attendedCount={metrics.attendedCount}
              eventStatus={event.status}
              eventId={id}
            />
          </CardContent>
        </Card>

        {/* Right: Stats + Action card */}
        <div className="space-y-3">
          <Card>
            <CardContent className="pt-4 space-y-3">
              {/* Pending approvals */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium">Menunggu Persetujuan</p>
                  <p className="text-2xl font-bold">{metrics.pendingApprovals}</p>
                </div>
                {metrics.pendingApprovals > 0 && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`${baseHref}/registrations`}>Review</Link>
                  </Button>
                )}
              </div>

              <div className="border-t pt-3 space-y-2 text-sm">
                {/* Days until */}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Waktu tersisa</span>
                  <span className={daysUntil.className}>{daysUntil.text}</span>
                </div>

                {/* Seats remaining */}
                {metrics.seatsRemaining !== null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kursi tersedia</span>
                    <span className="font-medium">{metrics.seatsRemaining}</span>
                  </div>
                )}

                {/* Last blast */}
                {metrics.lastBlastAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Blast terakhir</span>
                    <span className="text-xs">
                      {new Date(metrics.lastBlastAt).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* Registration link — only for open events */}
              {(event.status === 'published' || event.status === 'active') && (
                <div className="border-t pt-3">
                  <p className="text-xs text-muted-foreground uppercase font-medium mb-1.5">Link Pendaftaran</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate min-w-0">
                      {typeof window !== 'undefined' ? window.location.origin : ''}/register/{event.slug}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/register/${event.slug}`)
                        toast.success('Link disalin!')
                      }}
                    >
                      Salin
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {hasActionCard && (
            <ActionCard
              baseHref={baseHref}
              blastHealth={blastHealth}
              regHealth={regHealth}
              blastCount={metrics.blastCount}
            />
          )}

          {/* Vendor panel */}
          <Card>
            <CardContent className="pt-4">
              <SponsorPanel eventId={id} />
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Survey builder */}
      <SurveyBuilder eventId={id} />
    </div>
  )
}
