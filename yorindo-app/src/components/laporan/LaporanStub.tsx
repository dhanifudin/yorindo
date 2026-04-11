'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LaporanPlaceholderChart } from './LaporanPlaceholderChart'

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
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4 animate-none" />
            <Skeleton className="h-4 w-1/2 animate-none" />
            <Skeleton className="h-4 w-2/3 animate-none" />
            <Skeleton className="h-4 w-1/3 animate-none" />
            <Skeleton className="h-4 w-1/2 animate-none" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
