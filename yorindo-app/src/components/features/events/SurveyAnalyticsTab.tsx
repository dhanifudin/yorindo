'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from 'recharts'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface SurveyAggregate {
  questionId: string
  questionLabel: string
  fieldType: string
  average?: number
  distribution?: Array<{ label: string; count: number }>
  optionCounts?: Array<{ label: string; count: number; percentage: number }>
  totalCount?: number
  samples?: string[]
}

interface SurveyResponseRecord {
  id: string
  registrationId: string
  contactName: string
  contactPhone: string
  submittedAt: string
  answers: Record<string, unknown>
}

interface SurveyResponsesData {
  total: number
  aggregates: SurveyAggregate[]
  responses: SurveyResponseRecord[]
  pagination: { page: number; pageSize: number; totalPages: number }
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#a4de6c', '#d0ed57', '#83a6ed']

function RangeChart({ aggregate }: { aggregate: SurveyAggregate }) {
  const data = (aggregate.distribution ?? []).map(d => ({
    label: `Skor ${d.label}`,
    count: d.count,
  }))

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{aggregate.questionLabel}</p>
        {typeof aggregate.average === 'number' && (
          <Badge variant="secondary">Rata-rata: {aggregate.average.toFixed(2)}</Badge>
        )}
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#8884d8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function SingleChoiceChart({ aggregate }: { aggregate: SurveyAggregate }) {
  const data = [...(aggregate.optionCounts ?? [])].sort((a, b) => b.count - a.count)

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{aggregate.questionLabel}</p>
      <div className="space-y-2">
        {data.map((opt, i) => (
          <div key={opt.label} className="flex items-center gap-3">
            <div className="w-32 text-xs text-muted-foreground truncate">{opt.label}</div>
            <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${opt.percentage}%`, backgroundColor: COLORS[i % COLORS.length] }}
              />
            </div>
            <div className="w-16 text-xs text-right">{opt.percentage}%</div>
            <div className="w-10 text-xs text-muted-foreground text-right">{opt.count}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TextResponses({ aggregate }: { aggregate: SurveyAggregate }) {
  const samples = aggregate.samples ?? []

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{aggregate.questionLabel}</p>
        <Badge variant="secondary">{aggregate.totalCount} jawaban</Badge>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {samples.length > 0 ? samples.map((text, i) => (
          <div key={i} className="p-3 bg-muted rounded-lg text-sm">
            {text}
          </div>
        )) : (
          <p className="text-sm text-muted-foreground italic">Belum ada jawaban</p>
        )}
      </div>
    </div>
  )
}

export function SurveyAnalyticsTab({ eventId }: { eventId: string }) {
  const [showResponses, setShowResponses] = useState(false)

  const { data, isLoading } = useQuery<SurveyResponsesData>({
    queryKey: ['survey-analytics-post-event', eventId],
    queryFn: () => fetch(`/api/events/${eventId}/surveys/responses?type=post-event&pageSize=100`).then(r => r.json()),
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    )
  }

  if (!data || data.total === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">Belum ada respons survei post-event untuk event ini.</p>
        </CardContent>
      </Card>
    )
  }

  const aggregates = data.aggregates ?? []
  const responses = data.responses ?? []

  // Get question labels from aggregates for the responses table
  const questionLabels = aggregates.reduce<Record<string, string>>((acc, agg) => {
    acc[agg.questionId] = agg.questionLabel
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Summary card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ringkasan Respons</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{data.total}</div>
          <p className="text-sm text-muted-foreground">total responden</p>
        </CardContent>
      </Card>

      {/* Question breakdowns */}
      {aggregates.map((agg) => (
        <Card key={agg.questionId}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{agg.questionLabel}</CardTitle>
            <CardDescription>
              {agg.fieldType === 'range' && 'Pertanyaan Rating'}
              {(agg.fieldType === 'radio' || agg.fieldType === 'select') && 'Pilihan Tunggal'}
              {agg.fieldType === 'text' && 'Jawaban Teks'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {agg.fieldType === 'range' && <RangeChart aggregate={agg} />}
            {(agg.fieldType === 'radio' || agg.fieldType === 'select') && <SingleChoiceChart aggregate={agg} />}
            {agg.fieldType === 'text' && <TextResponses aggregate={agg} />}
          </CardContent>
        </Card>
      ))}

      {/* Individual responses table — hidden by default */}
      {responses.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <button
              type="button"
              onClick={() => setShowResponses(!showResponses)}
              className="flex items-center justify-between w-full"
            >
              <div className="text-left">
                <CardTitle className="text-base">Daftar Respons Individu</CardTitle>
                <CardDescription>Klik untuk {showResponses ? 'sembunyikan' : 'tampilkan'} detail jawaban</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{responses.length} responden</Badge>
                <svg
                  className={`w-5 h-5 transition-transform ${showResponses ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
          </CardHeader>
          {showResponses && (
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Responden</TableHead>
                      {aggregates.map(agg => (
                        <TableHead key={agg.questionId} className="min-w-[120px]">
                          {agg.questionLabel}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {responses.map(resp => (
                      <TableRow key={resp.id}>
                        <TableCell>
                          <div className="text-sm font-medium">{resp.contactName}</div>
                          <div className="text-xs text-muted-foreground">{resp.contactPhone}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(resp.submittedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                          </div>
                        </TableCell>
                        {aggregates.map(agg => {
                          const answer = resp.answers[agg.questionId]
                          let displayValue: string

                          if (answer === null || answer === undefined) {
                            displayValue = '—'
                          } else if (typeof answer === 'object') {
                            displayValue = JSON.stringify(answer)
                          } else {
                            displayValue = String(answer)
                          }

                          return (
                            <TableCell key={agg.questionId}>
                              <span className="text-sm">{displayValue}</span>
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}
