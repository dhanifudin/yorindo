'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface AnalyticsData {
  funnelData: Array<{ stage: string; count: number }>
  industryBreakdown: Array<{ industry: string; count: number }>
  cityBreakdown: Array<{ city: string; count: number }>
}

interface AnalyticsDashboardProps {
  eventId: string
}

export function AnalyticsDashboard({ eventId }: AnalyticsDashboardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['analytics', eventId],
    queryFn: () => fetch(`/api/events/${eventId}/analytics`).then((r) => r.json()),
    enabled: isExpanded,
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Analitik Event</h2>
          <Button variant="outline" size="sm" onClick={() => setIsExpanded((v) => !v)}>
            {isExpanded ? 'Tutup' : 'Lihat Analitik'}
          </Button>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-8 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : data ? (
            <>
              {/* Funnel */}
              <div>
                <p className="text-sm font-medium mb-3">Funnel Registrasi</p>
                <div className="space-y-2">
                  {data.funnelData.map((item, idx) => {
                    const maxCount = data.funnelData[0]?.count ?? 1
                    const pct = Math.round((item.count / maxCount) * 100)
                    const prevCount = idx > 0 ? data.funnelData[idx - 1].count : item.count
                    const conversion = idx > 0 ? Math.round((item.count / prevCount) * 100) : 100
                    return (
                      <div key={item.stage}>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>{item.stage}</span>
                          <span>{item.count.toLocaleString('id-ID')}{idx > 0 && ` (${conversion}%)`}</span>
                        </div>
                        <div className="h-6 bg-muted rounded overflow-hidden">
                          <div
                            className="h-full bg-primary/80 flex items-center pl-2 text-xs text-primary-foreground font-medium transition-all"
                            style={{ width: `${Math.max(pct, 5)}%` }}
                          >
                            {pct}%
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Industry & City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-2">Industri Peserta</p>
                  <div className="space-y-1">
                    {data.industryBreakdown.map((item) => (
                      <div key={item.industry} className="flex items-center gap-2">
                        <span className="text-xs capitalize w-24 truncate">{item.industry}</span>
                        <div className="flex-1 bg-muted rounded h-1.5 overflow-hidden">
                          <div
                            className="h-full bg-blue-500"
                            style={{ width: `${(item.count / (data.industryBreakdown[0]?.count ?? 1)) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Kota Peserta</p>
                  <div className="space-y-1">
                    {data.cityBreakdown.map((item) => (
                      <div key={item.city} className="flex items-center gap-2">
                        <span className="text-xs w-20 truncate">{item.city}</span>
                        <div className="flex-1 bg-muted rounded h-1.5 overflow-hidden">
                          <div
                            className="h-full bg-green-500"
                            style={{ width: `${(item.count / (data.cityBreakdown[0]?.count ?? 1)) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Download buttons */}
              <div className="flex gap-2 border-t pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const res = await fetch(`/api/events/${eventId}/report/download?format=xlsx`)
                    const blob = await res.blob()
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `report-${eventId}.xlsx`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                >
                  Unduh Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const res = await fetch(`/api/events/${eventId}/report/download?format=pdf`)
                    const blob = await res.blob()
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `report-${eventId}.pdf`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                >
                  Unduh PDF
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Gagal memuat analitik.</p>
          )}
        </CardContent>
      )}
    </Card>
  )
}
