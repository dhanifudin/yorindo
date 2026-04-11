'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { SurveyAnalyticsTab } from '@/components/features/events/SurveyAnalyticsTab'
import type { Event } from '@/types/api'

interface SurveySchemaResponse {
  id: string
  title: string
  schema: Record<string, unknown>
}

export default function SurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const { data: event } = useQuery<Event>({
    queryKey: ['events', id],
    queryFn: () => fetch(`/api/events/${id}`).then(r => r.json()),
    staleTime: 60_000,
  })

  const { data: surveySchema, isLoading: schemaLoading } = useQuery<SurveySchemaResponse>({
    queryKey: ['survey-schema-post-event', id],
    queryFn: () => fetch(`/api/events/${id}/surveys/post-event`).then(r => r.json()),
    staleTime: 60_000,
  })

  if (schemaLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!surveySchema || !surveySchema.schema?.properties) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Survei post-event belum dikonfigurasi untuk event ini.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Event header */}
      <div>
        <h1 className="text-2xl font-bold">{event?.name}</h1>
        <p className="text-muted-foreground">Analisis respons survei post-event</p>
      </div>

      {/* Survey analytics */}
      <SurveyAnalyticsTab eventId={id} />
    </div>
  )
}
