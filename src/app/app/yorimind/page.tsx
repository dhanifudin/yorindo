'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useEvents, useAudienceRecommendations } from '@/hooks/useEvents'
import type { Event } from '@/types/api'

function scoreBadgeClass(score: number) {
  if (score >= 70) return 'bg-green-100 text-green-700'
  if (score >= 40) return 'bg-yellow-100 text-yellow-700'
  return 'bg-red-100 text-red-700'
}

function YoriMindDashboardEventCard({ event }: { event: Event }) {
  const { data, isLoading } = useAudienceRecommendations(event.id, true)
  const top5 = data?.recommendations.slice(0, 5) ?? []

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link
              href={`/app/events/${event.id}`}
              className="text-base font-semibold hover:underline"
            >
              {event.name}
            </Link>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(event.eventDate).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
          <Badge className={
            event.status === 'active' ? 'bg-green-100 text-green-700' :
            'bg-blue-100 text-blue-700'
          }>
            {event.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-8 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : top5.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tidak ada rekomendasi.</p>
        ) : (
          <div className="space-y-2">
            {top5.map((rec) => (
              <div key={rec.contactId} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium truncate">{rec.name}</p>
                  <p className="text-xs text-muted-foreground">{rec.industryId} · {rec.city}</p>
                </div>
                <Badge className={`${scoreBadgeClass(rec.score)} text-xs shrink-0`}>
                  {rec.score}%
                </Badge>
              </div>
            ))}
            {(data?.totalMatched ?? 0) > 5 && (
              <Link
                href={`/app/events/${event.id}`}
                className="text-xs text-primary hover:underline block mt-2"
              >
                Lihat Semua Rekomendasi ({data?.totalMatched} kontak)
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function YoriMindPage() {
  const { data: eventsData, isLoading } = useEvents()

  const eligibleEvents = (eventsData?.data ?? [])
    .filter((e) => e.status === 'published' || e.status === 'active')
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">YoriMind — Rekomendasi Audiens</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Top kontak yang disarankan untuk event aktif berdasarkan skor kesesuaian YoriMind AI.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : eligibleEvents.length === 0 ? (
        <p className="text-muted-foreground">Tidak ada event aktif atau dipublikasikan saat ini.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {eligibleEvents.map((event) => (
            <YoriMindDashboardEventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}
