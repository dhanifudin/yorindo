'use client'

import { use, useCallback } from 'react'
import { toast } from 'sonner'
import { useEvent } from '@/hooks/useEvents'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Copy, ExternalLink } from 'lucide-react'
import { EventLifecycleControls } from '@/components/features/events/EventLifecycleControls'
import { EventCloneDialog } from '@/components/features/events/EventCloneDialog'
import { SurveyBuilder } from '@/components/features/events/SurveyBuilder'
import { AttendanceMonitor } from '@/components/features/events/AttendanceMonitor'
import { YoriMindPanel } from '@/components/features/events/YoriMindPanel'
import { AnalyticsDashboard } from '@/components/features/events/AnalyticsDashboard'

interface EventDetailPageProps {
  params: Promise<{ id: string }>
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  published: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-purple-100 text-purple-700',
  cancelled: 'bg-destructive/10 text-destructive',
  archived: 'bg-muted text-muted-foreground',
}

export default function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = use(params)
  const { data: event, isLoading, isError } = useEvent(id)

  const copyRegistrationLink = useCallback((slug: string) => {
    const url = `${window.location.origin}/register/${slug}`
    navigator.clipboard.writeText(url).then(() => toast.success('Link disalin!'))
  }, [])

  if (isLoading) {
    return (
      <div>
        <div className="h-8 w-64 bg-muted rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-6 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !event) {
    return <p className="text-destructive">Event tidak ditemukan.</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">{event.name}</h1>
          <p className="text-muted-foreground">{event.description}</p>
        </div>
        <EventCloneDialog event={event} />
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-8 mb-6">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Tanggal</p>
              <p className="text-sm mt-1">
                {new Date(event.eventDate).toLocaleDateString('id-ID', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: event.timezone,
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Status</p>
              <div className="mt-1">
                <Badge className={STATUS_BADGE[event.status] ?? 'bg-muted text-muted-foreground'}>
                  {event.status}
                </Badge>
              </div>
            </div>
            {event.capacity && (
              <div>
                <p className="text-xs text-muted-foreground uppercase font-medium">Kapasitas</p>
                <p className="text-sm mt-1">{event.capacity}</p>
              </div>
            )}
          </div>
          {event.slug && (
            <div className="mb-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground uppercase font-medium mb-2">Link Pendaftaran Publik</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-md truncate text-foreground">
                  {typeof window !== 'undefined' ? `${window.location.origin}/register/${event.slug}` : `/register/${event.slug}`}
                </code>
                <Button variant="outline" size="sm" onClick={() => copyRegistrationLink(event.slug!)}>
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  Salin
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={`/register/${event.slug}`} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    Buka
                  </a>
                </Button>
              </div>
            </div>
          )}
          <EventLifecycleControls event={event} />
        </CardContent>
      </Card>

      {/* Live attendance monitor (only for active events) */}
      {event.status === 'active' && <AttendanceMonitor eventId={event.id} status={event.status} />}

      {/* Survey builder */}
      <SurveyBuilder eventId={event.id} />

      {/* Analytics dashboard */}
      <AnalyticsDashboard eventId={event.id} />

      {/* YoriMind AI panel */}
      <YoriMindPanel eventId={event.id} />
    </div>
  )
}
