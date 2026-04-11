'use client'

import React, { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LaporanPlaceholderChart } from './LaporanPlaceholderChart'

// Graceful lazy import — will fall back silently if Epic 8 not yet implemented
const INSIGHTS_PATH = '/src/components/features/events/InsightsPanel'
const InsightsPanel = React.lazy(() =>
  /* @vite-ignore */
  import(/* @vite-ignore */ INSIGHTS_PATH).catch(() => ({
    default: () => (
      <div className="rounded border p-4 text-sm text-muted-foreground">
        Analisis tersedia setelah event selesai
      </div>
    ),
  })) as Promise<{ default: React.ComponentType }>
)

interface LaporanStubProps {
  eventDate?: string
  isCompleted: boolean
}

export function LaporanStub({ eventDate, isCompleted }: LaporanStubProps) {
  if (!isCompleted) {
    return (
      <div className="py-16 text-center space-y-2">
        <p className="text-lg font-medium text-muted-foreground">
          Laporan tersedia setelah event berlangsung
        </p>
        {eventDate && (
          <p className="text-sm text-muted-foreground">
            Event dijadwalkan:{' '}
            {new Date(eventDate).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Laporan Event</h2>
        <Button disabled variant="outline" size="sm">
          Unduh Laporan PDF
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            Funnel Kehadiran (pra-rilis)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <LaporanPlaceholderChart />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            Analisis AI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Skeleton className="h-48 w-full animate-none" />}>
            <InsightsPanel />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
