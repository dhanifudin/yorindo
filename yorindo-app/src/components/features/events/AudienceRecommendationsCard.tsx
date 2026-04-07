'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAudienceRecommendations } from '@/hooks/useEvents'
import type { BlastPrefilledAudience } from '@/types/api'

interface AudienceRecommendationsCardProps {
  eventId: string
}

function scoreBadgeClass(score: number) {
  if (score >= 70) return 'bg-green-100 text-green-700'
  if (score >= 40) return 'bg-yellow-100 text-yellow-700'
  return 'bg-red-100 text-red-700'
}

export function AudienceRecommendationsCard({ eventId }: AudienceRecommendationsCardProps) {
  const router = useRouter()
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const { data, isLoading, isError } = useAudienceRecommendations(eventId, isExpanded)

  const recommendations = data?.recommendations ?? []
  const totalMatched = data?.totalMatched ?? 0
  const totalExcluded = data?.totalExcluded ?? 0

  function toggleContact(contactId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(contactId)) next.delete(contactId)
      else next.add(contactId)
      return next
    })
  }

  function selectAll() {
    setSelectedIds(new Set(recommendations.map((r) => r.contactId)))
  }

  function deselectAll() {
    setSelectedIds(new Set())
  }

  function handlePreviewAndBlast() {
    const payload: BlastPrefilledAudience = {
      eventId,
      contactIds: Array.from(selectedIds),
      count: selectedIds.size,
    }
    sessionStorage.setItem('blast:prefilledAudience', JSON.stringify(payload))
    router.push('/app/blast')
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold">Rekomendasi Audiens</span>
            <Badge className="bg-blue-100 text-blue-700 text-xs">YoriMind AI</Badge>
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsExpanded((v) => !v)}>
            {isExpanded ? 'Tutup' : 'Lihat Rekomendasi'}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          🤖 <strong>{isExpanded ? totalMatched : '—'} potensi peserta ditemukan</strong>
          {isExpanded && totalExcluded > 0 && ` · ${totalExcluded} dikecualikan (ditandai)`}
        </p>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : isError ? (
            <p className="text-sm text-muted-foreground">Gagal memuat rekomendasi.</p>
          ) : totalMatched === 0 ? (
            <p className="text-sm text-muted-foreground">Tidak ada kontak yang cocok untuk event ini.</p>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  Select All ({recommendations.length})
                </Button>
                {selectedIds.size > 0 && (
                  <Button variant="ghost" size="sm" onClick={deselectAll}>
                    Deselect All
                  </Button>
                )}
                <span className="text-xs text-muted-foreground ml-auto">
                  {selectedIds.size} dipilih
                </span>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {recommendations.map((rec) => (
                  <div
                    key={rec.contactId}
                    className="flex items-start gap-3 rounded-md border p-3"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(rec.contactId)}
                      onChange={() => toggleContact(rec.contactId)}
                      id={`contact-${rec.contactId}`}
                      className="mt-1 h-4 w-4 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <label
                          htmlFor={`contact-${rec.contactId}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {rec.name}
                        </label>
                        <Badge className={`${scoreBadgeClass(rec.score)} text-xs`}>
                          {rec.score}%
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {rec.serviceType} · {rec.city}
                      </p>
                      {rec.factors.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {rec.factors.map((f) => (
                            <span
                              key={f}
                              className="text-xs bg-muted text-muted-foreground rounded px-1.5 py-0.5"
                            >
                              {f}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <Button
                onClick={handlePreviewAndBlast}
                disabled={selectedIds.size === 0}
                className="w-full"
              >
                Preview & Blast ({selectedIds.size} kontak)
              </Button>
            </>
          )}
        </CardContent>
      )}
    </Card>
  )
}
