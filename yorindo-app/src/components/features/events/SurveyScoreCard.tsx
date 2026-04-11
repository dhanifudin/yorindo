'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface SurveyResponsesData {
  total: number
  aggregates: Array<{
    questionId: string
    fieldType: string
    average?: number
    distribution?: Array<{ label: string; count: number }>
  }>
}

interface SurveyScoreCardProps {
  eventId: string
  onScoreComputed?: (score: number | null) => void
}

function normalizeScore(average: number, distribution: Array<{ label: string; count: number }> | undefined): number {
  const labels = distribution?.map((d) => parseInt(d.label, 10)).filter(Number.isFinite) ?? []
  const min = labels.length > 0 ? Math.min(...labels) : 1
  const max = labels.length > 0 ? Math.max(...labels) : 5
  const range = max - min
  if (range === 0) return average <= max ? 100 : 0
  return Math.round(((average - min) / range) * 100)
}

export function SurveyScoreCard({ eventId, onScoreComputed }: SurveyScoreCardProps) {
  const { data, isLoading } = useQuery<SurveyResponsesData>({
    queryKey: ['survey-responses', eventId],
    queryFn: () => fetch(`/api/events/${eventId}/surveys/responses`).then((r) => r.json()),
    staleTime: 60_000,
  })

  const rangeAggregates = (data?.aggregates ?? []).filter((a) => a.fieldType === 'range' && typeof a.average === 'number')

  const overallScore: number | null = !isLoading && rangeAggregates.length > 0
    ? Math.round(
        rangeAggregates
          .map((a) => normalizeScore(a.average!, a.distribution))
          .reduce((s, v) => s + v, 0) / rangeAggregates.length
      )
    : !isLoading ? null : null

  useEffect(() => {
    if (!isLoading) {
      onScoreComputed?.(overallScore)
    }
  }, [overallScore, isLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Skor Survei</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-16 w-full" /></CardContent>
      </Card>
    )
  }

  if (rangeAggregates.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Skor Survei</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground italic">Survei belum tersedia untuk event ini</p>
        </CardContent>
      </Card>
    )
  }

  const score = overallScore ?? 0
  const responseCount = data?.total ?? 0
  const scoreColor = score >= 75 ? 'text-green-700' : score >= 50 ? 'text-yellow-700' : 'text-destructive'

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Skor Survei</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-6">
        <div className="text-center">
          <p className={`text-3xl font-bold ${scoreColor}`}>{score}</p>
          <p className="text-xs text-muted-foreground">/ 100</p>
        </div>
        <div className="text-sm text-muted-foreground space-y-0.5">
          <p>{responseCount} responden</p>
          <p>{rangeAggregates.length} pertanyaan rating</p>
        </div>
      </CardContent>
    </Card>
  )
}
