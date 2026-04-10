'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles } from 'lucide-react'
import type { YoriMindResult } from '@/types/api'

interface YoriMindPanelProps {
  eventId: string
}

const PRIORITY_BADGE: Record<string, string> = {
  high: 'bg-destructive/10 text-destructive',
  medium: 'bg-orange-100 text-orange-700',
  low: 'bg-muted text-muted-foreground',
}

export function YoriMindPanel({ eventId }: YoriMindPanelProps) {
  const queryClient = useQueryClient()
  const [isExpanded, setIsExpanded] = useState(false)

  const { data, isLoading, isFetching } = useQuery<YoriMindResult>({
    queryKey: ['ai-insights', eventId],
    queryFn: () => fetch(`/api/events/${eventId}/yorimind`).then((r) => r.json()),
    enabled: isExpanded,
    staleTime: 24 * 60 * 60 * 1000, // 24h cache
  })

  const handleRefresh = async () => {
    // Invalidate backend Redis cache first
    await fetch(`/api/events/${eventId}/yorimind/cache`, { method: 'DELETE' })
    // Then invalidate React Query cache and refetch
    queryClient.invalidateQueries({ queryKey: ['ai-insights', eventId] })
    queryClient.refetchQueries({ queryKey: ['ai-insights', eventId] })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <span className="text-base font-semibold">AI Insights</span>
          </div>
          <div className="flex gap-2">
            {isExpanded && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isFetching}
              >
                {isFetching ? 'Memuat…' : '↻ Refresh'}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setIsExpanded((v) => !v)}>
              {isExpanded ? 'Tutup' : 'Buka Analisis'}
            </Button>
          </div>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-5">
          {data?.disabled ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Fitur AI Insights tidak aktif pada konfigurasi saat ini
              </p>
            </div>
          ) : isLoading || isFetching ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-4 bg-muted rounded animate-pulse" style={{ width: `${70 + i * 5}%` }} />
              ))}
            </div>
          ) : data ? (
            <>
              {/* Summary */}
              <div className="rounded-lg bg-purple-50/50 p-4">
                <p className="text-sm font-medium text-purple-800 mb-1">Ringkasan</p>
                <p className="text-sm text-purple-700">{data.summary}</p>
              </div>

              {/* Analysis */}
              <div>
                <p className="text-sm font-medium mb-2">Analisis</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{data.analysis}</p>
              </div>

              {/* Root causes */}
              <div>
                <p className="text-sm font-medium mb-2">Penyebab Utama</p>
                <ul className="space-y-1">
                  {data.root_causes?.map((cause, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-destructive">•</span>
                      <span>{cause}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recommendations */}
              <div>
                <p className="text-sm font-medium mb-2">Rekomendasi</p>
                <div className="space-y-2">
                  {data.recommendations?.map((rec, i) => (
                    <div key={i} className="rounded-md border p-3 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium flex-1">{rec.action}</p>
                        <Badge className={`${PRIORITY_BADGE[rec.priority]} text-xs shrink-0`}>
                          {rec.priority === 'high' ? 'Tinggi' : rec.priority === 'medium' ? 'Sedang' : 'Rendah'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{rec.impact}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tracked metrics */}
              <div>
                <p className="text-sm font-medium mb-2">Metrik yang Dipantau</p>
                <div className="flex flex-wrap gap-1">
                  {data.tracked_metrics?.map((m) => (
                    <Badge key={m} className="bg-muted text-muted-foreground text-xs">{m}</Badge>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Gagal memuat analisis AI Insights.</p>
          )}
        </CardContent>
      )}
    </Card>
  )
}
