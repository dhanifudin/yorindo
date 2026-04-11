'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { EventHealthScoreCard } from './EventHealthScoreCard'
import { EventFunnelStats } from './EventFunnelStats'
import { DemographyQuickStats } from './DemographyQuickStats'
import { SegmentOverlapMap } from './SegmentOverlapMap'
import { SurveyScoreCard } from './SurveyScoreCard'
import { InsightsPanel } from './InsightsPanel'
import type { CompletionStats } from '@/types/api'

interface CompletedEventDashboardProps {
  eventId: string
  overview: {
    blastCount: number
    registrationCount: number
    approvedCount: number
    attendedCount: number
    otsCount: number
    blastRegistered: number
    organicRegistered: number
  }
}

export function CompletedEventDashboard({ eventId, overview }: CompletedEventDashboardProps) {
  const [surveyScore, setSurveyScore] = useState<number | null>(null)

  const { data: stats, isLoading } = useQuery<CompletionStats>({
    queryKey: ['completion-stats', eventId],
    queryFn: () => fetch(`/api/events/${eventId}/completion-stats`).then((r) => r.json()),
    staleTime: 60_000,
  })

  return (
    <div className="mt-8 pt-6 border-t space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">Analitik Event</h2>
        <p className="text-sm text-muted-foreground">Ringkasan performa event setelah selesai</p>
      </div>

      <EventHealthScoreCard
        attended={overview.attendedCount}
        approved={overview.approvedCount}
        registered={overview.registrationCount}
        blastCount={overview.blastCount}
        otsCount={overview.otsCount}
        surveyScore={surveyScore}
      />

      <EventFunnelStats
        blastCount={overview.blastCount}
        registered={overview.registrationCount}
        approved={overview.approvedCount}
        attended={overview.attendedCount}
        otsCount={overview.otsCount}
        blastRegistered={overview.blastRegistered}
        organicRegistered={overview.organicRegistered}
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : stats ? (
        <DemographyQuickStats
          cities={stats.demography.cities}
          industries={stats.demography.industries}
          jobTitles={stats.demography.jobTitles}
        />
      ) : null}

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : stats ? (
        <SegmentOverlapMap rows={stats.segmentOverlap} />
      ) : null}

      <SurveyScoreCard eventId={eventId} onScoreComputed={setSurveyScore} />

      <InsightsPanel eventId={eventId} />
    </div>
  )
}
